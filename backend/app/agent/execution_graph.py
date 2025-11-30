"""LangGraph execution agent definition for task execution with tools."""

from collections.abc import AsyncIterator
from typing import Any, Literal
from uuid import UUID

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from langgraph.graph import END, StateGraph
from langgraph.prebuilt import ToolNode
from pydantic import BaseModel, Field

from app.agent.state import ExecutionState
from app.agent.tools import ALL_TOOLS
from app.core.config import get_settings


class TaskResult(BaseModel):
    """Structured output for task completion."""

    result: str = Field(description="Summary of what was accomplished")
    reflection: str = Field(
        description="Brief reflection on how well the task was completed"
    )


EXECUTION_PROMPT = """You are a task execution agent that completes tasks using available tools.

## Current Task
Title: {task_title}
Description: {task_description}

## Instructions
1. Analyze what needs to be done based on the task title and description
2. Use the available tools to gather information or perform calculations
3. Work through the task step by step
4. When finished, provide a clear summary of what you accomplished

## Available Tools
- web_search: Search the internet for current information
- calculator: Perform mathematical calculations
- get_current_datetime: Get the current date and time
- format_date: Format dates in different styles
- calculate_date_difference: Calculate time between two dates
- add_time_to_date: Add or subtract time from a date
- get_day_of_week: Get the day of week for any date

## Guidelines
- Be thorough but efficient
- If you need information, use web_search
- For any calculations, use the calculator tool
- Provide clear, actionable results
- If a task cannot be completed, explain why

Start working on the task now."""


REFLECTION_PROMPT = """Based on the task execution, provide a structured summary.

Task: {task_title}

Review what was accomplished and provide:
1. A clear result summary (what was done/found)
2. A brief reflection on how well the task was completed

Be concise but informative."""


def create_execution_graph() -> StateGraph:
    """Create the execution agent graph with tools for task execution."""
    settings = get_settings()

    # Create the LLM with tools
    llm = ChatOpenAI(
        model="gpt-4o",
        api_key=settings.openai_api_key,
        max_tokens=4096,
        streaming=True,
    )

    # Bind tools to the LLM
    llm_with_tools = llm.bind_tools(ALL_TOOLS)

    # Create LLM for structured output (reflection)
    reflection_llm = ChatOpenAI(
        model="gpt-4o",
        api_key=settings.openai_api_key,
        max_tokens=1024,
        streaming=False,
    ).with_structured_output(TaskResult)

    # Create tool node
    tool_node = ToolNode(ALL_TOOLS)

    def agent_node(state: ExecutionState) -> dict[str, Any]:
        """Main agent node that decides what to do next."""
        messages = list(state["messages"])

        # Check if this is the first message (no AI messages yet)
        has_ai_message = any(isinstance(m, AIMessage) for m in messages)

        if not has_ai_message:
            # Get current task info
            current_task = None
            for task in state["tasks"]:
                if task.get("id") == state["current_task_id"]:
                    current_task = task
                    break

            if current_task:
                # Add system message with task context
                task_title = current_task.get("title", "Unknown task")
                task_description = current_task.get("description", "No description")

                prompt = EXECUTION_PROMPT.format(
                    task_title=task_title,
                    task_description=task_description or "No additional details",
                )
                system_msg = SystemMessage(content=prompt)
                messages = [system_msg, *messages]

        # Get response from LLM
        response = llm_with_tools.invoke(messages)

        return {"messages": [response]}

    def reflection_node(state: ExecutionState) -> dict[str, Any]:
        """Generate structured reflection on task completion."""
        # Get current task info
        current_task = None
        for task in state["tasks"]:
            if task.get("id") == state["current_task_id"]:
                current_task = task
                break

        task_title = (
            current_task.get("title", "Unknown task")
            if current_task
            else "Unknown task"
        )

        # Get the conversation for context
        messages = list(state["messages"])

        # Create reflection prompt
        prompt = REFLECTION_PROMPT.format(task_title=task_title)
        reflection_messages = [
            SystemMessage(content=prompt),
            HumanMessage(
                content=f"Here is the execution history:\n\n{_format_messages(messages)}"
            ),
        ]

        # Get structured output
        result: TaskResult = reflection_llm.invoke(reflection_messages)

        return {
            "task_result": result.result,
            "task_reflection": result.reflection,
            "is_complete": True,
        }

    def should_continue(state: ExecutionState) -> Literal["tools", "reflect"]:
        """Determine if agent should use tools or reflect on completion."""
        messages = state["messages"]
        last_message = messages[-1] if messages else None

        # If the last message has tool calls, execute them
        if isinstance(last_message, AIMessage) and last_message.tool_calls:
            return "tools"

        # Otherwise, agent is done - time to reflect
        return "reflect"

    # Build the graph
    builder: StateGraph = StateGraph(ExecutionState)

    # Add nodes
    builder.add_node("agent", agent_node)
    builder.add_node("tools", tool_node)
    builder.add_node("reflect", reflection_node)

    # Set entry point
    builder.set_entry_point("agent")

    # Add conditional edges from agent
    builder.add_conditional_edges(
        "agent",
        should_continue,
        {
            "tools": "tools",
            "reflect": "reflect",
        },
    )

    # Tools always go back to agent
    builder.add_edge("tools", "agent")

    # Reflect ends the graph
    builder.add_edge("reflect", END)

    return builder


def _format_messages(messages: list[Any]) -> str:
    """Format messages for the reflection prompt."""
    formatted = []
    for msg in messages:
        if isinstance(msg, HumanMessage):
            formatted.append(f"User: {msg.content}")
        elif isinstance(msg, AIMessage):
            if msg.content:
                formatted.append(f"Assistant: {msg.content}")
            if msg.tool_calls:
                for call in msg.tool_calls:
                    formatted.append(f"Tool call: {call['name']}({call['args']})")
        elif hasattr(msg, "content"):
            formatted.append(f"Tool result: {msg.content[:500]}...")
    return "\n".join(formatted[-20:])  # Last 20 messages to avoid token limits


# Lazy initialization for the execution graph builder
_execution_graph_builder: StateGraph | None = None


def get_execution_graph_builder() -> StateGraph:
    """Get or create the execution graph builder (lazy initialization)."""
    global _execution_graph_builder
    if _execution_graph_builder is None:
        _execution_graph_builder = create_execution_graph()
    return _execution_graph_builder


async def execute_single_task(
    graph: Any,
    session_id: UUID,
    task: dict[str, Any],
    config: dict[str, Any],
    previous_results: list[dict[str, Any]] | None = None,
) -> AsyncIterator[dict[str, Any]]:
    """Execute a single task and yield streaming events.

    Args:
        graph: Compiled LangGraph graph
        session_id: The session UUID
        task: The task dict with id, title, description
        config: LangGraph config with thread_id
        previous_results: Results from previously completed tasks for context

    Yields:
        Events dict with type and payload for SSE streaming
    """
    task_id = task.get("id", "")
    task_title = task.get("title", "Unknown task")
    task_description = task.get("description", "")

    # Build context from previous task results
    context_section = ""
    if previous_results:
        context_parts = []
        for prev in previous_results:
            prev_title = prev.get("title", "Unknown")
            prev_result = prev.get("result", "No result")
            context_parts.append(f"- {prev_title}: {prev_result}")
        context_section = f"""
## Previously Completed Tasks (Use this information!)
The following tasks have already been completed. Use their results to inform your work:

{chr(10).join(context_parts)}

"""

    # Create initial message with task and context
    task_prompt = f"""Execute this task: {task_title}
{f"Description: {task_description}" if task_description else ""}
{context_section}
Please complete this task using the available tools and the context from previous tasks if relevant."""

    # Create initial state for this task
    initial_state: ExecutionState = {
        "messages": [HumanMessage(content=task_prompt)],
        "session_id": str(session_id),
        "current_task_id": task_id,
        "tasks": [task],
        "artifacts": [],
        "data_items": [],
        "task_result": None,
        "task_reflection": None,
        "is_complete": False,
    }

    try:
        # Stream events from the graph
        async for event in graph.astream_events(
            initial_state,
            config=config,
            version="v2",
        ):
            event_type = event.get("event")
            node_name = event.get("metadata", {}).get("langgraph_node", "")

            if event_type == "on_chat_model_stream":
                # Stream content from agent node
                if node_name == "agent":
                    chunk = event.get("data", {}).get("chunk")
                    if chunk and hasattr(chunk, "content") and chunk.content:
                        yield {
                            "type": "content",
                            "taskId": task_id,
                            "content": chunk.content,
                        }

            elif event_type == "on_tool_start":
                # Tool is being called
                tool_name = event.get("name", "unknown")
                tool_input = event.get("data", {}).get("input", {})
                yield {
                    "type": "tool_call",
                    "taskId": task_id,
                    "tool": tool_name,
                    "input": tool_input,
                }

            elif event_type == "on_tool_end":
                # Tool finished
                tool_name = event.get("name", "unknown")
                tool_output = event.get("data", {}).get("output", "")
                # Truncate long outputs for the event
                output_str = str(tool_output)
                if len(output_str) > 500:
                    output_str = output_str[:500] + "..."
                yield {
                    "type": "tool_result",
                    "taskId": task_id,
                    "tool": tool_name,
                    "output": output_str,
                }

            elif event_type == "on_chain_end" and node_name == "reflect":
                # Reflection complete - extract result
                output = event.get("data", {}).get("output", {})
                if isinstance(output, dict):
                    result = output.get("task_result", "")
                    reflection = output.get("task_reflection", "")

                    if result:
                        yield {
                            "type": "task_completed",
                            "taskId": task_id,
                            "status": "done",
                            "result": result,
                        }

                    if reflection:
                        yield {
                            "type": "reflection",
                            "taskId": task_id,
                            "text": reflection,
                        }

    except Exception as e:
        yield {
            "type": "error",
            "taskId": task_id,
            "error": str(e),
        }
