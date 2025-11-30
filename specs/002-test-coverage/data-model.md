# Data Model: Test Coverage

**Feature**: 002-test-coverage
**Date**: 2025-11-30

## Overview

This document defines the test fixtures, mock data structures, and test entities used across backend and frontend test suites.

## Backend Test Entities

### Mock Data Structures

#### Task Mock Data

```python
# Used in: test_task_service.py

MOCK_TASK_PENDING = {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "session_id": "123e4567-e89b-12d3-a456-426614174001",
    "title": "Research Python testing",
    "description": "Find best practices for pytest",
    "order": 0,
    "status": "pending",
    "result": None,
    "reflection": None,
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-01-01T00:00:00Z",
}

MOCK_TASK_IN_PROGRESS = {
    **MOCK_TASK_PENDING,
    "status": "in_progress",
}

MOCK_TASK_DONE = {
    **MOCK_TASK_PENDING,
    "status": "done",
    "result": "Found pytest best practices",
    "reflection": "Task completed successfully",
}

MOCK_TASK_FAILED = {
    **MOCK_TASK_PENDING,
    "status": "failed",
    "result": "Error: API unavailable",
}
```

#### Session Mock Data

```python
# Used in: test_sessions_api.py

MOCK_SESSION = {
    "id": "123e4567-e89b-12d3-a456-426614174001",
    "title": "Test Session",
    "status": "planning",
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-01-01T00:00:00Z",
}
```

#### LLM Response Mock Data

```python
# Used in: test_planning_graph.py, test_execution_graph.py

from langchain_core.messages import AIMessage

MOCK_CHAT_RESPONSE = AIMessage(content="I'll help you plan that task.")

MOCK_EXECUTION_SUMMARY_RESPONSE = AIMessage(
    content="Here's a summary of what was accomplished."
)

MOCK_TOOL_CALL_RESPONSE = AIMessage(
    content="",
    tool_calls=[
        {"id": "call_1", "name": "web_search", "args": {"query": "test query"}}
    ],
)

# Structured output for task extraction
from app.agent.graph import TaskList, TaskItem

MOCK_TASK_LIST = TaskList(
    tasks=[
        TaskItem(title="Research options", description="Find available choices"),
        TaskItem(title="Compare prices", description=None),
    ],
    ready_to_create_tasks=True,
)

MOCK_EMPTY_TASK_LIST = TaskList(
    tasks=[],
    ready_to_create_tasks=False,
)
```

### Fixture Definitions

#### conftest.py Structure

```python
# backend/tests/conftest.py

import pytest
from unittest.mock import MagicMock, patch
from langchain_core.messages import AIMessage

# === Supabase Fixtures ===

@pytest.fixture
def mock_supabase():
    """Mock Supabase client with fluent API support."""
    mock = MagicMock()
    mock.table.return_value = mock
    mock.select.return_value = mock
    mock.insert.return_value = mock
    mock.update.return_value = mock
    mock.delete.return_value = mock
    mock.eq.return_value = mock
    mock.order.return_value = mock
    mock.limit.return_value = mock
    mock.execute.return_value = MagicMock(data=[])
    return mock

# === LLM Fixtures ===

@pytest.fixture
def mock_chat_llm():
    """Mock ChatOpenAI for chat responses."""
    with patch("app.agent.graph.ChatOpenAI") as mock:
        mock.return_value.invoke = MagicMock(
            return_value=AIMessage(content="Test response")
        )
        yield mock

@pytest.fixture
def mock_structured_llm():
    """Mock ChatOpenAI with structured output."""
    with patch("app.agent.graph.ChatOpenAI") as mock:
        structured_mock = MagicMock()
        mock.return_value.with_structured_output.return_value = structured_mock
        yield mock, structured_mock

# === Data Fixtures ===

@pytest.fixture
def mock_task_pending():
    """Task in pending state."""
    return MOCK_TASK_PENDING.copy()

@pytest.fixture
def mock_task_in_progress():
    """Task in in_progress state."""
    return MOCK_TASK_IN_PROGRESS.copy()

@pytest.fixture
def mock_session():
    """Session mock data."""
    return MOCK_SESSION.copy()
```

## Frontend Test Entities

### Mock Data Structures

#### API Response Mocks

```typescript
// Used in: api.test.ts

export const MOCK_SESSION = {
  id: '123e4567-e89b-12d3-a456-426614174001',
  title: 'Test Session',
  status: 'planning',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

export const MOCK_SESSIONS_LIST = [
  MOCK_SESSION,
  { ...MOCK_SESSION, id: '123e4567-e89b-12d3-a456-426614174002', title: 'Session 2' },
];

export const MOCK_API_ERROR = {
  detail: 'Not found',
  status_code: 404,
};
```

#### SSE Event Mocks

```typescript
// Used in: useSSE.test.ts

export const MOCK_SSE_TASK_STARTED = 'event: task_started\ndata: {"taskId":"task-1"}\n\n';

export const MOCK_SSE_TOOL_CALL = 'event: tool_call\ndata: {"tool":"web_search","input":{"query":"test"}}\n\n';

export const MOCK_SSE_CONTENT = 'event: content\ndata: {"taskId":"task-1","content":"Result text"}\n\n';

export const MOCK_SSE_COMPLETE = 'event: task_completed\ndata: {"taskId":"task-1","status":"done"}\n\n';

export const MOCK_SSE_MULTIPLE_EVENTS = [
  MOCK_SSE_TASK_STARTED,
  MOCK_SSE_TOOL_CALL,
  MOCK_SSE_CONTENT,
  MOCK_SSE_COMPLETE,
].join('');
```

### Test Utilities

#### setup.ts Structure

```typescript
// frontend/app/test/setup.ts

import '@testing-library/jest-dom';
import { vi, beforeEach, afterEach } from 'vitest';

// Reset mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// Mock fetch globally (can be overridden per test)
global.fetch = vi.fn();

// Mock ResizeObserver (required for some UI components)
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));
```

## State Transitions Under Test

### Task State Machine

```
         ┌──────────────────────────────────────┐
         │                                      │
         v                                      │
    ┌─────────┐    start()    ┌─────────────┐  │
    │ pending │──────────────>│ in_progress │  │
    └─────────┘               └─────────────┘  │
                                    │          │
                     ┌──────────────┼──────────┘
                     │              │
              complete()        fail()
                     │              │
                     v              v
                ┌────────┐    ┌────────┐
                │  done  │    │ failed │
                └────────┘    └────────┘
```

### Valid Transitions (to test)

| From | To | Method | Test |
|------|-----|--------|------|
| pending | in_progress | `start_task()` | `test_start_task_from_pending` |
| in_progress | done | `complete_task()` | `test_complete_task_from_in_progress` |
| in_progress | failed | `fail_task()` | `test_fail_task_from_in_progress` |

### Invalid Transitions (to test)

| From | To | Should | Test |
|------|-----|--------|------|
| in_progress | in_progress | Raise ValueError | `test_start_already_in_progress_raises` |
| pending | done | Raise ValueError | `test_complete_from_pending_raises` |
| done | * | Raise ValueError | `test_modify_completed_task_raises` |

## Agent Graph Routing Under Test

### Planning Graph Flow

```
Entry → chat → extract_tasks → END
```

### Execution Graph Flow

```
Entry → agent ─┬─ (has tool_calls) → tools → agent
               │
               └─ (no tool_calls) → reflect → artifact_creator → END
```

### Routing Conditions (to test)

| Condition | Route | Test |
|-----------|-------|------|
| `AIMessage.tool_calls` is not empty | `"tools"` | `test_should_continue_returns_tools` |
| `AIMessage.tool_calls` is empty | `"reflect"` | `test_should_continue_returns_reflect` |
| Message contains "[EXECUTION COMPLETE]" | Use summary prompt | `test_uses_execution_summary_prompt` |
