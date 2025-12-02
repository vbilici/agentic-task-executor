"""Execution log service for CRUD operations."""

from typing import Any, cast
from uuid import UUID

from app.core.database import get_supabase_client
from app.models.execution_log import (
    ExecutionLog,
    ExecutionLogCreate,
    ExecutionLogEventType,
)


class ExecutionLogService:
    """Service for execution log CRUD operations."""

    def __init__(self) -> None:
        self.client = get_supabase_client()
        self.table = "execution_logs"

    async def create(self, log: ExecutionLogCreate) -> ExecutionLog:
        """Create a new execution log entry."""
        data = {
            "session_id": str(log.session_id),
            "task_id": str(log.task_id) if log.task_id else None,
            "event_type": log.event_type.value,
            "event_data": log.event_data,
        }
        result = self.client.table(self.table).insert(data).execute()
        rows = cast(list[dict[str, Any]], result.data)
        return ExecutionLog(**rows[0])

    async def create_from_event(
        self,
        session_id: UUID,
        event: dict[str, Any],
    ) -> ExecutionLog:
        """Create execution log from SSE event dict.

        Convenience method that extracts event_type and task_id from event.
        """
        event_type = event.get("type")
        task_id_str = event.get("taskId")

        log = ExecutionLogCreate(
            session_id=session_id,
            task_id=UUID(task_id_str) if task_id_str else None,
            event_type=ExecutionLogEventType(event_type),
            event_data=event,
        )
        return await self.create(log)

    async def list_by_session(
        self,
        session_id: UUID,
        limit: int = 1000,
        offset: int = 0,
    ) -> list[ExecutionLog]:
        """List all execution logs for a session, ordered by created_at."""
        result = (
            self.client.table(self.table)
            .select("*")
            .eq("session_id", str(session_id))
            .order("created_at")
            .range(offset, offset + limit - 1)
            .execute()
        )
        rows = cast(list[dict[str, Any]], result.data)
        return [ExecutionLog(**row) for row in rows]

    async def list_by_task(self, task_id: UUID) -> list[ExecutionLog]:
        """List all execution logs for a specific task."""
        result = (
            self.client.table(self.table)
            .select("*")
            .eq("task_id", str(task_id))
            .order("created_at")
            .execute()
        )
        rows = cast(list[dict[str, Any]], result.data)
        return [ExecutionLog(**row) for row in rows]

    async def count_by_session(self, session_id: UUID) -> int:
        """Count total execution logs for a session."""
        result = (
            self.client.table(self.table)
            .select("id", count="exact")  # type: ignore[arg-type]
            .eq("session_id", str(session_id))
            .execute()
        )
        return result.count or 0

    async def delete_by_session(self, session_id: UUID) -> int:
        """Delete all execution logs for a session."""
        result = (
            self.client.table(self.table)
            .delete()
            .eq("session_id", str(session_id))
            .execute()
        )
        rows = cast(list[dict[str, Any]], result.data)
        return len(rows)


# Singleton instance
execution_log_service = ExecutionLogService()
