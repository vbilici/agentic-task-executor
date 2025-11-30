"""Task service for CRUD operations."""

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
        return Task(**result.data[0])

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
        return [Task(**row) for row in result.data]

    async def get(self, task_id: UUID) -> Task | None:
        """Get a task by ID."""
        result = (
            self.client.table(self.table).select("*").eq("id", str(task_id)).execute()
        )
        if not result.data:
            return None
        return Task(**result.data[0])

    async def list_by_session(self, session_id: UUID) -> list[Task]:
        """List all tasks for a session, ordered by order field."""
        result = (
            self.client.table(self.table)
            .select("*")
            .eq("session_id", str(session_id))
            .order("order")
            .execute()
        )
        return [Task(**row) for row in result.data]

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
        if not result.data:
            return None
        return Task(**result.data[0])

    async def update_status(
        self,
        task_id: UUID,
        status: TaskStatus,
        result_text: str | None = None,
        reflection: str | None = None,
    ) -> Task | None:
        """Update task status with optional result and reflection."""
        data: dict[str, str] = {"status": status.value}
        if result_text is not None:
            data["result"] = result_text
        if reflection is not None:
            data["reflection"] = reflection

        result = (
            self.client.table(self.table).update(data).eq("id", str(task_id)).execute()
        )
        if not result.data:
            return None
        return Task(**result.data[0])

    async def delete_by_session(self, session_id: UUID) -> int:
        """Delete all tasks for a session."""
        result = (
            self.client.table(self.table)
            .delete()
            .eq("session_id", str(session_id))
            .execute()
        )
        return len(result.data)

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
        if not result.data:
            return 0
        return int(result.data[0]["order"]) + 1


# Singleton instance
task_service = TaskService()
