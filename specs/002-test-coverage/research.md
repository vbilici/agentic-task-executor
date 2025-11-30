# Research: Comprehensive Test Coverage

**Feature**: 002-test-coverage
**Date**: 2025-11-30

## Technology Decisions

### 1. Backend Testing Framework

**Decision**: Use pytest with pytest-asyncio for all backend tests

**Rationale**:
- pytest is the de facto standard for Python testing
- pytest-asyncio required for testing async service methods
- pytest-mock provides clean mocking patterns
- httpx required for async API testing with FastAPI's TestClient alternative

**Alternatives Considered**:
- unittest: More verbose, less flexible fixtures, no native async support
- nose2: Less active community, fewer plugins

**Key Implementation**:

```python
# pyproject.toml additions
[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]

# Dev dependencies needed
# uv add --dev pytest-mock httpx
```

### 2. Frontend Testing Framework

**Decision**: Use Vitest with React Testing Library

**Rationale**:
- Vitest is Vite-native, faster than Jest for Vite projects
- React Testing Library encourages testing behavior over implementation
- @testing-library/jest-dom provides useful DOM matchers
- userEvent for realistic user interaction simulation

**Alternatives Considered**:
- Jest: Slower with Vite, requires additional configuration
- Playwright: Overkill for unit tests, better suited for E2E

**Key Implementation**:

```typescript
// vitest.config.ts (already exists, verify settings)
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './app/test/setup.ts',
  },
})
```

### 3. Mocking Strategy for LLM Calls

**Decision**: Mock ChatOpenAI at module level with deterministic responses

**Rationale**:
- LLM calls are non-deterministic and expensive
- Mocking at module level provides full control over responses
- Structured output mocks must match Pydantic model schemas

**Key Implementation**:

```python
from unittest.mock import MagicMock, patch
from langchain_core.messages import AIMessage

@pytest.fixture
def mock_chat_llm():
    """Mock ChatOpenAI for deterministic testing."""
    with patch("app.agent.graph.ChatOpenAI") as mock:
        mock.return_value.invoke = MagicMock(
            return_value=AIMessage(content="Test response")
        )
        yield mock

@pytest.fixture
def mock_structured_llm():
    """Mock structured output LLM."""
    with patch("app.agent.graph.ChatOpenAI") as mock:
        mock.return_value.with_structured_output.return_value.invoke = MagicMock(
            return_value=TaskList(tasks=[], ready_to_create_tasks=False)
        )
        yield mock
```

### 4. Database Mocking Strategy

**Decision**: Mock Supabase client with synchronous MagicMock

**Rationale**:
- Supabase Python SDK is synchronous (not async)
- Service methods are declared `async` but `.execute()` is not awaited
- Unit tests should not touch real database
- Fluent API requires chained mocks

**Key Implementation**:

```python
from unittest.mock import MagicMock
from app.models.task import Task
from app.models.base import TaskStatus

@pytest.fixture
def mock_supabase():
    """Mock Supabase client with fluent API support.

    Note: Supabase Python SDK is synchronous - execute() returns directly,
    not a coroutine. The service methods are async but don't await Supabase calls.
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
    # execute() returns APIResponse with .data attribute (sync, not async)
    mock.execute.return_value = MagicMock(data=[])
    return mock

@pytest.fixture
def mock_task_data():
    """Sample task data for testing."""
    return {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "session_id": "123e4567-e89b-12d3-a456-426614174001",
        "title": "Test task",
        "description": None,
        "order": 0,
        "status": "pending",
        "result": None,
        "reflection": None,
        "created_at": "2025-01-01T00:00:00Z",
        "updated_at": "2025-01-01T00:00:00Z",
    }
```

### 5. SSE Hook Testing Pattern

**Decision**: Mock fetch with ReadableStream for SSE testing

**Rationale**:
- useSSE uses fetch API, not EventSource
- ReadableStream simulation required for streaming tests
- TextDecoder needed for chunk parsing

**Key Implementation**:

```typescript
// Mock fetch for SSE
const mockFetch = vi.fn().mockResolvedValue({
  ok: true,
  body: new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('event: message\ndata: {"type":"test"}\n\n'));
      controller.close();
    },
  }),
});
global.fetch = mockFetch;
```

### 6. Test File Organization

**Decision**: Co-located tests for frontend, centralized tests/ for backend

**Rationale**:
- Frontend: Co-located tests (`.test.ts` alongside source) improve discoverability
- Backend: Centralized tests/ folder is Python convention and keeps app/ clean
- Integration tests in dedicated folders for both

**Frontend Structure** (per frontend-test-dev.md):
```
frontend/app/
├── hooks/
│   ├── useSSE.ts           # Source
│   └── useSSE.test.ts      # Test (co-located)
├── services/
│   ├── api.ts
│   └── api.test.ts
├── lib/
│   ├── error-handler.ts
│   └── error-handler.test.ts
└── test/
    ├── setup.ts            # Vitest setup
    └── integration/        # Integration tests
```

**Backend Structure**:
```
backend/tests/
├── conftest.py             # Shared fixtures
├── unit/
│   ├── test_task_service.py
│   ├── test_planning_graph.py
│   ├── test_execution_graph.py
│   └── tools/
└── integration/
    └── test_sessions_api.py
```

### 7. Test Organization Pattern

**Decision**: Group tests by module with describe blocks / test classes

**Rationale**:
- Mirrors source structure for easy navigation
- Test classes/describe blocks group related scenarios
- Parametrized tests reduce duplication

**Backend Pattern**:
```python
class TestTaskServiceStateTransitions:
    """Test task state machine transitions."""

    @pytest.mark.asyncio
    async def test_start_task_from_pending(self, mock_supabase, mock_task_data):
        """Valid: pending → in_progress."""
        pass

    @pytest.mark.asyncio
    async def test_start_task_already_in_progress_raises(self, mock_supabase):
        """Invalid: in_progress → in_progress should raise."""
        pass

class TestTaskServiceErrors:
    """Test error handling."""

    @pytest.mark.asyncio
    async def test_start_nonexistent_task_raises(self, mock_supabase):
        pass
```

**Frontend Pattern**:
```typescript
describe('useSSE', () => {
  describe('connection', () => {
    it('establishes connection on connect', () => {});
    it('aborts connection on disconnect', () => {});
  });

  describe('parsing', () => {
    it('parses single SSE event', () => {});
  });
});
```

## Package Dependencies

### Backend (additions to pyproject.toml)

```toml
[project.optional-dependencies]
dev = [
    "pytest>=8.0.0",
    "pytest-asyncio>=0.24.0",
    "pytest-mock>=3.14.0",
    "httpx>=0.28.0",
]

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
```

### Frontend (additions to package.json)

```json
{
  "devDependencies": {
    "vitest": "^2.1.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/jest-dom": "^6.6.0",
    "@testing-library/user-event": "^14.5.0",
    "jsdom": "^25.0.0"
  }
}
```

## Open Questions Resolved

| Question | Resolution |
|----------|------------|
| Backend test runner? | pytest with pytest-asyncio |
| Frontend test runner? | Vitest with React Testing Library |
| How to mock LLM calls? | Patch ChatOpenAI at module level with MagicMock |
| How to mock Supabase? | Sync MagicMock with fluent API chaining (SDK is not async) |
| How to test SSE hooks? | Mock fetch with ReadableStream |
| Test file location (frontend)? | Co-located with source files |
| Test file location (backend)? | Centralized tests/ folder |
| Integration test location? | backend/tests/integration/, frontend/app/test/integration/ |

## Sources

- [docs/testing-plan.md](../../docs/testing-plan.md) - Existing detailed testing plan
- [.claude/agents/backend-test-dev.md](../../.claude/agents/backend-test-dev.md) - Backend test agent patterns
- [.claude/agents/frontend-test-dev.md](../../.claude/agents/frontend-test-dev.md) - Frontend test agent patterns
- [Vitest Documentation](https://vitest.dev/)
- [pytest-asyncio Documentation](https://pytest-asyncio.readthedocs.io/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
