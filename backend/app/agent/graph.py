"""LangGraph planning agent definition."""

from typing import Literal

from langchain_core.messages import SystemMessage
from langchain_openai import ChatOpenAI
from langgraph.graph import END, StateGraph
from pydantic import BaseModel, Field

from app.agent.state import PlanningState
from app.core.config import get_settings


class TaskItem(BaseModel):
    """A single task item."""

    title: str = Field(description="Short, action-oriented task title")
    description: str | None = Field(
        default=None, description="Optional detailed description"
    )


class TaskList(BaseModel):
    """Structured output for task extraction."""

    tasks: list[TaskItem] = Field(default_factory=list)
    ready_to_create_tasks: bool = Field(
        default=False,
        description="True if the user's goal is clear enough to create tasks",
    )


EXECUTION_SUMMARY_PROMPT = """You are summarizing the results of task execution for the user.

Based on the execution results provided, give a brief, friendly summary of what was accomplished.

Guidelines:
- Be conversational and positive
- Highlight key findings or results
- Mention any issues if tasks failed
- Keep it concise (2-4 sentences)
- Don't use bullet points or markdown - just natural conversation
- If there are notable artifacts created, mention them briefly

Remember: The user just watched their tasks execute. Give them a quick, helpful summary."""

CHAT_PROMPT = """You are a helpful planning assistant that helps users break down their goals into actionable tasks.

Your role is to:
1. Understand the user's goal or objective
2. Ask clarifying questions if the goal is too vague
3. Provide helpful responses to guide the conversation

Guidelines:
- If the user's request is unclear, ask ONE clarifying question
- Be conversational and helpful
- Don't output JSON or structured data - just have a natural conversation
- When you understand the goal well enough, summarize what you'll help them plan

IMPORTANT - Date and Time Awareness:
- You do NOT know the current date or time from your training data
- When tasks involve dates, times, schedules, or any time-sensitive information, the execution agent will use date tools to get the current date
- If the user mentions relative dates (e.g., "next week", "in December", "starting tomorrow"), make sure tasks are created that will properly resolve these dates during execution

Remember: You're helping the user plan. Focus on understanding their needs."""

TASK_EXTRACTION_PROMPT = """Based on the conversation, extract actionable tasks for the user's goal.

Rules:
- Create 3-5 concrete, actionable tasks
- Start each task with an action verb (Research, Create, Contact, Write, etc.)
- Keep task titles concise but descriptive (max 100 characters)
- Order tasks logically (dependencies first)
- Include a brief description for complex tasks
- Only set ready_to_create_tasks=true if the goal is clear enough

IMPORTANT - Date and Time Handling:
- For tasks involving dates, times, weather, schedules, or time-sensitive data, ADD A NOTE IN THE TASK DESCRIPTION (do NOT create a separate task)
- Example description note: "(Note: Use get_current_datetime first to determine current date)"
- NEVER create a standalone task like "Use get_current_datetime tool" or "Get current date and time" - this is NOT a valid task
- The execution agent will automatically use date tools when needed
- If user mentions "December 2nd for 1 week", include a description note to calculate dates relative to current date

Bad task examples (DO NOT create these):
- "Use get_current_datetime tool"
- "Get current date and time"
- "Determine today's date"

Good task example:
- Title: "Research weather forecast for Chicago"
- Description: "Find 7-day weather forecast. (Note: Use get_current_datetime first to determine current date)"

If the user's goal is still unclear, set ready_to_create_tasks=false and return an empty task list."""

CHAT_WITH_TASKS_PROMPT = """You are a helpful planning assistant. You have just generated a task list for the user's goal.

## Generated Tasks
{task_summary}

## Your Role
Now respond to the user in a friendly, conversational way that:
1. Briefly acknowledges you've created a plan for them
2. Summarizes the key approach at a high level (don't just repeat the list - the user can see it)
3. Ask 1-3 follow-up questions to refine the plan

## Follow-up Questions (ask 1-3 based on what's missing)
- **For time-sensitive tasks**: ALWAYS ask about specific dates (e.g., "When do you need this completed by?" or "What dates are you planning for?")
- **For tasks with costs**: Ask about budget constraints
- **For tasks with options**: Ask about preferences
- **General refinement**: Ask about priorities, constraints, or additional context

## Example Questions
- "What specific dates are you looking at for this trip?"
- "Do you have a budget range in mind?"
- "Are there any must-haves or deal-breakers I should know about?"
- "What's your deadline for completing this?"
- "Would you prefer more detailed tasks or keep them high-level?"

## Guidelines
- Be conversational, not robotic
- Don't list the tasks again - the user can see them in the panel
- Focus on the overall approach
- Keep your intro concise (1-2 sentences)
- Format your questions as a bulleted list
- Questions should help make the tasks more actionable and specific

## Response Format
[Brief acknowledgment and summary]

[Questions as bullets:]
- Question 1?
- Question 2?
- Question 3? (if needed)

## When to Mention the Execute Button
- Do NOT mention the Execute button when first presenting tasks - you're still gathering info
- AFTER the user answers your follow-up questions, mention: "When you're ready, press the Execute button in the tasks panel to start!"
- Only mention it ONCE - check conversation history, if you've already said it, don't repeat

Remember: The tasks are visible in the sidebar. First ask questions to refine the plan, then once they've answered, let them know they can execute."""


def create_planning_graph() -> StateGraph:
    """Create the planning agent graph.

    New flow: Extract tasks FIRST, then chat with tasks in context.
    - should_extract: Runs task extraction to decide if ready
    - chat_with_tasks: Streams response acknowledging the generated tasks
    - chat_only: Streams normal clarifying response (no tasks)
    """
    settings = get_settings()

    # Chat LLM (streaming enabled for real-time response)
    chat_llm = ChatOpenAI(
        model="gpt-4o",
        api_key=settings.openai_api_key,
        max_tokens=2048,
        streaming=True,
    )

    # Task extraction LLM (structured output, no streaming)
    task_llm = ChatOpenAI(
        model="gpt-4o",
        api_key=settings.openai_api_key,
        max_tokens=2048,
        streaming=False,
    ).with_structured_output(TaskList)

    async def should_extract_node(state: PlanningState) -> dict[str, object]:
        """Evaluate conversation and extract tasks if ready.

        This node runs FIRST to determine if we have enough context.
        """
        messages = list(state["messages"])

        # Check if this is an execution summary request - skip extraction
        last_message = messages[-1] if messages else None
        is_execution_summary = (
            last_message
            and hasattr(last_message, "content")
            and "[EXECUTION COMPLETE]" in str(last_message.content)
        )

        if is_execution_summary:
            return {
                "tasks": [],
                "ready_to_create_tasks": False,
            }

        # Run task extraction
        system_msg = SystemMessage(content=TASK_EXTRACTION_PROMPT)
        messages_with_system = [system_msg, *messages]
        result: TaskList = await task_llm.ainvoke(messages_with_system)

        tasks = []
        if result.ready_to_create_tasks and result.tasks:
            tasks = [
                {"title": t.title, "description": t.description} for t in result.tasks
            ]

        return {
            "tasks": tasks,
            "ready_to_create_tasks": result.ready_to_create_tasks,
        }

    async def chat_with_tasks_node(state: PlanningState) -> dict[str, object]:
        """Generate response that acknowledges the generated tasks."""
        messages = list(state["messages"])
        tasks = state.get("tasks", [])

        # Build task summary for the prompt
        task_lines = []
        for t in tasks:
            line = f"- {t['title']}"
            if t.get("description"):
                line += f": {t['description']}"
            task_lines.append(line)
        task_summary = "\n".join(task_lines)

        prompt = CHAT_WITH_TASKS_PROMPT.format(task_summary=task_summary)
        system_msg = SystemMessage(content=prompt)
        messages_with_system = [system_msg, *messages]

        response = await chat_llm.ainvoke(messages_with_system)
        return {
            "messages": [response],
            "is_complete": True,
        }

    async def chat_only_node(state: PlanningState) -> dict[str, object]:
        """Generate normal conversational response (no tasks)."""
        messages = list(state["messages"])

        # Check for execution summary
        last_message = messages[-1] if messages else None
        is_execution_summary = (
            last_message
            and hasattr(last_message, "content")
            and "[EXECUTION COMPLETE]" in str(last_message.content)
        )

        prompt = EXECUTION_SUMMARY_PROMPT if is_execution_summary else CHAT_PROMPT
        system_msg = SystemMessage(content=prompt)
        messages_with_system = [system_msg, *messages]

        response = await chat_llm.ainvoke(messages_with_system)
        return {
            "messages": [response],
        }

    def route_after_extraction(
        state: PlanningState,
    ) -> Literal["chat_with_tasks", "chat_only"]:
        """Route based on whether tasks were generated."""
        if state.get("ready_to_create_tasks", False) and state.get("tasks"):
            return "chat_with_tasks"
        return "chat_only"

    # Build the graph
    builder: StateGraph = StateGraph(PlanningState)

    # Add nodes
    builder.add_node("should_extract", should_extract_node)
    builder.add_node("chat_with_tasks", chat_with_tasks_node)
    builder.add_node("chat_only", chat_only_node)

    # Entry point: always evaluate extraction first
    builder.set_entry_point("should_extract")

    # Conditional routing after extraction
    builder.add_conditional_edges(
        "should_extract",
        route_after_extraction,
        {
            "chat_with_tasks": "chat_with_tasks",
            "chat_only": "chat_only",
        },
    )

    # Both chat nodes end the graph
    builder.add_edge("chat_with_tasks", END)
    builder.add_edge("chat_only", END)

    return builder


# Lazy initialization for the planning graph builder
_planning_graph_builder: StateGraph | None = None


def get_planning_graph_builder() -> StateGraph:
    """Get or create the planning graph builder (lazy initialization)."""
    global _planning_graph_builder
    if _planning_graph_builder is None:
        _planning_graph_builder = create_planning_graph()
    return _planning_graph_builder
