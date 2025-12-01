"""LangGraph execution agent definition for task execution with tools."""

import logging
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
from app.models.artifact import ArtifactCreate
from app.models.base import ArtifactType
from app.services.artifact_service import artifact_service

logger = logging.getLogger(__name__)


class TaskResult(BaseModel):
    """Structured output for task completion."""

    result: str = Field(description="Summary of what was accomplished")
    reflection: str = Field(
        description="Brief reflection on how well the task was completed"
    )


class FinalReflection(BaseModel):
    """Structured output for final reflection after artifact creation."""

    reflection: str = Field(
        description="Brief reflection on task completion and artifact value"
    )


class ArtifactDecision(BaseModel):
    """Structured output for artifact creation decision."""

    should_create: bool = Field(
        description="Whether this task result warrants saving as an artifact"
    )
    name: str | None = Field(
        default=None, description="Descriptive name for the artifact"
    )
    artifact_type: Literal["document", "note", "summary", "plan", "other"] | None = (
        Field(default=None, description="Type of artifact to create")
    )
    content: str | None = Field(
        default=None,
        description="Well-formatted artifact content with headers and structure",
    )


EXECUTION_PROMPT = """You are a task execution agent that completes tasks using available tools.

## Current Task
Title: {task_title}
Description: {task_description}

## Session Context
Session ID: {session_id}
Task ID: {task_id}

## Instructions
1. Analyze what needs to be done based on the task title and description
2. Use the available tools to gather information or perform calculations
3. Work through the task step by step
4. When finished, provide a clear, detailed summary of what you accomplished and found

## Available Tools
- web_search: Search the internet for current information
- calculator: Perform mathematical calculations
- get_current_datetime: Get the current date and time
- format_date: Format dates in different styles
- calculate_date_difference: Calculate time between two dates
- add_time_to_date: Add or subtract time from a date
- get_day_of_week: Get the day of week for any date
- read_artifact: Read content from a previously created artifact
- list_artifacts: List all artifacts in the current session

## CRITICAL - Date and Time Awareness
- You do NOT know the current date or time! Your training data is outdated.
- ALWAYS use get_current_datetime FIRST before any task involving:
  - Weather forecasts or conditions
  - Scheduling or calendars
  - News or current events
  - Any date calculations or comparisons
  - Relative dates like "next week", "tomorrow", "in December"
- When searching for time-sensitive information, INCLUDE THE CORRECT YEAR in your search query
- Example: If user asks about "weather for December 2nd", first get current date, then search "weather [city] December 2 2025" (using the actual current year)

## Guidelines
- Be thorough but efficient
- If you need information, use web_search
- For any calculations, use the calculator tool
- Provide clear, actionable results with all relevant details
- If a task cannot be completed, explain why

Start working on the task now."""


REFLECTION_PROMPT = """Based on the task execution, provide a structured summary.

Task: {task_title}

Review what was accomplished and provide:
1. A clear result summary (what was done/found)
2. A brief reflection on how well the task was completed

Be concise but informative."""


FINAL_REFLECTION_PROMPT = """Based on the completed task execution, provide a final reflection.

Task: {task_title}
Result: {task_result}
Artifact Created: {artifact_info}

Provide a brief reflection on how well the task was completed and the value of any artifacts created.
Be concise - 1-2 sentences maximum."""


ARTIFACT_CREATOR_PROMPT = """You are an artifact creator. Review the task execution and decide if the results should be saved as an artifact for the user.

Task: {task_title}
Result: {task_result}

## When to Create an Artifact (should_create=true)
Create an artifact if the task produced:
- Research findings, comparisons, or analysis
- Drafted content (invitations, emails, messages, posts)
- Plans, agendas, schedules, or itineraries
- Lists of recommendations, options, or ideas
- Summaries of gathered information
- Contact info, pricing, quotes, or booking details
- Checklists or action items
- Any structured information the user would want to reference later

## When NOT to Create an Artifact (should_create=false)
Do NOT create an artifact if:
- The result is just "task completed" or a simple confirmation
- The task failed or couldn't be completed
- There's no substantive content worth saving
- The information is trivial or transient

## If Creating an Artifact
- Give it a clear, descriptive name
- Choose the appropriate type (document, note, summary, plan, other)
- Format the content nicely with markdown headers, lists, and structure
- Include all relevant details from the task result
- Make it useful as a standalone reference document"""


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

    # Create LLM for artifact creation decision
    artifact_llm = ChatOpenAI(
        model="gpt-4o",
        api_key=settings.openai_api_key,
        max_tokens=4096,
        streaming=False,
    ).with_structured_output(ArtifactDecision)

    # Create LLM for final reflection
    final_reflection_llm = ChatOpenAI(
        model="gpt-4o",
        api_key=settings.openai_api_key,
        max_tokens=512,
        streaming=False,
    ).with_structured_output(FinalReflection)

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
                    session_id=state["session_id"],
                    task_id=state["current_task_id"],
                )
                system_msg = SystemMessage(content=prompt)
                messages = [system_msg, *messages]

        # Get response from LLM
        response = llm_with_tools.invoke(messages)

        return {"messages": [response]}

    def reflection_node(state: ExecutionState) -> dict[str, Any]:
        """Generate final reflection including artifact outcome."""
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

        # Get task result and artifact info from state (set by artifact_creator)
        task_result = state.get("task_result", "")
        created_artifact = state.get("created_artifact")

        # Format artifact info
        artifact_info = "No artifact created"
        if created_artifact:
            artifact_info = (
                f"Created: {created_artifact.get('name')} "
                f"({created_artifact.get('type')})"
            )

        # Create final reflection prompt
        prompt = FINAL_REFLECTION_PROMPT.format(
            task_title=task_title,
            task_result=task_result,
            artifact_info=artifact_info,
        )
        reflection_messages = [
            SystemMessage(content=prompt),
            HumanMessage(content="Generate a brief final reflection."),
        ]

        # Get structured output
        result: FinalReflection = final_reflection_llm.invoke(reflection_messages)

        return {
            "final_reflection": result.reflection,
            "is_complete": True,
        }

    def artifact_creator_node(state: ExecutionState) -> dict[str, Any]:
        """Generate task result and decide whether to create an artifact."""
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

        # First, generate task result from conversation (moved from reflect node)
        messages = list(state["messages"])
        result_prompt = REFLECTION_PROMPT.format(task_title=task_title)
        result_messages = [
            SystemMessage(content=result_prompt),
            HumanMessage(
                content=f"Here is the execution history:\n\n{_format_messages(messages)}"
            ),
        ]

        # Get structured task result
        task_result_obj: TaskResult = reflection_llm.invoke(result_messages)
        task_result = task_result_obj.result
        task_reflection = task_result_obj.reflection

        # Skip artifact creation if no meaningful result
        if not task_result or task_result.strip() == "":
            return {
                "task_result": task_result,
                "task_reflection": task_reflection,
                "created_artifact": None,
            }

        # Create prompt for artifact decision
        prompt = ARTIFACT_CREATOR_PROMPT.format(
            task_title=task_title,
            task_result=task_result,
        )

        artifact_messages = [
            SystemMessage(content=prompt),
            HumanMessage(
                content="Based on this task result, should I create an artifact?"
            ),
        ]

        # Get structured decision
        decision: ArtifactDecision = artifact_llm.invoke(artifact_messages)

        # If should create, call artifact service directly
        if decision.should_create and decision.name and decision.content:
            try:
                artifact_data = ArtifactCreate(
                    session_id=UUID(state["session_id"]),
                    task_id=UUID(state["current_task_id"])
                    if state["current_task_id"]
                    else None,
                    name=decision.name,
                    type=ArtifactType(decision.artifact_type or "note"),
                    content=decision.content,
                )
                # Note: This is sync, but we're in a sync node context
                # The artifact will be created and we'll store info for event emission
                import asyncio

                try:
                    loop = asyncio.get_event_loop()
                    if loop.is_running():
                        import concurrent.futures

                        with concurrent.futures.ThreadPoolExecutor() as executor:
                            future = executor.submit(
                                asyncio.run, artifact_service.create(artifact_data)
                            )
                            artifact = future.result()
                    else:
                        artifact = loop.run_until_complete(
                            artifact_service.create(artifact_data)
                        )
                except RuntimeError:
                    artifact = asyncio.run(artifact_service.create(artifact_data))

                return {
                    "task_result": task_result,
                    "task_reflection": task_reflection,
                    "created_artifact": {
                        "id": str(artifact.id),
                        "name": artifact.name,
                        "type": artifact.type.value,
                    },
                }
            except Exception as e:
                # Log the error and continue without artifact
                logger.error(f"Failed to create artifact: {e}", exc_info=True)
                return {
                    "task_result": task_result,
                    "task_reflection": task_reflection,
                    "created_artifact": None,
                }

        return {
            "task_result": task_result,
            "task_reflection": task_reflection,
            "created_artifact": None,
        }

    def should_continue(state: ExecutionState) -> Literal["tools", "artifact_creator"]:
        """Determine if agent should use tools or proceed to artifact creation."""
        messages = state["messages"]
        last_message = messages[-1] if messages else None

        # If the last message has tool calls, execute them
        if isinstance(last_message, AIMessage) and last_message.tool_calls:
            return "tools"

        # Otherwise, agent is done - proceed to artifact creator
        return "artifact_creator"

    # Build the graph
    builder: StateGraph = StateGraph(ExecutionState)

    # Add nodes
    builder.add_node("agent", agent_node)
    builder.add_node("tools", tool_node)
    builder.add_node("reflect", reflection_node)
    builder.add_node("artifact_creator", artifact_creator_node)

    # Set entry point
    builder.set_entry_point("agent")

    # Add conditional edges from agent
    builder.add_conditional_edges(
        "agent",
        should_continue,
        {
            "tools": "tools",
            "artifact_creator": "artifact_creator",
        },
    )

    # Tools always go back to agent
    builder.add_edge("tools", "agent")

    # Artifact creator goes to reflect
    builder.add_edge("artifact_creator", "reflect")

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
        "task_result": None,
        "task_reflection": None,
        "created_artifact": None,
        "final_reflection": None,
        "is_complete": False,
    }

    # Track emitted events to prevent duplicates
    artifact_analysis_started = False
    # Store task result from artifact_creator for emission after reflect completes
    task_result_from_artifact: str = ""

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
                output_str = str(tool_output)

                # Truncate long outputs for the event
                if len(output_str) > 500:
                    output_str = output_str[:500] + "..."
                yield {
                    "type": "tool_result",
                    "taskId": task_id,
                    "tool": tool_name,
                    "output": output_str,
                }

            elif event_type == "on_chain_start" and node_name == "artifact_creator":
                # Artifact creator starting - emit event for UI (only once)
                if not artifact_analysis_started:
                    artifact_analysis_started = True
                    yield {
                        "type": "artifact_analysis_start",
                        "taskId": task_id,
                    }

            elif event_type == "on_chain_end" and node_name == "artifact_creator":
                # Artifact creator complete - emit artifact events only
                output = event.get("data", {}).get("output", {})
                if isinstance(output, dict):
                    # Store task_result for later emission after reflect
                    task_result_from_artifact = output.get("task_result", "")

                    created_artifact = output.get("created_artifact")
                    if created_artifact:
                        yield {
                            "type": "artifact_created",
                            "taskId": task_id,
                            "artifactId": created_artifact.get("id"),
                            "name": created_artifact.get("name"),
                            "artifactType": created_artifact.get("type"),
                        }
                    else:
                        # No artifact created - emit event so UI knows analysis is done
                        yield {
                            "type": "artifact_analysis_complete",
                            "taskId": task_id,
                            "created": False,
                        }

            elif event_type == "on_chain_end" and node_name == "reflect":
                # Reflect complete - emit reflection and task_completed (LAST)
                output = event.get("data", {}).get("output", {})
                if isinstance(output, dict):
                    final_reflection = output.get("final_reflection", "")

                    if final_reflection:
                        yield {
                            "type": "reflection",
                            "taskId": task_id,
                            "text": final_reflection,
                        }

                    # task_completed fires LAST, after reflection
                    if task_result_from_artifact:
                        yield {
                            "type": "task_completed",
                            "taskId": task_id,
                            "status": "done",
                            "result": task_result_from_artifact,
                        }

    except Exception as e:
        yield {
            "type": "error",
            "taskId": task_id,
            "error": str(e),
        }


# Prompt for execution summary generation
EXECUTION_SUMMARY_PROMPT = """You are creating a summary of a completed task execution session.

## Completed Tasks and Results
{task_results}

## Execution Statistics
- Total tasks: {total}
- Completed: {completed}
- Failed: {failed}

Based on the above, create:
1. A brief summary (2-3 sentences) for chat display
2. A detailed summary document with all findings, recommendations, and next steps

The detailed summary should be well-structured with markdown headers and include:
- Overview of what was accomplished
- Key findings from each task
- Recommendations or actionable items
- Any issues or limitations encountered
- Suggested next steps"""


class ExecutionSummary(BaseModel):
    """Structured output for execution summary."""

    brief_summary: str = Field(description="2-3 sentence summary for chat display")
    detailed_summary: str = Field(
        description="Full markdown summary document for artifact"
    )
    artifact_name: str = Field(description="Descriptive name for the summary artifact")


async def create_execution_summary(
    session_id: UUID,
    task_results: list[dict],
    total: int,
    completed: int,
    failed: int,
) -> dict | None:
    """Create a summary of the entire execution.

    Args:
        session_id: The session UUID
        task_results: List of dicts with title and result for each completed task
        total: Total number of tasks
        completed: Number of completed tasks
        failed: Number of failed tasks

    Returns:
        Dict with brief_summary, artifact info, or None if generation fails
    """
    if not task_results:
        return None

    settings = get_settings()

    # Format task results for prompt
    results_text = "\n".join(
        f"### {r.get('title', 'Unknown Task')}\n{r.get('result', 'No result')}\n"
        for r in task_results
    )

    prompt = EXECUTION_SUMMARY_PROMPT.format(
        task_results=results_text,
        total=total,
        completed=completed,
        failed=failed,
    )

    try:
        # Create LLM for structured output
        summary_llm = ChatOpenAI(
            model="gpt-4o",
            api_key=settings.openai_api_key,
            max_tokens=4096,
            streaming=False,
        ).with_structured_output(ExecutionSummary)

        # Generate summary
        result: ExecutionSummary = summary_llm.invoke(
            [
                SystemMessage(content=prompt),
                HumanMessage(content="Generate the execution summary."),
            ]
        )

        # Create artifact
        artifact_data = ArtifactCreate(
            session_id=session_id,
            task_id=None,  # Session-level artifact, not tied to a task
            name=result.artifact_name,
            type=ArtifactType.SUMMARY,
            content=result.detailed_summary,
        )
        artifact = await artifact_service.create(artifact_data)

        return {
            "brief_summary": result.brief_summary,
            "artifact": {
                "id": str(artifact.id),
                "name": artifact.name,
                "type": artifact.type.value,
            },
        }

    except Exception as e:
        # Log the error and return None
        logger.error(f"Failed to create execution summary: {e}", exc_info=True)
        return None
