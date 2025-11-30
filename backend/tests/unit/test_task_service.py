"""Tests for TaskService state machine transitions."""

import pytest
from unittest.mock import MagicMock, patch
from uuid import UUID

from app.models.base import TaskStatus
from app.models.task import Task
from app.services.task_service import TaskService


class TestTaskServiceStateTransitions:
    """Test valid task state transitions."""

    @pytest.fixture
    def task_service(self, mock_supabase):
        """Create TaskService with mocked Supabase client."""
        with patch(
            "app.services.task_service.get_supabase_client", return_value=mock_supabase
        ):
            service = TaskService()
            yield service

    @pytest.mark.asyncio
    async def test_start_task_from_pending(
        self, task_service, mock_supabase, mock_task_pending
    ):
        """Valid: pending -> in_progress transition should succeed.

        Verifies that a task in 'pending' status can be started,
        transitioning to 'in_progress' status.
        """
        task_id = UUID(mock_task_pending["id"])

        # Setup: First call (get) returns pending task
        # Second call (update) returns in_progress task
        updated_task = {**mock_task_pending, "status": "in_progress"}
        mock_supabase.execute.side_effect = [
            MagicMock(data=[mock_task_pending]),  # get() call
            MagicMock(data=[updated_task]),  # update() call
        ]

        result = await task_service.start_task(task_id)

        assert result.status == TaskStatus.IN_PROGRESS

    @pytest.mark.asyncio
    async def test_complete_task_from_in_progress(
        self, task_service, mock_supabase, mock_task_in_progress
    ):
        """Valid: in_progress -> done transition should succeed.

        Verifies that a task in 'in_progress' status can be completed,
        transitioning to 'done' status with result text stored.
        """
        task_id = UUID(mock_task_in_progress["id"])
        result_text = "Task completed successfully"

        completed_task = {
            **mock_task_in_progress,
            "status": "done",
            "result": result_text,
        }

        mock_supabase.execute.side_effect = [
            MagicMock(data=[mock_task_in_progress]),  # get() call
            MagicMock(data=[completed_task]),  # update() call
        ]

        result = await task_service.complete_task(task_id, result_text)

        assert result.status == TaskStatus.DONE
        assert result.result == result_text

    @pytest.mark.asyncio
    async def test_fail_task_from_in_progress(
        self, task_service, mock_supabase, mock_task_in_progress
    ):
        """Valid: in_progress -> failed transition should succeed.

        Verifies that a task in 'in_progress' status can be failed,
        transitioning to 'failed' status with error message stored.
        """
        task_id = UUID(mock_task_in_progress["id"])
        error = "Something went wrong"

        failed_task = {
            **mock_task_in_progress,
            "status": "failed",
            "result": error,
        }

        mock_supabase.execute.side_effect = [
            MagicMock(data=[mock_task_in_progress]),  # get() call
            MagicMock(data=[failed_task]),  # update() call
        ]

        result = await task_service.fail_task(task_id, error)

        assert result.status == TaskStatus.FAILED
        assert result.result == error


class TestTaskServiceErrors:
    """Test invalid state transitions raise ValueError."""

    @pytest.fixture
    def task_service(self, mock_supabase):
        """Create TaskService with mocked Supabase client."""
        with patch(
            "app.services.task_service.get_supabase_client", return_value=mock_supabase
        ):
            service = TaskService()
            yield service

    @pytest.mark.asyncio
    async def test_start_already_in_progress_raises(
        self, task_service, mock_supabase, mock_task_in_progress
    ):
        """Invalid: in_progress -> in_progress should raise ValueError.

        Verifies that attempting to start a task that is already
        in progress raises a ValueError with appropriate message.
        """
        task_id = UUID(mock_task_in_progress["id"])

        mock_supabase.execute.return_value = MagicMock(data=[mock_task_in_progress])

        with pytest.raises(ValueError, match="expected 'pending'"):
            await task_service.start_task(task_id)

    @pytest.mark.asyncio
    async def test_complete_from_pending_raises(
        self, task_service, mock_supabase, mock_task_pending
    ):
        """Invalid: pending -> done should raise ValueError.

        Verifies that attempting to complete a task that is still
        pending raises a ValueError - tasks must be started first.
        """
        task_id = UUID(mock_task_pending["id"])

        mock_supabase.execute.return_value = MagicMock(data=[mock_task_pending])

        with pytest.raises(ValueError, match="expected 'in_progress'"):
            await task_service.complete_task(task_id, "result")

    @pytest.mark.asyncio
    async def test_modify_completed_task_raises(
        self, task_service, mock_supabase, mock_task_done
    ):
        """Invalid: done -> any should raise ValueError.

        Verifies that attempting to complete a task that is already
        done raises a ValueError - completed tasks are immutable.
        """
        task_id = UUID(mock_task_done["id"])

        mock_supabase.execute.return_value = MagicMock(data=[mock_task_done])

        with pytest.raises(ValueError, match="expected 'in_progress'"):
            await task_service.complete_task(task_id, "another result")


class TestTaskServiceQueries:
    """Test query methods."""

    @pytest.fixture
    def task_service(self, mock_supabase):
        """Create TaskService with mocked Supabase client."""
        with patch(
            "app.services.task_service.get_supabase_client", return_value=mock_supabase
        ):
            service = TaskService()
            yield service

    @pytest.mark.asyncio
    async def test_get_pending_tasks_ordered(
        self, task_service, mock_supabase, mock_task_pending
    ):
        """Returns pending tasks ordered by order field.

        Verifies that get_pending_tasks returns tasks filtered by
        pending status and ordered by the order field.
        """
        session_id = UUID(mock_task_pending["session_id"])

        task1 = {**mock_task_pending, "order": 0, "title": "First task"}
        task2 = {
            **mock_task_pending,
            "id": "123e4567-e89b-12d3-a456-426614174099",
            "order": 1,
            "title": "Second task",
        }

        mock_supabase.execute.return_value = MagicMock(data=[task1, task2])

        result = await task_service.get_pending_tasks(session_id)

        assert len(result) == 2
        assert result[0].title == "First task"
        assert result[1].title == "Second task"
        assert result[0].order == 0
        assert result[1].order == 1
