"""Artifact service for CRUD operations."""

from uuid import UUID

from app.core.database import get_supabase_client
from app.models.artifact import Artifact, ArtifactCreate, ArtifactSummary
from app.models.base import ArtifactType


class ArtifactService:
    """Service for artifact CRUD operations."""

    def __init__(self) -> None:
        self.client = get_supabase_client()
        self.table = "artifacts"

    async def create(self, artifact: ArtifactCreate) -> Artifact:
        """Create a new artifact."""
        data = {
            "session_id": str(artifact.session_id),
            "task_id": str(artifact.task_id) if artifact.task_id else None,
            "name": artifact.name,
            "type": artifact.type.value,
            "content": artifact.content,
        }
        result = self.client.table(self.table).insert(data).execute()
        return Artifact(**result.data[0])

    async def get(self, artifact_id: UUID) -> Artifact | None:
        """Get an artifact by ID with full content."""
        result = (
            self.client.table(self.table)
            .select("*")
            .eq("id", str(artifact_id))
            .execute()
        )
        if not result.data:
            return None
        return Artifact(**result.data[0])

    async def get_summary(self, artifact_id: UUID) -> ArtifactSummary | None:
        """Get an artifact summary by ID (without content)."""
        result = (
            self.client.table(self.table)
            .select("id, session_id, task_id, name, type, created_at")
            .eq("id", str(artifact_id))
            .execute()
        )
        if not result.data:
            return None
        return ArtifactSummary(**result.data[0])

    async def list_by_session(
        self,
        session_id: UUID,
        artifact_type: ArtifactType | None = None,
    ) -> list[ArtifactSummary]:
        """List all artifacts for a session (summaries only)."""
        query = (
            self.client.table(self.table)
            .select("id, session_id, task_id, name, type, created_at")
            .eq("session_id", str(session_id))
        )

        if artifact_type:
            query = query.eq("type", artifact_type.value)

        result = query.order("created_at").execute()
        return [ArtifactSummary(**row) for row in result.data]

    async def list_by_task(self, task_id: UUID) -> list[ArtifactSummary]:
        """List all artifacts for a task (summaries only)."""
        result = (
            self.client.table(self.table)
            .select("id, session_id, task_id, name, type, created_at")
            .eq("task_id", str(task_id))
            .order("created_at")
            .execute()
        )
        return [ArtifactSummary(**row) for row in result.data]

    async def get_content(self, artifact_id: UUID) -> str | None:
        """Get just the content of an artifact (for download)."""
        result = (
            self.client.table(self.table)
            .select("content")
            .eq("id", str(artifact_id))
            .execute()
        )
        if not result.data:
            return None
        return str(result.data[0]["content"])

    async def delete(self, artifact_id: UUID) -> bool:
        """Delete an artifact."""
        result = (
            self.client.table(self.table).delete().eq("id", str(artifact_id)).execute()
        )
        return len(result.data) > 0

    async def delete_by_session(self, session_id: UUID) -> int:
        """Delete all artifacts for a session."""
        result = (
            self.client.table(self.table)
            .delete()
            .eq("session_id", str(session_id))
            .execute()
        )
        return len(result.data)


# Singleton instance
artifact_service = ArtifactService()
