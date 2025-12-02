"""Execution API endpoint with SSE streaming."""

import asyncio
import json
import logging
from datetime import UTC, datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.agent.execution_graph import (
    create_execution_summary,
    execute_single_task,
    get_execution_graph_builder,
)
from app.models.base import SessionStatus
from app.models.execution_log import ExecutionLogsResponse
from app.services.agent_service import agent_service
from app.services.execution_connection_service import execution_connection_service
from app.services.execution_log_service import execution_log_service
from app.services.session_service import session_service
from app.services.task_service import task_service


class HeartbeatRequest(BaseModel):
    """Request body for execution heartbeat."""

    connection_id: UUID


class HeartbeatResponse(BaseModel):
    """Response for execution heartbeat."""

    active: bool


router = APIRouter(prefix="/sessions", tags=["Execution"])

logger = logging.getLogger("uvicorn.error")

# Event types that should NOT be persisted (streaming tokens)
_SKIP_PERSIST_EVENTS = {"content"}


async def _persist_and_yield_event(
    session_id: UUID, event_type: str, event: dict
) -> str:
    """Persist event to database and return SSE formatted string.

    Skips persisting streaming content tokens as they add no value on reload.
    """
    if event_type not in _SKIP_PERSIST_EVENTS:
        await execution_log_service.create_from_event(session_id, event)
    return _sse_event(event_type, event)


@router.post("/{session_id}/execute")
async def execute_tasks(session_id: UUID, request: Request) -> StreamingResponse:
    """Execute all pending tasks for a session and stream progress via SSE.

    This endpoint handles both fresh execution and resuming from paused state:
    - From PLANNING: executes all pending tasks
    - From PAUSED: resumes in_progress task (from checkpoint) + remaining pending tasks

    Events emitted:
    - task_selected: When a task is picked for execution
    - tool_call: When the agent calls a tool
    - tool_result: When a tool returns a result
    - task_completed: When a task finishes (done/failed)
    - paused: When execution is paused due to client disconnect
    - error: When an error occurs
    - done: When all tasks are processed
    """
    # Verify session exists
    session = await session_service.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Only allow execution from planning or paused states
    if session.status not in [SessionStatus.PLANNING, SessionStatus.PAUSED]:
        if session.status == SessionStatus.COMPLETED:
            raise HTTPException(status_code=400, detail="Session is already completed")
        raise HTTPException(
            status_code=400,
            detail=f"Cannot execute session in {session.status.value} state",
        )

    is_resuming = session.status == SessionStatus.PAUSED
    logger.info(
        f"[EXECUTE] Starting execution for session {session_id} (resuming={is_resuming})"
    )

    # Get tasks based on session state
    if is_resuming:
        tasks_to_execute = await task_service.get_resumable_tasks(session_id)
    else:
        tasks_to_execute = await task_service.get_pending_tasks(session_id)

    if not tasks_to_execute:
        raise HTTPException(
            status_code=400,
            detail="No tasks to execute",
        )

    # Update session status to executing
    await session_service.update_status(session_id, SessionStatus.EXECUTING)

    # Register this execution connection - invalidates any previous connection
    connection_id = await execution_connection_service.register_connection(session_id)

    async def event_stream():
        """Generate SSE events from task execution."""
        # Capture execution start time for consistent date context across all tasks
        execution_start_time = datetime.now(UTC).strftime("%A, %B %d, %Y at %H:%M UTC")

        # Emit connection event so frontend can start sending heartbeats
        yield _sse_event(
            "connection", {"type": "connection", "connectionId": str(connection_id)}
        )

        # Initialize agent service if needed
        if not agent_service._initialized:
            await agent_service.initialize()

        # Get the execution graph
        graph_builder = get_execution_graph_builder()
        graph = graph_builder.compile(checkpointer=agent_service._checkpointer)

        completed_count = 0
        failed_count = 0
        total_tasks = len(tasks_to_execute)

        # Track completed task results for context passing
        completed_task_results: list[dict] = []

        try:
            for task in tasks_to_execute:
                # Check if connection is still active (heartbeat recent + connection_id valid + no pause request)
                (
                    is_active,
                    pause_reason,
                ) = await execution_connection_service.check_connection_status(
                    session_id, connection_id, timeout_seconds=15
                )
                if not is_active:
                    await session_service.update_status(
                        session_id, SessionStatus.PAUSED
                    )
                    pause_event = {"type": "paused", "reason": pause_reason}
                    await execution_log_service.create_from_event(
                        session_id, pause_event
                    )
                    yield _sse_event("paused", pause_event)
                    return  # Exit the generator

                task_id = str(task.id)
                task_dict = {
                    "id": task_id,
                    "title": task.title,
                    "description": task.description,
                }

                # Emit task_selected event
                event = {"type": "task_selected", "taskId": task_id}
                yield await _persist_and_yield_event(session_id, "task_selected", event)

                # Start the task in database
                try:
                    await task_service.start_task(task.id)
                except ValueError as e:
                    event = {"type": "error", "taskId": task_id, "error": str(e)}
                    yield await _persist_and_yield_event(session_id, "error", event)
                    failed_count += 1
                    continue

                # Create config for this task execution
                # Use a unique thread_id for each task to avoid state conflicts
                config = {
                    "configurable": {
                        "thread_id": f"execution_{session_id}_{task_id}",
                    }
                }

                # Track task result for database update
                task_result = None
                task_failed = False
                error_message = None

                # Track pending tool calls to avoid pausing mid-tool-call
                # Pausing between tool_call and tool_result corrupts LangGraph state
                pending_tool_calls = 0

                # Execute the task and stream events, passing previous results for context
                try:
                    async for event in execute_single_task(
                        graph,
                        session_id,
                        task_dict,
                        config,
                        completed_task_results,
                        execution_start_time,
                    ):
                        event_type = event.get("type")

                        # Track tool call state to determine safe pause points
                        if event_type == "tool_call":
                            pending_tool_calls += 1
                        elif event_type == "tool_result":
                            pending_tool_calls = max(0, pending_tool_calls - 1)

                        # Only check for pause at safe points (not mid-tool-call)
                        # Pausing between tool_call and tool_result corrupts the
                        # message history and causes "tool_call_ids did not have
                        # response messages" error on resume
                        if pending_tool_calls == 0:
                            (
                                is_active,
                                pause_reason,
                            ) = await execution_connection_service.check_connection_status(
                                session_id, connection_id, timeout_seconds=15
                            )
                            if not is_active:
                                logger.info(
                                    f"[EXECUTE] Connection inactive during task (reason={pause_reason}), pausing session {session_id}"
                                )
                                await session_service.update_status(
                                    session_id, SessionStatus.PAUSED
                                )
                                pause_event = {
                                    "type": "paused",
                                    "reason": pause_reason,
                                }
                                await execution_log_service.create_from_event(
                                    session_id, pause_event
                                )
                                yield _sse_event("paused", pause_event)
                                return  # Exit the generator

                        # Track completion info
                        if event_type == "task_completed":
                            task_result = event.get("result", "Task completed")
                            yield await _persist_and_yield_event(
                                session_id, event_type, event
                            )

                        elif event_type == "error":
                            task_failed = True
                            error_message = event.get("error", "Unknown error")
                            yield await _persist_and_yield_event(
                                session_id, event_type, event
                            )

                        else:
                            # Forward other events (tool_call, tool_result, content, artifact_*)
                            yield await _persist_and_yield_event(
                                session_id, event_type, event
                            )

                except Exception as e:
                    task_failed = True
                    error_message = str(e)
                    event = {"type": "error", "taskId": task_id, "error": error_message}
                    yield await _persist_and_yield_event(session_id, "error", event)

                # Update task in database
                try:
                    if task_failed:
                        await task_service.fail_task(
                            task.id,
                            error_message or "Task execution failed",
                        )
                        failed_count += 1
                    else:
                        await task_service.complete_task(
                            task.id,
                            task_result or "Task completed",
                        )
                        completed_count += 1

                        # Store result for context in subsequent tasks
                        completed_task_results.append(
                            {
                                "title": task.title,
                                "result": task_result or "Task completed",
                            }
                        )
                except ValueError as e:
                    # Task status transition failed
                    event = {
                        "type": "error",
                        "taskId": task_id,
                        "error": f"Failed to update task status: {e}",
                    }
                    yield await _persist_and_yield_event(session_id, "error", event)

            # Update session status to completed
            await session_service.update_status(session_id, SessionStatus.COMPLETED)

            # Clear connection record since execution completed normally
            await execution_connection_service.clear_connection(session_id)

            # Emit done event with summary
            event = {
                "type": "done",
                "summary": {
                    "total": total_tasks,
                    "completed": completed_count,
                    "failed": failed_count,
                },
            }
            yield await _persist_and_yield_event(session_id, "done", event)

        except asyncio.CancelledError:
            # Client disconnected - pause execution
            logger.info(
                f"[EXECUTE] CancelledError caught, pausing session {session_id}"
            )
            await session_service.update_status(session_id, SessionStatus.PAUSED)
            event = {"type": "paused", "reason": "client_disconnected"}
            await execution_log_service.create_from_event(session_id, event)
            raise  # Re-raise to properly close the generator

        except GeneratorExit:
            # Generator closed (client disconnected)
            logger.info(f"[EXECUTE] GeneratorExit caught, pausing session {session_id}")
            await session_service.update_status(session_id, SessionStatus.PAUSED)
            event = {"type": "paused", "reason": "client_disconnected"}
            await execution_log_service.create_from_event(session_id, event)
            raise  # Re-raise to properly close the generator

        except Exception as e:
            logger.error(f"[EXECUTE] Exception caught: {type(e).__name__}: {e}")
            event = {"type": "error", "error": str(e)}
            yield await _persist_and_yield_event(session_id, "error", event)

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


def _sse_event(event_type: str, data: dict) -> str:
    """Format a dict as an SSE event string.

    Args:
        event_type: The SSE event name
        data: The data to serialize as JSON

    Returns:
        Formatted SSE event string
    """
    return f"event: {event_type}\ndata: {json.dumps(data)}\n\n"


class ClaimResponse(BaseModel):
    """Response for claiming an execution."""

    claimed: bool
    status: str
    connection_id: str | None


class PauseResponse(BaseModel):
    """Response for pause execution request."""

    paused: bool
    status: str


@router.post("/{session_id}/claim-execution")
async def claim_execution(session_id: UUID) -> ClaimResponse:
    """Claim an executing session, pausing any stale execution.

    Called by frontend when loading a session that's in "executing" status.
    This immediately supersedes any previous connection and pauses the session,
    so the user sees "paused" status and can click Continue.
    """
    session = await session_service.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.status != SessionStatus.EXECUTING:
        # Not executing, nothing to claim
        return ClaimResponse(
            claimed=False, status=session.status.value, connection_id=None
        )

    # Register new connection (supersedes old one)
    new_connection_id = await execution_connection_service.register_connection(
        session_id
    )

    # Immediately pause - the old execution will detect this on its next check
    await session_service.update_status(session_id, SessionStatus.PAUSED)

    return ClaimResponse(
        claimed=True, status="paused", connection_id=str(new_connection_id)
    )


@router.post("/{session_id}/execution-heartbeat")
async def execution_heartbeat(
    session_id: UUID, body: HeartbeatRequest
) -> HeartbeatResponse:
    """Update heartbeat for an active execution connection.

    Frontend calls this every 5 seconds during execution to indicate
    the client is still connected. This endpoint is lightweight and
    NOT logged to execution_logs - invisible to users.

    If the connection_id no longer matches (superseded by new execution),
    returns active=False so the old tab knows to stop sending heartbeats.
    """
    success = await execution_connection_service.update_heartbeat(
        session_id, body.connection_id
    )
    return HeartbeatResponse(active=success)


@router.post("/{session_id}/pause-execution")
async def pause_execution(session_id: UUID) -> PauseResponse:
    """Request to pause an active execution.

    The execution will pause gracefully after completing the current
    tool operation. If no execution is active, returns paused=False.

    This is a non-blocking endpoint - it sets a flag that the execution
    loop will detect on its next checkpoint. The actual pause happens
    asynchronously and the frontend will receive a "paused" SSE event.
    """
    session = await session_service.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.status != SessionStatus.EXECUTING:
        return PauseResponse(paused=False, status=session.status.value)

    # Request pause via connection service
    success = await execution_connection_service.request_pause(session_id)

    if success:
        return PauseResponse(paused=True, status="pausing")
    else:
        # No active connection - execution may have just completed
        # Refresh session status
        session = await session_service.get(session_id)
        return PauseResponse(
            paused=False, status=session.status.value if session else "unknown"
        )


@router.post("/{session_id}/summarize")
async def summarize_session(session_id: UUID) -> StreamingResponse:
    """Generate execution summary and stream as chat message.

    This endpoint is called by the frontend after execution completes.
    It generates a conversational summary using the planning agent and
    saves only the AI response to the checkpoint (no fake user message).

    Events emitted:
    - content: Streamed summary text
    - done: Summary complete
    - error: When an error occurs
    """
    # Verify session exists
    session = await session_service.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Get completed tasks
    tasks = await task_service.list_by_session(session_id)
    completed_tasks = [t for t in tasks if t.status.value == "done"]

    if not completed_tasks:
        raise HTTPException(
            status_code=400,
            detail="No completed tasks to summarize",
        )

    # Build task results
    task_results = [
        {"title": t.title, "result": t.result or "Completed"} for t in completed_tasks
    ]
    total = len(tasks)
    completed = len(completed_tasks)
    failed = len([t for t in tasks if t.status.value == "failed"])

    async def event_stream():
        """Generate SSE events for summary."""
        try:
            # First create the summary artifact
            summary_result = await create_execution_summary(
                session_id=session_id,
                task_results=task_results,
                total=total,
                completed=completed,
                failed=failed,
            )

            if summary_result:
                # Emit artifact_created event
                artifact = summary_result["artifact"]
                yield _sse_event(
                    "artifact_created",
                    {
                        "type": "artifact_created",
                        "taskId": None,
                        "artifactId": artifact["id"],
                        "name": artifact["name"],
                        "artifactType": artifact["type"],
                    },
                )

            # Stream execution summary as chat message
            async for event in agent_service.summarize_execution(
                session_id=session_id,
                task_results=task_results,
                total=total,
                completed=completed,
                failed=failed,
            ):
                event_type = event.get("type")
                if event_type == "content":
                    yield _sse_event("content", event)
                elif event_type == "error":
                    yield _sse_event("error", event)
                elif event_type == "done":
                    yield _sse_event("done", {"type": "done"})

        except Exception as e:
            yield _sse_event("error", {"type": "error", "error": str(e)})

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/{session_id}/execution-logs")
async def get_execution_logs(
    session_id: UUID,
    limit: Annotated[int, Query(ge=1, le=5000)] = 1000,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> ExecutionLogsResponse:
    """Get execution logs for a session.

    Returns all execution events that were generated during task execution.
    Used to restore the execution log view when reloading a session.
    """
    # Verify session exists
    session = await session_service.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    logs = await execution_log_service.list_by_session(
        session_id, limit=limit, offset=offset
    )
    total = await execution_log_service.count_by_session(session_id)

    return ExecutionLogsResponse(logs=logs, total=total)
