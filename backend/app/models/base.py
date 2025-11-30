"""Base models and enums for the application."""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class SessionStatus(str, Enum):
    """Session status enum."""

    PLANNING = "planning"
    EXECUTING = "executing"
    COMPLETED = "completed"


class TaskStatus(str, Enum):
    """Task status enum."""

    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    DONE = "done"
    FAILED = "failed"


class MessageRole(str, Enum):
    """Message role enum."""

    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class ArtifactType(str, Enum):
    """Artifact type enum."""

    DOCUMENT = "document"
    NOTE = "note"
    SUMMARY = "summary"
    PLAN = "plan"
    OTHER = "other"


class BaseDBModel(BaseModel):
    """Base model with common configuration."""

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        alias_generator=to_camel,
    )


class TimestampMixin(BaseModel):
    """Mixin for created_at and updated_at fields."""

    created_at: datetime
    updated_at: datetime
