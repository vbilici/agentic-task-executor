"""Artifacts API endpoints."""

from uuid import UUID

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from app.models.artifact import Artifact, ArtifactSummary
from app.models.base import ArtifactType
from app.services.artifact_service import artifact_service

router = APIRouter(prefix="/sessions/{session_id}/artifacts", tags=["Artifacts"])


@router.get("")
async def list_artifacts(
    session_id: UUID,
    type: ArtifactType | None = None,
) -> dict[str, list[ArtifactSummary]]:
    """List all artifacts for a session."""
    artifacts = await artifact_service.list_by_session(
        session_id=session_id,
        artifact_type=type,
    )
    return {"artifacts": artifacts}


@router.get("/{artifact_id}")
async def get_artifact(session_id: UUID, artifact_id: UUID) -> Artifact:
    """Get a single artifact with full content."""
    artifact = await artifact_service.get(artifact_id)
    if not artifact:
        raise HTTPException(status_code=404, detail="Artifact not found")

    # Verify artifact belongs to session
    if artifact.session_id != session_id:
        raise HTTPException(status_code=404, detail="Artifact not found")

    return artifact


@router.get("/{artifact_id}/download")
async def download_artifact(session_id: UUID, artifact_id: UUID) -> Response:
    """Download an artifact as a file."""
    artifact = await artifact_service.get(artifact_id)
    if not artifact:
        raise HTTPException(status_code=404, detail="Artifact not found")

    # Verify artifact belongs to session
    if artifact.session_id != session_id:
        raise HTTPException(status_code=404, detail="Artifact not found")

    # Determine file extension based on type
    extension_map = {
        ArtifactType.DOCUMENT: ".md",
        ArtifactType.NOTE: ".txt",
        ArtifactType.SUMMARY: ".md",
        ArtifactType.PLAN: ".md",
        ArtifactType.OTHER: ".txt",
    }
    extension = extension_map.get(artifact.type, ".txt")

    # Create filename from artifact name (sanitize for safety)
    safe_name = "".join(c for c in artifact.name if c.isalnum() or c in " -_").strip()
    filename = f"{safe_name}{extension}" if safe_name else f"artifact{extension}"

    return Response(
        content=artifact.content,
        media_type="text/plain; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )


@router.delete("/{artifact_id}", status_code=204)
async def delete_artifact(session_id: UUID, artifact_id: UUID) -> None:
    """Delete an artifact."""
    # First verify the artifact exists and belongs to the session
    artifact = await artifact_service.get_summary(artifact_id)
    if not artifact:
        raise HTTPException(status_code=404, detail="Artifact not found")

    if artifact.session_id != session_id:
        raise HTTPException(status_code=404, detail="Artifact not found")

    await artifact_service.delete(artifact_id)
