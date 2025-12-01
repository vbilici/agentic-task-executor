"""Execution log models."""

from datetime import datetime
from enum import Enum
from typing import Any
from uuid import UUID

from app.models.base import BaseDBModel


class ExecutionLogEventType(str, Enum):
    """Execution log event type enum."""

    TASK_SELECTED = "task_selected"
    TOOL_CALL = "tool_call"
    TOOL_RESULT = "tool_result"
    CONTENT = "content"
    TASK_COMPLETED = "task_completed"
    ARTIFACT_ANALYSIS_START = "artifact_analysis_start"
    ARTIFACT_ANALYSIS_COMPLETE = "artifact_analysis_complete"
    ARTIFACT_CREATED = "artifact_created"
    ERROR = "error"
    DONE = "done"


class ExecutionLogCreate(BaseDBModel):
    """Execution log creation model."""

    session_id: UUID
    task_id: UUID | None = None
    event_type: ExecutionLogEventType
    event_data: dict[str, Any]


class ExecutionLog(BaseDBModel):
    """Execution log model with all fields."""

    id: UUID
    session_id: UUID
    task_id: UUID | None = None
    event_type: ExecutionLogEventType
    event_data: dict[str, Any]
    created_at: datetime


class ExecutionLogsResponse(BaseDBModel):
    """Response model for execution logs endpoint."""

    logs: list[ExecutionLog]
    total: int
