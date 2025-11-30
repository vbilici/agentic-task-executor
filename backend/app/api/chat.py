"""Chat API endpoint with SSE streaming."""

import json
from uuid import UUID

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.services.agent_service import agent_service
from app.services.session_service import session_service
from app.services.task_service import task_service

router = APIRouter(prefix="/sessions", tags=["Messages"])


class ChatRequest(BaseModel):
    """Chat message request body."""

    message: str = Field(min_length=1, max_length=10000)


@router.post("/{session_id}/chat")
async def chat(session_id: UUID, request: ChatRequest) -> StreamingResponse:
    """Send a chat message and stream the response via SSE.

    Messages are stored via LangGraph checkpointer, not in a separate table.
    """
    # Verify session exists
    session = await session_service.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Update session title if it's the first message
    if session.title == "New Session":
        title = request.message[:200] if len(request.message) > 200 else request.message
        await session_service.update_title(session_id, title)

    async def event_stream():
        """Generate SSE events from agent."""
        tasks_generated: list[dict] = []

        try:
            async for event in agent_service.chat(session_id, request.message):
                event_type = event.get("type")

                if event_type == "content":
                    yield f"event: content\ndata: {json.dumps(event)}\n\n"

                elif event_type == "tasks_extracting":
                    yield f"event: tasks_extracting\ndata: {json.dumps(event)}\n\n"

                elif event_type == "tasks_updated":
                    # Store tasks but don't send yet - wait until saved to DB
                    tasks_generated = event.get("tasks", [])

                elif event_type == "error":
                    yield f"event: error\ndata: {json.dumps(event)}\n\n"

                elif event_type == "done":
                    # Save tasks to database
                    if tasks_generated:
                        # Delete existing tasks first
                        await task_service.delete_by_session(session_id)

                        # Create new tasks
                        task_creates = agent_service.tasks_to_create_models(
                            session_id, tasks_generated
                        )
                        created_tasks = await task_service.create_many(task_creates)

                        # Send updated tasks with database IDs
                        yield f"event: tasks_updated\ndata: {json.dumps({'type': 'tasks_updated', 'tasks': [t.model_dump(mode='json') for t in created_tasks]})}\n\n"

                    yield f"event: done\ndata: {json.dumps({'type': 'done'})}\n\n"

        except Exception as e:
            yield f"event: error\ndata: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
