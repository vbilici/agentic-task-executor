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
    """

    # Conversation messages with LangGraph's message reducer
    messages: Annotated[list[BaseMessage], add_messages]

    # Session context
    session_id: str

    # Generated tasks (list of dicts with title, description)
    tasks: list[dict[str, str | None]]

    # Whether planning is complete
    is_complete: bool


class ExecutionState(TypedDict):
    """State for the execution agent.

    Attributes:
        messages: Conversation messages with LangGraph's message reducer
        session_id: UUID of the current session
        current_task_id: ID of the task currently being executed
        tasks: List of all tasks in the session
        artifacts: Generated artifacts during execution
        data_items: Collected data items during execution
        task_result: Result summary from task execution
        task_reflection: Agent's reflection on task completion
        is_complete: Whether execution is complete
    """

    messages: Annotated[list[BaseMessage], add_messages]
    session_id: str
    current_task_id: str | None
    tasks: list[dict[str, str | None]]
    artifacts: list[dict[str, str | None]]
    data_items: list[dict[str, str | None]]
    task_result: str | None
    task_reflection: str | None
    is_complete: bool
