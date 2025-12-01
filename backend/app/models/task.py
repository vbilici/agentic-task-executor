"""Task models."""

from uuid import UUID

from pydantic import Field

from app.models.base import BaseDBModel, TaskStatus, TimestampMixin


class TaskBase(BaseDBModel):
    """Base task model."""

    title: str = Field(max_length=500)
    description: str | None = Field(default=None, max_length=2000)
    status: TaskStatus = TaskStatus.PENDING
    order: int = Field(ge=0)


class TaskCreate(BaseDBModel):
    """Task creation model."""

    session_id: UUID
    title: str = Field(max_length=500)
    description: str | None = Field(default=None, max_length=2000)
    order: int = Field(ge=0)


class TaskUpdate(BaseDBModel):
    """Task update model."""

    title: str | None = Field(default=None, max_length=500)
    description: str | None = Field(default=None, max_length=2000)
    status: TaskStatus | None = None
    result: str | None = None


class Task(TaskBase, TimestampMixin):
    """Task model with all fields."""

    id: UUID
    session_id: UUID
    result: str | None = None
