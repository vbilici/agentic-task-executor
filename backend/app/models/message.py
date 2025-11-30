"""Message models."""

from datetime import datetime
from uuid import UUID

from app.models.base import BaseDBModel, MessageRole


class MessageBase(BaseDBModel):
    """Base message model."""

    role: MessageRole
    content: str


class MessageCreate(BaseDBModel):
    """Message creation model."""

    session_id: UUID
    role: MessageRole
    content: str


class Message(MessageBase):
    """Message model with all fields."""

    id: UUID
    session_id: UUID
    created_at: datetime


class CheckpointMessage(BaseDBModel):
    """Message from LangGraph checkpoint state.

    Simpler model without database fields, used when fetching
    conversation history from the agent checkpoint.
    """

    role: str  # "user" or "assistant"
    content: str
