"""Session service for CRUD operations."""

from uuid import UUID

from app.core.database import get_supabase_client
from app.models.artifact import ArtifactSummary
from app.models.base import SessionStatus
from app.models.data_item import DataItem
from app.models.message import CheckpointMessage
from app.models.session import Session, SessionDetail
from app.models.task import Task
from app.services.agent_service import agent_service


class SessionService:
    """Service for session CRUD operations."""

    def __init__(self) -> None:
        self.client = get_supabase_client()
        self.table = "sessions"

    async def create(self, title: str = "New Session") -> Session:
        """Create a new session."""
        data = {
            "title": title,
            "status": SessionStatus.PLANNING.value,
        }
        result = self.client.table(self.table).insert(data).execute()
        return Session(**result.data[0])

    async def get(self, session_id: UUID) -> Session | None:
        """Get a session by ID."""
        result = (
            self.client.table(self.table)
            .select("*")
            .eq("id", str(session_id))
            .execute()
        )
        if not result.data:
            return None
        return Session(**result.data[0])

    async def get_detail(self, session_id: UUID) -> SessionDetail | None:
        """Get a session with all related data."""
        session = await self.get(session_id)
        if not session:
            return None

        # Fetch related data from database
        tasks_result = (
            self.client.table("tasks")
            .select("*")
            .eq("session_id", str(session_id))
            .order("order")
            .execute()
        )
        artifacts_result = (
            self.client.table("artifacts")
            .select("id, session_id, task_id, name, type, created_at")
            .eq("session_id", str(session_id))
            .order("created_at")
            .execute()
        )
        data_items_result = (
            self.client.table("data_items")
            .select("*")
            .eq("session_id", str(session_id))
            .order("created_at")
            .execute()
        )

        # Fetch messages from LangGraph checkpoint state
        checkpoint_messages = await agent_service.get_messages_from_state(session_id)

        return SessionDetail(
            **session.model_dump(),
            tasks=[Task(**t) for t in tasks_result.data],
            messages=[CheckpointMessage(**m) for m in checkpoint_messages],
            artifacts=[ArtifactSummary(**a) for a in artifacts_result.data],
            data_items=[DataItem(**d) for d in data_items_result.data],
        )

    async def list(
        self,
        status: SessionStatus | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> tuple[list[Session], int]:
        """List sessions with optional filtering."""
        query = self.client.table(self.table).select("*", count="exact")

        if status:
            query = query.eq("status", status.value)

        query = query.order("created_at", desc=True).range(offset, offset + limit - 1)
        result = query.execute()

        sessions = [Session(**s) for s in result.data]
        total = result.count or 0
        return sessions, total

    async def update_status(
        self, session_id: UUID, status: SessionStatus
    ) -> Session | None:
        """Update session status."""
        result = (
            self.client.table(self.table)
            .update({"status": status.value})
            .eq("id", str(session_id))
            .execute()
        )
        if not result.data:
            return None
        return Session(**result.data[0])

    async def update_title(self, session_id: UUID, title: str) -> Session | None:
        """Update session title."""
        result = (
            self.client.table(self.table)
            .update({"title": title[:200]})
            .eq("id", str(session_id))
            .execute()
        )
        if not result.data:
            return None
        return Session(**result.data[0])

    async def delete(self, session_id: UUID) -> bool:
        """Delete a session (cascades to related data)."""
        result = (
            self.client.table(self.table).delete().eq("id", str(session_id)).execute()
        )
        return len(result.data) > 0


# Singleton instance
session_service = SessionService()
