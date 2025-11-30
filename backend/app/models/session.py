"""Session models."""

from __future__ import annotations

from typing import TYPE_CHECKING
from uuid import UUID

from pydantic import Field

from app.models.base import BaseDBModel, SessionStatus, TimestampMixin

if TYPE_CHECKING:
    from app.models.artifact import ArtifactSummary
    from app.models.message import CheckpointMessage
    from app.models.task import Task


class SessionBase(BaseDBModel):
    """Base session model."""

    title: str = Field(max_length=200)
    status: SessionStatus = SessionStatus.PLANNING


class SessionCreate(BaseDBModel):
    """Session creation model - title is auto-generated."""

    pass


class Session(SessionBase, TimestampMixin):
    """Session model with all fields."""

    id: UUID


class SessionDetail(Session):
    """Session with related data for detail view."""

    # These will be populated from related tables
    tasks: list[Task] = Field(default_factory=list)
    # Messages come from LangGraph checkpoint state, not database
    messages: list[CheckpointMessage] = Field(default_factory=list)
    artifacts: list[ArtifactSummary] = Field(default_factory=list)


# Rebuild model to resolve forward references
def _rebuild_models() -> None:
    from app.models.artifact import ArtifactSummary
    from app.models.message import CheckpointMessage
    from app.models.task import Task

    SessionDetail.model_rebuild(
        _types_namespace={
            "Task": Task,
            "CheckpointMessage": CheckpointMessage,
            "ArtifactSummary": ArtifactSummary,
        }
    )


_rebuild_models()
