# Implementation Plan: Comprehensive Test Coverage

**Branch**: `002-test-coverage` | **Date**: 2025-11-30 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-test-coverage/spec.md`

## Summary

Implement comprehensive test coverage for the Libra application, targeting ~40% coverage on business logic. This includes backend tests (pytest with pytest-asyncio) for task service state machine, agent graph nodes, and tools, plus frontend tests (Vitest with React Testing Library) for hooks, services, and utilities. Tests will use mocked dependencies for deterministic, isolated execution.

## Technical Context

**Language/Version**: Python 3.13 (backend), TypeScript 5.x (frontend)
**Primary Dependencies**: pytest, pytest-asyncio, pytest-mock, httpx (backend); Vitest, @testing-library/react, @testing-library/jest-dom (frontend)
**Storage**: N/A (tests use mocks, not real database)
**Testing**: pytest (backend), Vitest (frontend)
**Target Platform**: Linux/macOS development environment
**Project Type**: Web application (backend + frontend)
**Performance Goals**: All tests complete in under 2 minutes total
**Constraints**: Tests must be isolated, deterministic, no flaky tests
**Scale/Scope**: ~45-50 tests covering 40% of business logic

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Real-Time UX | [x] N/A | Testing infrastructure, not user-facing |
| II. Agent State Reliability | [x] N/A | Testing infrastructure, not state management |
| III. Strict Type Safety | [x] Pass | Tests will have type hints, use typed mocks |
| IV. Clean API Contracts | [x] N/A | Testing infrastructure, not API design |
| V. Simplicity First | [x] Pass | Direct testing without abstraction layers |
| VI. Test-Driven Development | [x] Pass | This feature implements TDD infrastructure |

## Project Structure

### Documentation (this feature)

```text
specs/002-test-coverage/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (test entities)
├── quickstart.md        # Phase 1 output (test running guide)
├── contracts/           # N/A (no API contracts for tests)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
backend/
├── app/
│   ├── agent/           # Code under test (graph.py, execution_graph.py, tools/)
│   ├── services/        # Code under test (task_service.py)
│   └── api/             # Code under test (sessions.py)
└── tests/
    ├── conftest.py      # Shared fixtures (mock supabase, LLM, async helpers)
    ├── unit/
    │   ├── test_task_service.py
    │   ├── test_planning_graph.py
    │   ├── test_execution_graph.py
    │   └── tools/
    │       ├── test_calculator.py
    │       └── test_datetime.py
    └── integration/
        └── test_sessions_api.py

frontend/app/
├── hooks/
│   ├── useSSE.ts                # Source
│   └── useSSE.test.ts           # Test (co-located)
├── services/
│   ├── api.ts                   # Source
│   └── api.test.ts              # Test (co-located)
├── lib/
│   ├── error-handler.ts         # Source
│   └── error-handler.test.ts    # Test (co-located)
└── test/
    ├── setup.ts                 # Vitest setup (jest-dom matchers, global mocks)
    └── integration/             # Integration tests
        └── session-flow.test.ts
```

**Structure Decision**: Backend uses centralized tests/ folder; frontend uses co-located tests (`.test.ts` alongside source) with integration tests in `app/test/integration/` per frontend-test-dev.md conventions.

## Complexity Tracking

> No violations - all principles pass or are N/A for this testing infrastructure feature.
