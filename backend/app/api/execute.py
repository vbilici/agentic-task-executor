"""Execution API endpoint with SSE streaming."""

import json
from uuid import UUID

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.agent.execution_graph import execute_single_task, get_execution_graph_builder
from app.models.base import SessionStatus
from app.services.agent_service import agent_service
from app.services.session_service import session_service
from app.services.task_service import task_service

router = APIRouter(prefix="/sessions", tags=["Execution"])


@router.post("/{session_id}/execute")
async def execute_tasks(session_id: UUID) -> StreamingResponse:
    """Execute all pending tasks for a session and stream progress via SSE.

    This endpoint:
    1. Fetches all pending tasks for the session
    2. Executes each task sequentially using the execution agent
    3. Streams real-time events for each task's progress
    4. Updates task status in the database

    Events emitted:
    - task_selected: When a task is picked for execution
    - tool_call: When the agent calls a tool
    - tool_result: When a tool returns a result
    - task_completed: When a task finishes (done/failed)
    - reflection: Agent's reflection on task completion
    - error: When an error occurs
    - done: When all tasks are processed
    """
    # Verify session exists
    session = await session_service.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Get pending tasks
    pending_tasks = await task_service.get_pending_tasks(session_id)
    if not pending_tasks:
        raise HTTPException(
            status_code=400,
            detail="No pending tasks to execute",
        )

    # Update session status to executing
    await session_service.update_status(session_id, SessionStatus.EXECUTING)

    async def event_stream():
        """Generate SSE events from task execution."""
        # Initialize agent service if needed
        if not agent_service._initialized:
            await agent_service.initialize()

        # Get the execution graph
        graph_builder = get_execution_graph_builder()
        graph = graph_builder.compile(checkpointer=agent_service._checkpointer)

        completed_count = 0
        failed_count = 0
        total_tasks = len(pending_tasks)

        # Track completed task results for context passing
        completed_task_results: list[dict] = []

        try:
            for task in pending_tasks:
                task_id = str(task.id)
                task_dict = {
                    "id": task_id,
                    "title": task.title,
                    "description": task.description,
                }

                # Emit task_selected event
                yield _sse_event(
                    "task_selected",
                    {"type": "task_selected", "taskId": task_id},
                )

                # Start the task in database
                try:
                    await task_service.start_task(task.id)
                except ValueError as e:
                    yield _sse_event(
                        "error",
                        {"type": "error", "taskId": task_id, "error": str(e)},
                    )
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
                task_reflection = None
                task_failed = False
                error_message = None

                # Execute the task and stream events, passing previous results for context
                try:
                    async for event in execute_single_task(
                        graph, session_id, task_dict, config, completed_task_results
                    ):
                        event_type = event.get("type")

                        # Track completion info
                        if event_type == "task_completed":
                            task_result = event.get("result", "Task completed")
                            yield _sse_event(event_type, event)

                        elif event_type == "reflection":
                            task_reflection = event.get("text")
                            yield _sse_event(event_type, event)

                        elif event_type == "error":
                            task_failed = True
                            error_message = event.get("error", "Unknown error")
                            yield _sse_event(event_type, event)

                        else:
                            # Forward other events (tool_call, tool_result, content)
                            yield _sse_event(event_type, event)

                except Exception as e:
                    task_failed = True
                    error_message = str(e)
                    yield _sse_event(
                        "error",
                        {"type": "error", "taskId": task_id, "error": error_message},
                    )

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
                            task_reflection,
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
                    yield _sse_event(
                        "error",
                        {
                            "type": "error",
                            "taskId": task_id,
                            "error": f"Failed to update task status: {e}",
                        },
                    )

            # Update session status to completed
            await session_service.update_status(session_id, SessionStatus.COMPLETED)

            # Emit done event with summary
            yield _sse_event(
                "done",
                {
                    "type": "done",
                    "summary": {
                        "total": total_tasks,
                        "completed": completed_count,
                        "failed": failed_count,
                    },
                },
            )

        except Exception as e:
            yield _sse_event(
                "error",
                {"type": "error", "error": str(e)},
            )

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
