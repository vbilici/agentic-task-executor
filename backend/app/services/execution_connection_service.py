"""Execution connection service for tracking active SSE connections.

This service tracks active execution connections to detect client disconnects
in Cloud Run, where TCP disconnect signals are not reliably forwarded to the container.

The mechanism works as follows:
1. When execution starts, a unique connection_id is registered
2. Frontend sends periodic heartbeats with this connection_id
3. Backend checks if connection_id is still valid AND heartbeat is recent
4. If heartbeat times out, connection_id changes, or pause is requested, execution pauses

Pause reasons:
- "user_requested": User manually clicked pause button
- "client_disconnected": Heartbeat timeout or connection superseded
"""

from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID, uuid4

from app.core.database import get_supabase_client


class ExecutionConnectionService:
    """Service for managing execution connection tracking."""

    def __init__(self) -> None:
        self.client = get_supabase_client()
        self.table = "execution_connections"

    async def register_connection(self, session_id: UUID) -> UUID:
        """Register a new execution connection, invalidating any previous one.

        Uses upsert to atomically replace any existing connection for this session.
        Also resets pause_requested to False to clear any stale pause request.

        Returns:
            The new connection_id that the frontend should use for heartbeats.
        """
        connection_id = uuid4()
        now = datetime.now(UTC).isoformat()

        self.client.table(self.table).upsert(
            {
                "session_id": str(session_id),
                "connection_id": str(connection_id),
                "last_heartbeat": now,
                "created_at": now,
                "pause_requested": False,
            },
            on_conflict="session_id",
        ).execute()

        return connection_id

    async def update_heartbeat(self, session_id: UUID, connection_id: UUID) -> bool:
        """Update last_heartbeat timestamp for an active connection.

        Only updates if the connection_id matches the current active connection.

        Returns:
            True if heartbeat was updated, False if connection_id doesn't match
            (meaning the connection has been superseded by a newer one).
        """
        now = datetime.now(UTC).isoformat()

        result = (
            self.client.table(self.table)
            .update({"last_heartbeat": now})
            .eq("session_id", str(session_id))
            .eq("connection_id", str(connection_id))
            .execute()
        )

        # If no rows updated, connection_id doesn't match (superseded)
        return len(result.data) > 0

    async def is_connection_active(
        self, session_id: UUID, connection_id: UUID, timeout_seconds: int = 15
    ) -> bool:
        """Check if the given connection_id is still active.

        A connection is active if:
        1. The connection_id matches the current one for this session
        2. The last_heartbeat is within the timeout window

        Args:
            session_id: The session to check
            connection_id: The connection_id to verify
            timeout_seconds: How many seconds since last heartbeat before timeout

        Returns:
            True if connection is still active, False otherwise.
        """
        result = (
            self.client.table(self.table)
            .select("connection_id, last_heartbeat")
            .eq("session_id", str(session_id))
            .execute()
        )

        if not result.data:
            # No connection record - connection is not active
            return False

        record: dict[str, Any] = result.data[0]  # type: ignore[assignment]

        # Check if connection_id matches
        if record["connection_id"] != str(connection_id):
            # Connection has been superseded by a newer one
            return False

        # Check if heartbeat is recent
        last_heartbeat_str: str = record["last_heartbeat"]
        last_heartbeat = datetime.fromisoformat(
            last_heartbeat_str.replace("Z", "+00:00")
        )
        now = datetime.now(UTC)
        timeout = timedelta(seconds=timeout_seconds)

        # Return False if heartbeat has timed out
        return now - last_heartbeat <= timeout

    async def check_connection_status(
        self, session_id: UUID, connection_id: UUID, timeout_seconds: int = 15
    ) -> tuple[bool, str | None]:
        """Check connection status and return reason if inactive.

        This is an enhanced version of is_connection_active that returns
        the reason for being inactive, allowing the caller to emit the
        correct pause event reason.

        Args:
            session_id: The session to check
            connection_id: The connection_id to verify
            timeout_seconds: How many seconds since last heartbeat before timeout

        Returns:
            Tuple of (is_active, reason) where reason is:
            - None if active
            - "user_requested" if pause_requested is True
            - "client_disconnected" if heartbeat timeout or connection_id mismatch
        """
        result = (
            self.client.table(self.table)
            .select("connection_id, last_heartbeat, pause_requested")
            .eq("session_id", str(session_id))
            .execute()
        )

        if not result.data:
            # No connection record - connection is not active
            return (False, "client_disconnected")

        record: dict[str, Any] = result.data[0]  # type: ignore[assignment]

        # Check if pause was requested by user
        if record.get("pause_requested", False):
            return (False, "user_requested")

        # Check if connection_id matches
        if record["connection_id"] != str(connection_id):
            # Connection has been superseded by a newer one
            return (False, "client_disconnected")

        # Check if heartbeat is recent
        last_heartbeat_str: str = record["last_heartbeat"]
        last_heartbeat = datetime.fromisoformat(
            last_heartbeat_str.replace("Z", "+00:00")
        )
        now = datetime.now(UTC)
        timeout = timedelta(seconds=timeout_seconds)

        if now - last_heartbeat > timeout:
            return (False, "client_disconnected")

        return (True, None)

    async def request_pause(self, session_id: UUID) -> bool:
        """Request pause for an active execution.

        Sets the pause_requested flag to True. The execution loop will
        detect this on its next checkpoint and pause gracefully.

        Args:
            session_id: The session to pause

        Returns:
            True if pause was requested (connection exists),
            False if no active connection found.
        """
        result = (
            self.client.table(self.table)
            .update({"pause_requested": True})
            .eq("session_id", str(session_id))
            .execute()
        )

        return len(result.data) > 0

    async def clear_connection(self, session_id: UUID) -> None:
        """Clear the connection record when execution completes normally.

        This prevents stale records from accumulating in the database.
        """
        self.client.table(self.table).delete().eq(
            "session_id", str(session_id)
        ).execute()


# Singleton instance
execution_connection_service = ExecutionConnectionService()
