"""Read artifact tool for the execution agent."""

from uuid import UUID

from langchain_core.tools import tool

from app.services.artifact_service import artifact_service


@tool
async def read_artifact(artifact_id: str) -> str:
    """Read the content of an existing artifact.

    Use this tool when you need to read or reference content from a previously
    created artifact. This is useful for:
    - Reviewing previous work
    - Building on existing content
    - Cross-referencing information

    Args:
        artifact_id: The UUID of the artifact to read

    Returns:
        The artifact's content, or an error message if not found
    """
    try:
        artifact = await artifact_service.get(UUID(artifact_id))

        if not artifact:
            return f"Error: Artifact with ID '{artifact_id}' not found."

        return f"""Artifact: {artifact.name}
Type: {artifact.type.value}
Created: {artifact.created_at.isoformat()}

---
{artifact.content}
"""

    except ValueError as e:
        return f"Error reading artifact: Invalid UUID format - {e}"
    except Exception as e:
        return f"Error reading artifact: {e}"


@tool
async def list_artifacts(session_id: str) -> str:
    """List all artifacts in a session.

    Use this tool to see what artifacts have been created in the current session.
    This helps you understand what content already exists before creating new artifacts.

    Args:
        session_id: The session UUID to list artifacts for

    Returns:
        A formatted list of artifacts with their IDs, names, and types
    """
    try:
        artifacts = await artifact_service.list_by_session(UUID(session_id))

        if not artifacts:
            return "No artifacts found in this session."

        lines = ["Artifacts in this session:", ""]
        for artifact in artifacts:
            task_info = f" (Task: {artifact.task_id})" if artifact.task_id else ""
            lines.append(f"- [{artifact.type.value}] {artifact.name}{task_info}")
            lines.append(f"  ID: {artifact.id}")
            lines.append("")

        return "\n".join(lines)

    except ValueError as e:
        return f"Error listing artifacts: Invalid UUID format - {e}"
    except Exception as e:
        return f"Error listing artifacts: {e}"
