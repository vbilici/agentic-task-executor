# Quickstart: Running Tests

**Feature**: 002-test-coverage
**Date**: 2025-11-30

## Prerequisites

Ensure dependencies are installed:

```bash
# Backend
cd backend
uv sync

# Frontend
cd frontend
pnpm install
```

## Running Tests

### Backend Tests

```bash
cd backend

# Run all tests
uv run pytest

# Run with verbose output
uv run pytest -v

# Run specific test file
uv run pytest tests/unit/test_task_service.py

# Run specific test class
uv run pytest tests/unit/test_task_service.py::TestTaskServiceStateTransitions

# Run specific test
uv run pytest tests/unit/test_task_service.py::TestTaskServiceStateTransitions::test_start_task_from_pending

# Run with coverage
uv run pytest --cov=app --cov-report=term-missing
```

### Frontend Tests

```bash
cd frontend

# Run all tests
pnpm test

# Run in watch mode
pnpm test:watch

# Run specific test file
pnpm test app/hooks/useSSE.test.ts

# Run with coverage
pnpm test:coverage

# Run with UI
pnpm test:ui
```

## Test Structure

### Backend

```
backend/tests/
├── conftest.py              # Shared fixtures
├── unit/
│   ├── test_task_service.py    # Task state machine
│   ├── test_planning_graph.py  # Planning graph nodes
│   ├── test_execution_graph.py # Execution graph nodes
│   └── tools/
│       ├── test_calculator.py  # Calculator tool
│       └── test_datetime.py    # DateTime tools
└── integration/
    └── test_sessions_api.py    # Session API endpoints
```

### Frontend

```
frontend/app/
├── hooks/
│   └── useSSE.test.ts          # SSE hook tests
├── services/
│   └── api.test.ts             # API client tests
├── lib/
│   └── error-handler.test.ts   # Error utility tests
└── test/
    ├── setup.ts                # Test setup
    └── integration/            # Integration tests
```

## Writing New Tests

### Backend Pattern

```python
# tests/unit/test_example.py

import pytest
from unittest.mock import MagicMock, patch

class TestExampleSuccess:
    """Test successful operations."""

    @pytest.mark.asyncio
    async def test_operation_succeeds(self, mock_supabase):
        """Describe what this test verifies."""
        # Arrange
        mock_supabase.execute.return_value = MagicMock(data=[{"id": "123"}])

        # Act
        result = await some_service.operation()

        # Assert
        assert result is not None

class TestExampleErrors:
    """Test error handling."""

    @pytest.mark.asyncio
    async def test_operation_raises_on_invalid_input(self):
        """Describe the error condition."""
        with pytest.raises(ValueError, match="expected error message"):
            await some_service.operation(invalid_input)
```

### Frontend Pattern

```typescript
// app/example/example.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('ExampleComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders with required props', () => {
      render(<ExampleComponent title="Test" />);
      expect(screen.getByText('Test')).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('handles click events', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();

      render(<ExampleComponent onClick={onClick} />);
      await user.click(screen.getByRole('button'));

      expect(onClick).toHaveBeenCalledOnce();
    });
  });
});
```

## Common Fixtures

### Backend Fixtures (conftest.py)

| Fixture | Description | Usage |
|---------|-------------|-------|
| `mock_supabase` | Mocked Supabase client with fluent API | Database operations |
| `mock_chat_llm` | Mocked ChatOpenAI for chat | Planning/execution graph |
| `mock_structured_llm` | Mocked structured output LLM | Task extraction |
| `mock_task_pending` | Task in pending state | State transition tests |
| `mock_task_in_progress` | Task in in_progress state | State transition tests |
| `mock_session` | Session mock data | Session-related tests |

### Frontend Setup (setup.ts)

| Mock | Description |
|------|-------------|
| `global.fetch` | Mocked fetch for API/SSE tests |
| `global.ResizeObserver` | Required for UI components |

## Coverage Targets

| Area | Target | Focus |
|------|--------|-------|
| Backend business logic | ~40% | Task service, graph nodes |
| Frontend hooks/services | ~40% | useSSE, api client |
| Tools | High | Calculator, datetime (pure functions) |
| Integration | Light | Session CRUD |

## Troubleshooting

### Backend

**Problem**: `pytest-asyncio` not finding async tests
```bash
# Ensure pytest.ini_options is set
asyncio_mode = "auto"
```

**Problem**: Module not found errors
```bash
# Run from backend directory
cd backend
uv run pytest
```

### Frontend

**Problem**: JSX not recognized
```bash
# Ensure vitest.config.ts has react plugin
plugins: [react()]
```

**Problem**: Testing library matchers not available
```typescript
// Ensure setup.ts imports jest-dom
import '@testing-library/jest-dom';
```

## MCP Tool Usage (Per Constitution)

Per Principle VI (TDD), tests should be executed via MCP tools:

- **Backend**: Use `backend-test` MCP service
- **Frontend**: Use `frontend-test` MCP service

Direct pytest/vitest commands are for local development only.
