"""DataItem models."""

from typing import Any
from uuid import UUID

from pydantic import Field

from app.models.base import BaseDBModel, TimestampMixin


class DataItemBase(BaseDBModel):
    """Base data item model."""

    item_type: str = Field(max_length=100)
    data: dict[str, Any]


class DataItemCreate(BaseDBModel):
    """Data item creation model."""

    session_id: UUID
    item_type: str = Field(max_length=100)
    data: dict[str, Any]


class DataItemUpdate(BaseDBModel):
    """Data item update model."""

    item_type: str | None = Field(default=None, max_length=100)
    data: dict[str, Any] | None = None


class DataItem(DataItemBase, TimestampMixin):
    """Data item model with all fields."""

    id: UUID
    session_id: UUID
