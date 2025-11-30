# Testing Plan for Libra

## Goals
- **Target coverage**: ~40% on business logic
- **Depth**: Unit tests + light integration tests
- **Time budget**: A few hours
- **Focus**: Demonstrate testing competency for technical interview

---

## Backend Test Setup

### 1. Configure pytest
Add to `backend/pyproject.toml`:
```toml
[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
```

### 2. Install additional test dependencies
```bash
uv add --dev pytest-mock httpx
```

### 3. Test Structure
```
backend/tests/
├── conftest.py              # Shared fixtures (mock supabase, LLM, async helpers)
├── unit/
│   ├── test_task_service.py    # Task state machine
│   ├── test_planning_graph.py  # Planning graph nodes
│   ├── test_execution_graph.py # Execution graph nodes + routing
│   └── tools/
│       ├── test_calculator.py  # Calculator tool
│       └── test_datetime.py    # Date/time tools
└── integration/
    └── test_sessions_api.py    # Session CRUD endpoints
```

---

## Backend Tests (Priority Order)

### Unit Test 1: Task Service State Machine
**File**: `tests/unit/test_task_service.py`
**Why**: Core business logic with clear state transitions (pending → in_progress → done/failed)

Test cases:
- `test_start_task_from_pending` - valid transition
- `test_start_task_already_in_progress` - should raise error
- `test_complete_task_from_in_progress` - valid transition
- `test_complete_task_from_pending` - should raise error (invalid)
- `test_fail_task_from_in_progress` - valid transition
- `test_get_pending_tasks_ordered` - verify order_index sorting

### Unit Test 2: Planning Graph Nodes
**File**: `tests/unit/test_planning_graph.py`
**Why**: Core agent logic for chat and task extraction

Test cases:
- `test_chat_node_returns_ai_message` - verifies LLM response added to messages
- `test_chat_node_uses_execution_summary_prompt` - detects "[EXECUTION COMPLETE]" marker
- `test_chat_node_uses_chat_prompt_by_default` - normal chat flow
- `test_task_extraction_returns_tasks_when_ready` - structured output parsing
- `test_task_extraction_returns_empty_when_not_ready` - ready_to_create_tasks=false

Mocking approach:
- Mock `ChatOpenAI.invoke()` to return canned AI responses
- Mock `with_structured_output()` chain for task extraction

### Unit Test 3: Execution Graph Routing & Nodes
**File**: `tests/unit/test_execution_graph.py`
**Why**: Critical task execution logic and decision flow

Test cases:
- `test_should_continue_returns_tools_when_tool_calls` - routing with tool_calls
- `test_should_continue_returns_reflect_when_no_tools` - routing to reflection
- `test_agent_node_adds_system_prompt_on_first_call` - prompt injection
- `test_reflection_node_extracts_result` - structured TaskResult output
- `test_artifact_creator_creates_artifact_when_appropriate` - artifact creation
- `test_artifact_creator_skips_when_no_result` - empty result handling
- `test_format_messages_truncates_long_output` - helper function

Mocking approach:
- Mock LLMs with canned responses
- Mock `artifact_service.create()` for artifact tests
- Test routing functions directly with mock states

### Unit Test 4: Calculator Tool
**File**: `tests/unit/tools/test_calculator.py`
**Why**: Pure function, easy to test, demonstrates tool testing pattern

Test cases:
- `test_basic_arithmetic` - addition, subtraction, multiplication, division
- `test_complex_expressions` - parentheses, multiple operators
- `test_mathematical_functions` - sqrt, sin, cos, etc.
- `test_invalid_expression` - error handling

### Unit Test 5: DateTime Tools
**File**: `tests/unit/tools/test_datetime.py`
**Why**: Pure functions with edge cases

Test cases:
- `test_format_date_various_formats`
- `test_calculate_date_difference`
- `test_add_time_to_date`
- `test_get_day_of_week`

### Integration Test 1: Sessions API
**File**: `tests/integration/test_sessions_api.py`
**Why**: Shows understanding of FastAPI testing with TestClient

Test cases:
- `test_create_session`
- `test_get_session`
- `test_list_sessions`
- `test_delete_session`

---

## Frontend Test Setup

### 1. Install Vitest and React Testing Library
```bash
pnpm add -D vitest @testing-library/react @testing-library/jest-dom jsdom @testing-library/user-event
```

### 2. Configure Vitest
Create `frontend/vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './app/test/setup.ts',
  },
  resolve: {
    alias: {
      '@': '/app',
    },
  },
})
```

### 3. Test Structure
```
frontend/app/test/
├── setup.ts                    # Jest-dom matchers, global mocks
└── __tests__/
    ├── hooks/
    │   └── useSSE.test.ts      # SSE hook unit tests
    ├── services/
    │   └── api.test.ts         # API client tests
    └── lib/
        └── error-handler.test.ts  # Error utilities
```

---

## Frontend Tests (Priority Order)

### Unit Test 1: useSSE Hook
**File**: `app/test/__tests__/hooks/useSSE.test.ts`
**Why**: Most complex business logic, demonstrates async testing skills

Test cases:
- `test_connect_establishes_connection` - verify fetch called with correct params
- `test_disconnect_aborts_connection` - cleanup behavior
- `test_parses_single_sse_event` - basic event parsing
- `test_parses_multiple_events` - buffer handling
- `test_handles_incomplete_json` - edge case
- `test_error_callback_on_failure` - error handling

### Unit Test 2: ApiClient
**File**: `app/test/__tests__/services/api.test.ts`
**Why**: Straightforward mocking, shows HTTP testing pattern

Test cases:
- `test_list_sessions` - GET request
- `test_create_session` - POST with body
- `test_get_session` - GET with path param
- `test_delete_session` - DELETE request
- `test_handles_api_error` - error response handling

### Unit Test 3: Error Handler Utilities
**File**: `app/test/__tests__/lib/error-handler.test.ts`
**Why**: Pure functions, easy wins

Test cases:
- `test_isApiError_type_guard`
- `test_getErrorMessage_from_api_error`
- `test_getErrorMessage_from_error_object`
- `test_getErrorMessage_from_string`
- `test_getErrorMessage_fallback`

---

## Shared Test Utilities

### Backend: `conftest.py`
```python
import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from langchain_core.messages import AIMessage

@pytest.fixture
def mock_supabase():
    """Mock Supabase client for testing"""
    mock = MagicMock()
    mock.table.return_value = mock
    mock.select.return_value = mock
    mock.insert.return_value = mock
    mock.update.return_value = mock
    mock.delete.return_value = mock
    mock.eq.return_value = mock
    mock.execute = AsyncMock()
    return mock

@pytest.fixture
def mock_chat_llm():
    """Mock ChatOpenAI for testing graph nodes"""
    mock = MagicMock()
    mock.invoke.return_value = AIMessage(content="Test response")
    return mock

@pytest.fixture
def mock_structured_llm():
    """Mock structured output LLM"""
    mock = MagicMock()
    return mock
```

### Frontend: `setup.ts`
```typescript
import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock fetch globally
global.fetch = vi.fn()

// Reset mocks between tests
beforeEach(() => {
  vi.clearAllMocks()
})
```

---

## Implementation Order

1. **Backend setup** (10 min)
   - Add pytest config to pyproject.toml
   - Create tests/ directory structure
   - Create conftest.py with fixtures

2. **Backend unit tests - Services & Tools** (30 min)
   - test_task_service.py
   - test_calculator.py
   - test_datetime.py

3. **Backend unit tests - Graph Logic** (40 min)
   - test_planning_graph.py
   - test_execution_graph.py

4. **Backend integration test** (15 min)
   - test_sessions_api.py

5. **Frontend setup** (15 min)
   - Install Vitest + RTL
   - Create vitest.config.ts
   - Create setup.ts

6. **Frontend unit tests** (45 min)
   - error-handler.test.ts (easiest)
   - api.test.ts
   - useSSE.test.ts (most complex)

---

## Critical Files to Read Before Implementation

### Backend
- `backend/app/services/task_service.py` - state machine logic
- `backend/app/agent/graph.py` - planning graph nodes
- `backend/app/agent/execution_graph.py` - execution graph nodes & routing
- `backend/app/agent/tools/calculator.py` - pure function
- `backend/app/agent/tools/datetime_tool.py` - date functions
- `backend/app/api/sessions.py` - endpoint structure

### Frontend
- `frontend/app/hooks/useSSE.ts` - SSE parsing logic
- `frontend/app/services/api.ts` - HTTP client
- `frontend/app/lib/error-handler.ts` - error utilities

---

## Expected Outcome

| Area | Tests | Coverage Focus |
|------|-------|----------------|
| Backend Services | 6-8 tests | Task state machine |
| Backend Graph | 10-12 tests | Planning + Execution nodes, routing |
| Backend Tools | 8-10 tests | Calculator, datetime |
| Backend API | 4 tests | Session CRUD |
| Frontend Hooks | 6 tests | useSSE |
| Frontend Services | 5 tests | ApiClient |
| Frontend Utils | 5 tests | Error handling |

**Total**: ~45-50 tests demonstrating:
- Unit testing with mocks
- LangGraph node testing with mocked LLMs
- Integration testing with test client
- Async/streaming test patterns
- Error handling coverage
