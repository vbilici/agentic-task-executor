"""Create artifact tool for the execution agent."""

import asyncio
from typing import Literal
from uuid import UUID

from langchain_core.tools import tool

from app.models.artifact import ArtifactCreate
from app.models.base import ArtifactType
from app.services.artifact_service import artifact_service


def _run_async(coro):
    """Run async code from sync context."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # We're in an async context but called from sync
            import concurrent.futures

            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(asyncio.run, coro)
                return future.result()
        return loop.run_until_complete(coro)
    except RuntimeError:
        return asyncio.run(coro)


@tool
def create_artifact(
    session_id: str,
    name: str,
    content: str,
    artifact_type: Literal["document", "note", "summary", "plan", "other"],
    task_id: str | None = None,
) -> str:
    """Create a new artifact (document, note, summary, or plan) in the session.

    Use this tool when you need to create a written deliverable such as:
    - document: A formal document like a report, analysis, or proposal
    - note: Quick notes or observations
    - summary: A summary of research or findings
    - plan: A structured plan or roadmap
    - other: Any other type of written content

    The artifact will be saved and visible to the user in the artifacts sidebar.

    IMPORTANT: You must use the EXACT session_id UUID provided in the Session Context.
    Do NOT use placeholder values like "current_session" - use the actual UUID!

    Args:
        session_id: The EXACT session UUID from Session Context (e.g., "550e8400-e29b-41d4-a716-446655440000")
        name: A descriptive name for the artifact (max 200 characters)
        content: The full content of the artifact (max 100KB)
        artifact_type: The type of artifact (document, note, summary, plan, other)
        task_id: Optional task UUID from Session Context if associating with current task

    Returns:
        A confirmation message with the created artifact's ID
    """
    try:
        # Validate artifact type
        try:
            art_type = ArtifactType(artifact_type)
        except ValueError:
            return f"Error: Invalid artifact type '{artifact_type}'. Must be one of: document, note, summary, plan, other"

        # Validate content size (100KB limit)
        if len(content.encode("utf-8")) > 102400:
            return "Error: Artifact content exceeds 100KB limit. Please reduce the content size."

        # Validate name length
        if len(name) > 200:
            name = name[:200]

        # Create the artifact
        artifact_data = ArtifactCreate(
            session_id=UUID(session_id),
            task_id=UUID(task_id) if task_id else None,
            name=name,
            type=art_type,
            content=content,
        )

        artifact = _run_async(artifact_service.create(artifact_data))

        return f"Successfully created {artifact_type} artifact '{name}' (ID: {artifact.id})"

    except ValueError as e:
        return f"Error creating artifact: Invalid UUID format - {e}"
    except Exception as e:
        return f"Error creating artifact: {e}"
