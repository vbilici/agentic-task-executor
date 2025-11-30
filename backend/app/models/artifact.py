"""Artifact models."""

from datetime import datetime
from uuid import UUID

from pydantic import Field, field_validator

from app.models.base import ArtifactType, BaseDBModel


class ArtifactBase(BaseDBModel):
    """Base artifact model."""

    name: str = Field(max_length=200)
    type: ArtifactType
    content: str

    @field_validator("content")
    @classmethod
    def validate_content_size(cls, v: str) -> str:
        """Validate content size is under 100KB."""
        if len(v.encode("utf-8")) > 102400:
            raise ValueError("Artifact content exceeds 100KB limit")
        return v


class ArtifactCreate(BaseDBModel):
    """Artifact creation model."""

    session_id: UUID
    task_id: UUID | None = None
    name: str = Field(max_length=200)
    type: ArtifactType
    content: str

    @field_validator("content")
    @classmethod
    def validate_content_size(cls, v: str) -> str:
        """Validate content size is under 100KB."""
        if len(v.encode("utf-8")) > 102400:
            raise ValueError("Artifact content exceeds 100KB limit")
        return v


class Artifact(ArtifactBase):
    """Artifact model with all fields."""

    id: UUID
    session_id: UUID
    task_id: UUID | None = None
    created_at: datetime


class ArtifactSummary(BaseDBModel):
    """Artifact summary without content for listing."""

    id: UUID
    session_id: UUID
    task_id: UUID | None = None
    name: str
    type: ArtifactType
    created_at: datetime
