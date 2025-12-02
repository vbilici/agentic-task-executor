"""LangGraph agent state definition."""

from typing import Annotated, TypedDict

from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages


class PlanningState(TypedDict):
    """State for the planning agent.

    Attributes:
        messages: Conversation messages with LangGraph's message reducer
        session_id: UUID of the current session
        tasks: Generated tasks (list of dicts with title, description)
        is_complete: Whether planning is complete
        ready_to_create_tasks: Whether extraction decided to create tasks
    """

    # Conversation messages with LangGraph's message reducer
    messages: Annotated[list[BaseMessage], add_messages]

    # Session context
    session_id: str

    # Generated tasks (list of dicts with title, description)
    tasks: list[dict[str, str | None]]

    # Whether planning is complete
    is_complete: bool

    # Whether extraction decided to create tasks (for routing)
    ready_to_create_tasks: bool


class ExecutionState(TypedDict):
    """State for the execution agent.

    Attributes:
        messages: Conversation messages with LangGraph's message reducer
        session_id: UUID of the current session
        current_task_id: ID of the task currently being executed
        tasks: List of all tasks in the session
        artifacts: Generated artifacts during execution
        task_result: Result summary from task execution
        created_artifact: Artifact created by the artifact_creator node
        is_complete: Whether execution is complete
        execution_start_time: Formatted execution start timestamp for date context
    """

    messages: Annotated[list[BaseMessage], add_messages]
    session_id: str
    current_task_id: str | None
    tasks: list[dict[str, str | None]]
    artifacts: list[dict[str, str | None]]
    task_result: str | None
    created_artifact: dict[str, str] | None
    is_complete: bool
    execution_start_time: str | None
