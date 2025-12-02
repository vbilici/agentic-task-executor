"""Task service for CRUD operations."""

from typing import Any, cast
from uuid import UUID

from app.core.database import get_supabase_client
from app.models.base import TaskStatus
from app.models.task import Task, TaskCreate, TaskUpdate


class TaskService:
    """Service for task CRUD operations."""

    def __init__(self) -> None:
        self.client = get_supabase_client()
        self.table = "tasks"

    async def create(self, task: TaskCreate) -> Task:
        """Create a new task."""
        data = {
            "session_id": str(task.session_id),
            "title": task.title,
            "description": task.description,
            "order": task.order,
            "status": TaskStatus.PENDING.value,
        }
        result = self.client.table(self.table).insert(data).execute()
        rows = cast(list[dict[str, Any]], result.data)
        return Task(**rows[0])

    async def create_many(self, tasks: list[TaskCreate]) -> list[Task]:
        """Create multiple tasks at once."""
        data = [
            {
                "session_id": str(t.session_id),
                "title": t.title,
                "description": t.description,
                "order": t.order,
                "status": TaskStatus.PENDING.value,
            }
            for t in tasks
        ]
        result = self.client.table(self.table).insert(data).execute()
        rows = cast(list[dict[str, Any]], result.data)
        return [Task(**row) for row in rows]

    async def get(self, task_id: UUID) -> Task | None:
        """Get a task by ID."""
        result = (
            self.client.table(self.table).select("*").eq("id", str(task_id)).execute()
        )
        rows = cast(list[dict[str, Any]], result.data)
        if not rows:
            return None
        return Task(**rows[0])

    async def list_by_session(self, session_id: UUID) -> list[Task]:
        """List all tasks for a session, ordered by order field."""
        result = (
            self.client.table(self.table)
            .select("*")
            .eq("session_id", str(session_id))
            .order("order")
            .execute()
        )
        rows = cast(list[dict[str, Any]], result.data)
        return [Task(**row) for row in rows]

    async def update(self, task_id: UUID, update: TaskUpdate) -> Task | None:
        """Update a task."""
        data: dict[str, str | int | None] = {}
        update_dict = update.model_dump(exclude_unset=True)

        for key, value in update_dict.items():
            if value is not None:
                if key == "status":
                    data[key] = value.value
                else:
                    data[key] = value

        if not data:
            return await self.get(task_id)

        result = (
            self.client.table(self.table).update(data).eq("id", str(task_id)).execute()
        )
        rows = cast(list[dict[str, Any]], result.data)
        if not rows:
            return None
        return Task(**rows[0])

    async def update_status(
        self,
        task_id: UUID,
        status: TaskStatus,
        result_text: str | None = None,
    ) -> Task | None:
        """Update task status with optional result."""
        data: dict[str, str] = {"status": status.value}
        if result_text is not None:
            data["result"] = result_text

        result = (
            self.client.table(self.table).update(data).eq("id", str(task_id)).execute()
        )
        rows = cast(list[dict[str, Any]], result.data)
        if not rows:
            return None
        return Task(**rows[0])

    async def delete_by_session(self, session_id: UUID) -> int:
        """Delete all tasks for a session."""
        result = (
            self.client.table(self.table)
            .delete()
            .eq("session_id", str(session_id))
            .execute()
        )
        rows = cast(list[dict[str, Any]], result.data)
        return len(rows)

    async def get_next_order(self, session_id: UUID) -> int:
        """Get the next order number for a session."""
        result = (
            self.client.table(self.table)
            .select("order")
            .eq("session_id", str(session_id))
            .order("order", desc=True)
            .limit(1)
            .execute()
        )
        rows = cast(list[dict[str, Any]], result.data)
        if not rows:
            return 0
        return int(rows[0]["order"]) + 1

    async def get_pending_tasks(self, session_id: UUID) -> list[Task]:
        """Get all pending tasks for a session, ordered by order field."""
        result = (
            self.client.table(self.table)
            .select("*")
            .eq("session_id", str(session_id))
            .eq("status", TaskStatus.PENDING.value)
            .order("order")
            .execute()
        )
        rows = cast(list[dict[str, Any]], result.data)
        return [Task(**row) for row in rows]

    async def get_resumable_tasks(self, session_id: UUID) -> list[Task]:
        """Get tasks that need execution when resuming: in_progress first, then pending.

        Used when resuming from a paused session. In-progress tasks were interrupted
        mid-execution and will resume from their LangGraph checkpoint. Pending tasks
        will start fresh.
        """
        result = (
            self.client.table(self.table)
            .select("*")
            .eq("session_id", str(session_id))
            .in_("status", [TaskStatus.IN_PROGRESS.value, TaskStatus.PENDING.value])
            .order("order")
            .execute()
        )
        rows = cast(list[dict[str, Any]], result.data)
        return [Task(**row) for row in rows]

    async def start_task(self, task_id: UUID) -> Task:
        """Start a task - changes status from pending to in_progress.

        Also allows resuming a task that is already in_progress (from a paused session).

        Args:
            task_id: The task UUID to start

        Returns:
            The updated task

        Raises:
            ValueError: If task not found or invalid status transition
        """
        task = await self.get(task_id)
        if not task:
            raise ValueError(f"Task {task_id} not found")

        # Allow starting from pending, or resuming from in_progress (paused session)
        if task.status == TaskStatus.IN_PROGRESS:
            # Task is already in progress (resuming from pause), return as-is
            return task

        if task.status != TaskStatus.PENDING:
            raise ValueError(
                f"Cannot start task: current status is {task.status.value}, "
                "expected 'pending' or 'in_progress'"
            )

        result = (
            self.client.table(self.table)
            .update({"status": TaskStatus.IN_PROGRESS.value})
            .eq("id", str(task_id))
            .execute()
        )
        rows = cast(list[dict[str, Any]], result.data)
        return Task(**rows[0])

    async def complete_task(
        self,
        task_id: UUID,
        result_text: str,
    ) -> Task:
        """Complete a task - changes status from in_progress to done.

        Args:
            task_id: The task UUID to complete
            result_text: The result/output of the task execution

        Returns:
            The updated task

        Raises:
            ValueError: If task not found or invalid status transition
        """
        task = await self.get(task_id)
        if not task:
            raise ValueError(f"Task {task_id} not found")

        if task.status != TaskStatus.IN_PROGRESS:
            raise ValueError(
                f"Cannot complete task: current status is {task.status.value}, "
                "expected 'in_progress'"
            )

        data: dict[str, str] = {
            "status": TaskStatus.DONE.value,
            "result": result_text,
        }

        result = (
            self.client.table(self.table).update(data).eq("id", str(task_id)).execute()
        )
        rows = cast(list[dict[str, Any]], result.data)
        return Task(**rows[0])

    async def fail_task(
        self,
        task_id: UUID,
        error: str,
    ) -> Task:
        """Fail a task - changes status from in_progress to failed.

        Args:
            task_id: The task UUID to fail
            error: The error message describing why the task failed

        Returns:
            The updated task

        Raises:
            ValueError: If task not found or invalid status transition
        """
        task = await self.get(task_id)
        if not task:
            raise ValueError(f"Task {task_id} not found")

        if task.status != TaskStatus.IN_PROGRESS:
            raise ValueError(
                f"Cannot fail task: current status is {task.status.value}, "
                "expected 'in_progress'"
            )

        result = (
            self.client.table(self.table)
            .update(
                {
                    "status": TaskStatus.FAILED.value,
                    "result": error,
                }
            )
            .eq("id", str(task_id))
            .execute()
        )
        rows = cast(list[dict[str, Any]], result.data)
        return Task(**rows[0])


# Singleton instance
task_service = TaskService()
