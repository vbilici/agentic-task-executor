"""Agent service for managing LangGraph agents with persistence."""

from collections.abc import AsyncIterator
from typing import Any
from uuid import UUID

from langchain_core.messages import HumanMessage
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from psycopg.rows import dict_row
from psycopg_pool import AsyncConnectionPool

from app.agent.graph import get_planning_graph_builder
from app.agent.state import PlanningState
from app.core.config import get_settings
from app.models.task import TaskCreate


class AgentService:
    """Service for managing LangGraph agents with PostgreSQL persistence."""

    _pool: AsyncConnectionPool | None = None
    _checkpointer: AsyncPostgresSaver | None = None
    _initialized: bool = False

    async def initialize(self) -> None:
        """Initialize the connection pool and checkpointer."""
        if self._initialized:
            return

        settings = get_settings()

        # Create connection pool with autocommit and dict_row for checkpointer
        # autocommit=True required for CREATE INDEX CONCURRENTLY in setup()
        # row_factory=dict_row required for checkpointer row access
        pool = AsyncConnectionPool(
            conninfo=settings.database_url,
            max_size=20,
            open=False,
            kwargs={"autocommit": True, "row_factory": dict_row},
        )
        await pool.open(wait=True)
        self._pool = pool

        # Create checkpointer
        checkpointer = AsyncPostgresSaver(pool)
        await checkpointer.setup()
        self._checkpointer = checkpointer

        self._initialized = True

    async def close(self) -> None:
        """Close the connection pool."""
        if self._pool:
            await self._pool.close()
            self._pool = None
            self._checkpointer = None
            self._initialized = False

    def _get_thread_id(self, session_id: UUID) -> str:
        """Get the LangGraph thread ID for a session.

        Args:
            session_id: The session UUID

        Returns:
            Thread ID string for LangGraph
        """
        return f"session_{session_id}"

    async def chat(
        self,
        session_id: UUID,
        message: str,
    ) -> AsyncIterator[dict[str, Any]]:
        """Send a message to the planning agent and stream responses.

        Args:
            session_id: The session UUID
            message: The user's message

        Yields:
            Events dict with type and payload:
            - {"type": "content", "content": "..."} - Streamed text
            - {"type": "tasks_updated", "tasks": [...]} - Task list updated
            - {"type": "done"} - Chat complete
            - {"type": "error", "error": "..."} - Error occurred
        """
        if not self._initialized:
            await self.initialize()

        # Compile graph with checkpointer
        graph = get_planning_graph_builder().compile(checkpointer=self._checkpointer)

        config = {
            "configurable": {
                "thread_id": self._get_thread_id(session_id),
            }
        }

        # Create input state
        input_state: PlanningState = {
            "messages": [HumanMessage(content=message)],
            "session_id": str(session_id),
            "tasks": [],
            "is_complete": False,
        }

        try:
            tasks_yielded = False

            # Stream events from the graph
            async for event in graph.astream_events(
                input_state,
                config=config,
                version="v2",
            ):
                event_type = event.get("event")
                # Get the node name from metadata
                node_name = event.get("metadata", {}).get("langgraph_node", "")

                if event_type == "on_chat_model_stream":
                    # Only stream content from the "chat" node (not extract_tasks)
                    if node_name == "chat":
                        chunk = event.get("data", {}).get("chunk")
                        if chunk and hasattr(chunk, "content") and chunk.content:
                            yield {"type": "content", "content": chunk.content}

                elif event_type == "on_chain_end":
                    # Check for tasks from the extract_tasks node
                    if node_name == "extract_tasks":
                        output = event.get("data", {}).get("output", {})
                        if isinstance(output, dict):
                            tasks = output.get("tasks", [])
                            if tasks and not tasks_yielded:
                                yield {"type": "tasks_updated", "tasks": tasks}
                                tasks_yielded = True

            yield {"type": "done"}

        except Exception as e:
            yield {"type": "error", "error": str(e)}

    async def get_tasks_from_state(self, session_id: UUID) -> list[dict[str, Any]]:
        """Get the current tasks from the agent state.

        Args:
            session_id: The session UUID

        Returns:
            List of task dicts from the agent state
        """
        if not self._initialized:
            await self.initialize()

        graph = get_planning_graph_builder().compile(checkpointer=self._checkpointer)
        config = {"configurable": {"thread_id": self._get_thread_id(session_id)}}

        state = await graph.aget_state(config)
        if state and state.values:
            return state.values.get("tasks", [])
        return []

    def tasks_to_create_models(
        self,
        session_id: UUID,
        tasks: list[dict[str, Any]],
    ) -> list[TaskCreate]:
        """Convert task dicts to TaskCreate models.

        Args:
            session_id: The session UUID
            tasks: List of task dicts with title and description

        Returns:
            List of TaskCreate models ready for database insertion
        """
        return [
            TaskCreate(
                session_id=session_id,
                title=task["title"],
                description=task.get("description"),
                order=i,
            )
            for i, task in enumerate(tasks)
        ]


# Singleton instance
agent_service = AgentService()
