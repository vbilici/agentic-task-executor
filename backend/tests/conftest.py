"""Shared test fixtures for Libra backend tests."""

from unittest.mock import MagicMock, patch

import pytest

# Mock data constants
MOCK_SESSION_ID = "123e4567-e89b-12d3-a456-426614174001"
MOCK_TASK_ID = "123e4567-e89b-12d3-a456-426614174000"
MOCK_TIMESTAMP = "2025-01-01T00:00:00Z"


# === Supabase Fixtures ===


@pytest.fixture
def mock_supabase():
    """Mock Supabase client with fluent API support.

    Supabase Python SDK is synchronous - execute() returns directly,
    not a coroutine. Service methods are async but don't await Supabase calls.
    """
    mock = MagicMock()
    # Fluent API chaining
    mock.table.return_value = mock
    mock.select.return_value = mock
    mock.insert.return_value = mock
    mock.update.return_value = mock
    mock.delete.return_value = mock
    mock.eq.return_value = mock
    mock.order.return_value = mock
    mock.limit.return_value = mock
    # execute() returns APIResponse with .data attribute
    mock.execute.return_value = MagicMock(data=[])
    return mock


# === Task Data Fixtures ===


@pytest.fixture
def mock_task_pending():
    """Task in pending state."""
    return {
        "id": MOCK_TASK_ID,
        "session_id": MOCK_SESSION_ID,
        "title": "Test task",
        "description": "Test task description",
        "order": 0,
        "status": "pending",
        "result": None,
        "reflection": None,
        "created_at": MOCK_TIMESTAMP,
        "updated_at": MOCK_TIMESTAMP,
    }


@pytest.fixture
def mock_task_in_progress(mock_task_pending):
    """Task in in_progress state."""
    return {
        **mock_task_pending,
        "status": "in_progress",
    }


@pytest.fixture
def mock_task_done(mock_task_pending):
    """Task in done state with result."""
    return {
        **mock_task_pending,
        "status": "done",
        "result": "Task completed successfully",
        "reflection": "Task was straightforward",
    }


# === Session Fixtures ===


@pytest.fixture
def mock_session():
    """Session mock data."""
    return {
        "id": MOCK_SESSION_ID,
        "title": "Test Session",
        "status": "planning",
        "created_at": MOCK_TIMESTAMP,
        "updated_at": MOCK_TIMESTAMP,
    }


# === LLM Fixtures ===


@pytest.fixture
def mock_chat_llm():
    """Mock ChatOpenAI for chat responses.

    Patches langchain_openai.ChatOpenAI so tests don't make real API calls.
    """
    from langchain_core.messages import AIMessage

    with patch("langchain_openai.ChatOpenAI") as mock_class:
        mock_instance = MagicMock()
        mock_instance.invoke.return_value = AIMessage(content="Test response")
        mock_class.return_value = mock_instance
        yield mock_class


@pytest.fixture
def mock_structured_llm():
    """Mock ChatOpenAI with structured output for task extraction.

    Returns both the mock class and the structured output mock for configuration.
    """
    with patch("langchain_openai.ChatOpenAI") as mock_class:
        mock_instance = MagicMock()
        structured_mock = MagicMock()
        mock_instance.with_structured_output.return_value = structured_mock
        mock_class.return_value = mock_instance
        yield mock_class, structured_mock
