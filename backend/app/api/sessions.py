"""Sessions API endpoints."""

from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query

from app.models.base import SessionStatus
from app.models.session import Session, SessionDetail
from app.services.session_service import session_service

router = APIRouter(prefix="/sessions", tags=["Sessions"])


@router.get("")
async def list_sessions(
    status: SessionStatus | None = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> dict[str, Any]:
    """List all sessions with optional filtering."""
    sessions, total = await session_service.list(
        status=status,
        limit=limit,
        offset=offset,
    )
    return {"sessions": sessions, "total": total}


@router.post("", status_code=201)
async def create_session() -> Session:
    """Create a new session."""
    return await session_service.create()


@router.get("/{session_id}")
async def get_session(session_id: UUID) -> SessionDetail:
    """Get session details with all related data."""
    session = await session_service.get_detail(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.delete("/{session_id}", status_code=204)
async def delete_session(session_id: UUID) -> None:
    """Delete a session and all related data."""
    deleted = await session_service.delete(session_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Session not found")
