"""Agent service for managing LangGraph agents with persistence."""

from collections.abc import AsyncIterator
from typing import Any
from uuid import UUID

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from psycopg.rows import dict_row
from psycopg_pool import AsyncNullConnectionPool

from app.agent.graph import get_planning_graph_builder
from app.agent.state import PlanningState
from app.core.config import get_settings
from app.models.task import TaskCreate


class AgentService:
    """Service for managing LangGraph agents with PostgreSQL persistence."""

    _pool: AsyncNullConnectionPool | None = None
    _checkpointer: AsyncPostgresSaver | None = None
    _initialized: bool = False

    async def initialize(self) -> None:
        """Initialize the connection pool and checkpointer."""
        if self._initialized:
            return

        settings = get_settings()

        # Use NullConnectionPool to avoid double-pooling with Supabase's PgBouncer
        # autocommit=True required for CREATE INDEX CONCURRENTLY in setup()
        # row_factory=dict_row required for checkpointer row access
        pool = AsyncNullConnectionPool(
            conninfo=settings.database_url,
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
            - {"type": "tasks_extracting"} - Task extraction started
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
            extracting_started = False

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

                elif event_type == "on_chain_stream" and node_name == "chat":
                    # Chat finished streaming, task extraction is about to start
                    if not extracting_started:
                        yield {"type": "tasks_extracting"}
                        extracting_started = True

                elif event_type == "on_chain_end" and node_name == "extract_tasks":
                    # Check for tasks from the extract_tasks node
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

    async def get_messages_from_state(self, session_id: UUID) -> list[dict[str, Any]]:
        """Get conversation messages from the agent checkpoint state.

        Args:
            session_id: The session UUID

        Returns:
            List of message dicts with role and content
        """
        if not self._initialized:
            await self.initialize()

        graph = get_planning_graph_builder().compile(checkpointer=self._checkpointer)
        config = {"configurable": {"thread_id": self._get_thread_id(session_id)}}

        state = await graph.aget_state(config)
        if not state or not state.values:
            return []

        messages = state.values.get("messages", [])
        result = []

        for msg in messages:
            if isinstance(msg, HumanMessage):
                result.append(
                    {
                        "role": "user",
                        "content": msg.content,
                    }
                )
            elif isinstance(msg, AIMessage):
                result.append(
                    {
                        "role": "assistant",
                        "content": msg.content,
                    }
                )

        return result

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

    async def summarize_execution(
        self,
        session_id: UUID,
        task_results: list[dict[str, Any]],
        total: int,
        completed: int,
        failed: int,
    ) -> AsyncIterator[dict[str, Any]]:
        """Generate execution summary as a streamed chat message.

        This generates a conversational summary using a standalone LLM call,
        then saves ONLY the AI response to the checkpoint (no fake user message).

        Args:
            session_id: The session UUID
            task_results: List of dicts with title and result for each task
            total: Total number of tasks
            completed: Number of completed tasks
            failed: Number of failed tasks

        Yields:
            Events dict with type and payload:
            - {"type": "content", "content": "..."} - Streamed text
            - {"type": "done"} - Summary complete
            - {"type": "error", "error": "..."} - Error occurred
        """
        if not self._initialized:
            await self.initialize()

        settings = get_settings()

        # Build the results summary for the LLM
        results_text = "\n".join(
            f"- {r.get('title', 'Task')}: {r.get('result', 'Completed')}"
            for r in task_results
        )

        summary_context = f"""Execution completed:
- {completed} of {total} tasks completed successfully
{f"- {failed} tasks failed" if failed > 0 else ""}

Results:
{results_text}"""

        # System prompt for execution summary
        system_prompt = """You are summarizing the results of task execution for the user.

Based on the execution results provided, give a brief, friendly summary of what was accomplished.

Guidelines:
- Be conversational and positive
- Use bullet points for key findings and results
- Use **bold** for important highlights
- Mention any issues if tasks failed
- Keep it concise (3-6 bullet points max)
- If there are notable artifacts created, mention them

Format example:
- **Main finding**: Brief description
- **Key result**: What was discovered/accomplished
- Any issues or next steps

Remember: The user just watched their tasks execute. Give them a scannable, helpful summary."""

        # Create standalone LLM with streaming
        llm = ChatOpenAI(
            model="gpt-4o",
            api_key=settings.openai_api_key,
            max_tokens=1024,
            streaming=True,
        )

        # Build messages for standalone call
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=summary_context),
        ]

        try:
            # Accumulate full response for checkpoint
            full_response = ""

            # Stream the response
            async for chunk in llm.astream(messages):
                if chunk.content:
                    full_response += chunk.content
                    yield {"type": "content", "content": chunk.content}

            # Save ONLY the AI message to checkpoint (no fake user message)
            if full_response:
                graph = get_planning_graph_builder().compile(
                    checkpointer=self._checkpointer
                )
                config = {
                    "configurable": {"thread_id": self._get_thread_id(session_id)}
                }

                # Use aupdate_state to add only the AI response
                await graph.aupdate_state(
                    config,
                    {"messages": [AIMessage(content=full_response)]},
                )

            yield {"type": "done"}

        except Exception as e:
            yield {"type": "error", "error": str(e)}


# Singleton instance
agent_service = AgentService()
