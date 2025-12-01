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


def create_planning_graph() -> StateGraph:
    """Create the planning agent graph with separate chat and task extraction nodes."""
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

    def chat_node(state: PlanningState) -> dict[str, object]:
        """Generate conversational response (streamed to user)."""
        messages = list(state["messages"])

        # Check if this is an execution summary request
        last_message = messages[-1] if messages else None
        is_execution_summary = (
            last_message
            and hasattr(last_message, "content")
            and "[EXECUTION COMPLETE]" in str(last_message.content)
        )

        # Use appropriate system prompt
        prompt = EXECUTION_SUMMARY_PROMPT if is_execution_summary else CHAT_PROMPT
        system_msg = SystemMessage(content=prompt)
        messages_with_system = [system_msg, *messages]

        # Get response from LLM (will be streamed via astream_events)
        response = chat_llm.invoke(messages_with_system)

        return {
            "messages": [response],
        }

    def task_extraction_node(state: PlanningState) -> dict[str, object]:
        """Extract tasks using structured output (not streamed)."""
        messages = list(state["messages"])

        # Add task extraction prompt
        system_msg = SystemMessage(content=TASK_EXTRACTION_PROMPT)
        messages_with_system = [system_msg, *messages]

        # Get structured output
        result: TaskList = task_llm.invoke(messages_with_system)

        tasks = []
        if result.ready_to_create_tasks and result.tasks:
            tasks = [
                {"title": t.title, "description": t.description} for t in result.tasks
            ]

        return {
            "tasks": tasks,
            "is_complete": bool(tasks),
        }

    def should_extract_tasks(state: PlanningState) -> Literal["extract", "end"]:
        """Determine if we should try to extract tasks."""
        # Always try to extract tasks after chat response
        return "extract"

    # Build the graph
    builder: StateGraph = StateGraph(PlanningState)

    # Add nodes
    builder.add_node("chat", chat_node)
    builder.add_node("extract_tasks", task_extraction_node)

    # Add edges: chat -> extract_tasks -> END
    builder.set_entry_point("chat")
    builder.add_edge("chat", "extract_tasks")
    builder.add_edge("extract_tasks", END)

    return builder


# Lazy initialization for the planning graph builder
_planning_graph_builder: StateGraph | None = None


def get_planning_graph_builder() -> StateGraph:
    """Get or create the planning graph builder (lazy initialization)."""
    global _planning_graph_builder
    if _planning_graph_builder is None:
        _planning_graph_builder = create_planning_graph()
    return _planning_graph_builder
