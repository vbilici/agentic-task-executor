"""Message service for CRUD operations."""

from uuid import UUID

from app.core.database import get_supabase_client
from app.models.message import Message, MessageCreate


class MessageService:
    """Service for message CRUD operations."""

    def __init__(self) -> None:
        self.client = get_supabase_client()
        self.table = "messages"

    async def create(self, message: MessageCreate) -> Message:
        """Create a new message."""
        data = {
            "session_id": str(message.session_id),
            "role": message.role.value,
            "content": message.content,
        }
        result = self.client.table(self.table).insert(data).execute()
        return Message(**result.data[0])

    async def list_by_session(self, session_id: UUID) -> list[Message]:
        """List all messages for a session, ordered by creation time."""
        result = (
            self.client.table(self.table)
            .select("*")
            .eq("session_id", str(session_id))
            .order("created_at")
            .execute()
        )
        return [Message(**row) for row in result.data]

    async def get_last_n(self, session_id: UUID, n: int = 10) -> list[Message]:
        """Get the last N messages for a session."""
        result = (
            self.client.table(self.table)
            .select("*")
            .eq("session_id", str(session_id))
            .order("created_at", desc=True)
            .limit(n)
            .execute()
        )
        # Reverse to get chronological order
        messages = [Message(**row) for row in result.data]
        return list(reversed(messages))

    async def delete_by_session(self, session_id: UUID) -> int:
        """Delete all messages for a session."""
        result = (
            self.client.table(self.table)
            .delete()
            .eq("session_id", str(session_id))
            .execute()
        )
        return len(result.data)


# Singleton instance
message_service = MessageService()
