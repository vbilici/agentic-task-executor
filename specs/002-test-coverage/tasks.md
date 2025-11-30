# Tasks: Comprehensive Test Coverage

**Input**: Design documents from `/specs/002-test-coverage/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, quickstart.md

**Tests**: This feature IS about implementing tests, so all tasks are test-related by definition.

**Organization**: Tasks are grouped by user story from spec.md to enable independent implementation and verification.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Configure test frameworks and shared fixtures for both backend and frontend

- [ ] T001 Install backend test dependencies (pytest, pytest-asyncio, pytest-mock, httpx) via `uv add --dev` in backend/pyproject.toml
- [ ] T002 [P] Install frontend test dependencies (@testing-library/react, @testing-library/jest-dom, @testing-library/user-event, jsdom) via `pnpm add -D` in frontend/package.json
- [ ] T003 Configure pytest in backend/pyproject.toml with asyncio_mode="auto" and testpaths=["tests"]
- [ ] T004 [P] Configure Vitest in frontend/vite.config.ts with jsdom environment and setupFiles
- [ ] T005 Create backend/tests/ directory structure (conftest.py, unit/, integration/)
- [ ] T006 [P] Create frontend/app/test/setup.ts with jest-dom matchers and global mocks

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared fixtures and mock utilities that ALL user stories depend on

**CRITICAL**: All user stories depend on these fixtures being in place first

- [ ] T007 Create backend/tests/conftest.py with mock_supabase fixture (MagicMock with fluent API chaining)
- [ ] T008 [P] Create mock_task_pending, mock_task_in_progress, mock_task_done fixtures in backend/tests/conftest.py
- [ ] T009 [P] Create mock_session fixture in backend/tests/conftest.py
- [ ] T010 [P] Create mock_chat_llm fixture with patched ChatOpenAI in backend/tests/conftest.py
- [ ] T011 [P] Create mock_structured_llm fixture for task extraction in backend/tests/conftest.py
- [ ] T012 Add global fetch mock to frontend/app/test/setup.ts
- [ ] T013 [P] Add ResizeObserver mock to frontend/app/test/setup.ts

**Checkpoint**: Test infrastructure ready - user story test implementation can begin

---

## Phase 3: User Story 1 - Backend Service Tests (Priority: P1)

**Goal**: Unit tests for core business logic (task service state machine)

**Verification**: Use `backend-test` MCP tool to run tests/unit/test_task_service.py

### Implementation for User Story 1

- [ ] T014 [US1] Create backend/tests/unit/test_task_service.py file structure with TestTaskServiceStateTransitions class
- [ ] T015 [P] [US1] Implement test_start_task_from_pending (pending → in_progress) in backend/tests/unit/test_task_service.py
- [ ] T016 [P] [US1] Implement test_complete_task_from_in_progress (in_progress → done) in backend/tests/unit/test_task_service.py
- [ ] T017 [P] [US1] Implement test_fail_task_from_in_progress (in_progress → failed) in backend/tests/unit/test_task_service.py
- [ ] T018 [US1] Create TestTaskServiceErrors class in backend/tests/unit/test_task_service.py
- [ ] T019 [P] [US1] Implement test_start_already_in_progress_raises (invalid transition) in backend/tests/unit/test_task_service.py
- [ ] T020 [P] [US1] Implement test_complete_from_pending_raises (invalid transition) in backend/tests/unit/test_task_service.py
- [ ] T021 [P] [US1] Implement test_modify_completed_task_raises (terminal state) in backend/tests/unit/test_task_service.py
- [ ] T022 [US1] Create TestTaskServiceQueries class in backend/tests/unit/test_task_service.py
- [ ] T023 [US1] Implement test_get_pending_tasks_ordered in backend/tests/unit/test_task_service.py

**Checkpoint**: Task service state machine fully tested with valid/invalid transitions

---

## Phase 4: User Story 2 - Agent Graph Tests (Priority: P1)

**Goal**: Unit tests for planning and execution graph nodes with mocked LLM

**Verification**: Use `backend-test` MCP tool to run tests/unit/test_planning_graph.py and tests/unit/test_execution_graph.py

### Implementation for User Story 2

- [ ] T024 [US2] Create backend/tests/unit/test_planning_graph.py file structure
- [ ] T025 [P] [US2] Implement test_chat_node_returns_ai_message in backend/tests/unit/test_planning_graph.py
- [ ] T026 [P] [US2] Implement test_chat_node_uses_execution_summary_prompt in backend/tests/unit/test_planning_graph.py
- [ ] T027 [US2] Create TestTaskExtraction class in backend/tests/unit/test_planning_graph.py
- [ ] T028 [P] [US2] Implement test_extract_tasks_when_ready in backend/tests/unit/test_planning_graph.py
- [ ] T029 [P] [US2] Implement test_extract_tasks_returns_empty_when_not_ready in backend/tests/unit/test_planning_graph.py
- [ ] T030 [US2] Create backend/tests/unit/test_execution_graph.py file structure
- [ ] T031 [P] [US2] Implement test_should_continue_returns_tools in backend/tests/unit/test_execution_graph.py
- [ ] T032 [P] [US2] Implement test_should_continue_returns_reflect in backend/tests/unit/test_execution_graph.py
- [ ] T033 [US2] Create TestReflectionNode class in backend/tests/unit/test_execution_graph.py
- [ ] T034 [US2] Implement test_reflection_extracts_result in backend/tests/unit/test_execution_graph.py

**Checkpoint**: Planning and execution graph routing logic fully tested

---

## Phase 5: User Story 3 - Tool Unit Tests (Priority: P2)

**Goal**: Unit tests for agent tools (calculator, datetime) with pure function testing

**Verification**: Use `backend-test` MCP tool to run tests/unit/tools/

### Implementation for User Story 3

- [ ] T035 [US3] Create backend/tests/unit/tools/ directory
- [ ] T036 [US3] Create backend/tests/unit/tools/test_calculator.py file structure
- [ ] T037 [P] [US3] Implement test_calculator_basic_arithmetic in backend/tests/unit/tools/test_calculator.py
- [ ] T038 [P] [US3] Implement test_calculator_precedence (2 + 3 * 4 = 14) in backend/tests/unit/tools/test_calculator.py
- [ ] T039 [P] [US3] Implement test_calculator_functions (sqrt, pow) in backend/tests/unit/tools/test_calculator.py
- [ ] T040 [P] [US3] Implement test_calculator_invalid_expression in backend/tests/unit/tools/test_calculator.py
- [ ] T041 [US3] Create backend/tests/unit/tools/test_datetime.py file structure
- [ ] T042 [P] [US3] Implement test_datetime_format_iso in backend/tests/unit/tools/test_datetime.py
- [ ] T043 [P] [US3] Implement test_datetime_difference in backend/tests/unit/tools/test_datetime.py

**Checkpoint**: All tool functions tested with various inputs and edge cases

---

## Phase 6: User Story 4 - API Integration Tests (Priority: P2)

**Goal**: Integration tests for session API endpoints using httpx test client

**Verification**: Use `backend-test` MCP tool to run tests/integration/test_sessions_api.py

### Implementation for User Story 4

- [ ] T044 [US4] Create backend/tests/integration/ directory
- [ ] T045 [US4] Create backend/tests/integration/test_sessions_api.py file structure with TestSessionsAPI class
- [ ] T046 [P] [US4] Implement test_create_session in backend/tests/integration/test_sessions_api.py
- [ ] T047 [P] [US4] Implement test_get_session in backend/tests/integration/test_sessions_api.py
- [ ] T048 [P] [US4] Implement test_list_sessions in backend/tests/integration/test_sessions_api.py
- [ ] T049 [P] [US4] Implement test_delete_session in backend/tests/integration/test_sessions_api.py
- [ ] T050 [US4] Add test client fixture with mocked database to backend/tests/conftest.py

**Checkpoint**: Session CRUD operations verified through API layer

---

## Phase 7: User Story 5 - Frontend Hook Tests (Priority: P2)

**Goal**: Unit tests for useSSE hook with mocked fetch and ReadableStream

**Verification**: Use `frontend-test` MCP tool to run app/hooks/useSSE.test.ts

### Implementation for User Story 5

- [ ] T051 [US5] Create frontend/app/hooks/useSSE.test.ts file structure
- [ ] T052 [P] [US5] Implement test_connect_makes_fetch_request in frontend/app/hooks/useSSE.test.ts
- [ ] T053 [P] [US5] Implement test_disconnect_aborts_connection in frontend/app/hooks/useSSE.test.ts
- [ ] T054 [US5] Create SSE parsing tests describe block in frontend/app/hooks/useSSE.test.ts
- [ ] T055 [P] [US5] Implement test_parses_single_event in frontend/app/hooks/useSSE.test.ts
- [ ] T056 [P] [US5] Implement test_parses_multiple_events in frontend/app/hooks/useSSE.test.ts
- [ ] T057 [US5] Create error handling tests describe block in frontend/app/hooks/useSSE.test.ts
- [ ] T058 [US5] Implement test_connection_error_invokes_callback in frontend/app/hooks/useSSE.test.ts

**Checkpoint**: SSE hook connection, parsing, and error handling fully tested

---

## Phase 8: User Story 6 - Frontend Service & Utility Tests (Priority: P3)

**Goal**: Unit tests for API client and error handling utilities

**Verification**: Use `frontend-test` MCP tool to run app/services/api.test.ts and app/lib/error-handler.test.ts

### Implementation for User Story 6

- [ ] T059 [US6] Create frontend/app/services/api.test.ts file structure
- [ ] T060 [P] [US6] Implement test_listSessions_makes_get_request in frontend/app/services/api.test.ts
- [ ] T061 [P] [US6] Implement test_createSession_makes_post_request in frontend/app/services/api.test.ts
- [ ] T062 [P] [US6] Implement test_getSession_makes_get_with_id in frontend/app/services/api.test.ts
- [ ] T063 [US6] Create frontend/app/lib/error-handler.test.ts file structure
- [ ] T064 [P] [US6] Implement test_extracts_api_error_message in frontend/app/lib/error-handler.test.ts
- [ ] T065 [P] [US6] Implement test_formats_generic_error in frontend/app/lib/error-handler.test.ts
- [ ] T066 [US6] Implement test_returns_fallback_for_unknown_error in frontend/app/lib/error-handler.test.ts

**Checkpoint**: API client and error utilities fully tested

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and documentation

- [ ] T067 Run full backend test suite using `backend-test` MCP tool (all tests in tests/)
- [ ] T068 [P] Run full frontend test suite using `frontend-test` MCP tool (all tests)
- [ ] T069 Verify all tests pass consistently (run 3x via MCP tools to detect flaky tests)
- [ ] T070 Update quickstart.md with final test counts and coverage percentages

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-8)**: All depend on Foundational phase completion
  - US1 (Backend Service) and US2 (Agent Graph) are P1 priority - do first
  - US3 (Tools), US4 (API), US5 (Frontend Hook) are P2 - can proceed in parallel
  - US6 (Frontend Service) is P3 - can proceed last or in parallel
- **Polish (Phase 9)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - needs mock_supabase, mock_task_* fixtures
- **User Story 2 (P1)**: Can start after Foundational - needs mock_chat_llm, mock_structured_llm fixtures
- **User Story 3 (P2)**: Can start after Foundational - minimal fixture needs (tools are pure functions)
- **User Story 4 (P2)**: Can start after Foundational - needs mock_supabase fixture
- **User Story 5 (P2)**: Can start after Foundational - needs frontend/app/test/setup.ts
- **User Story 6 (P3)**: Can start after Foundational - needs frontend/app/test/setup.ts

### Within Each User Story

- File structure creation before test implementation
- Test class/describe block creation before individual tests
- Tests marked [P] within same story can run in parallel

### Parallel Opportunities

- T001-T002 can run in parallel (different projects)
- T003-T004 can run in parallel (different projects)
- T005-T006 can run in parallel (different projects)
- T007-T013 (Foundational fixtures) - most can run in parallel
- All [P] tasks within each user story can run in parallel
- After Foundational: US1-US6 can be worked on by different agents in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all valid transition tests in parallel:
Task: "Implement test_start_task_from_pending in backend/tests/unit/test_task_service.py"
Task: "Implement test_complete_task_from_in_progress in backend/tests/unit/test_task_service.py"
Task: "Implement test_fail_task_from_in_progress in backend/tests/unit/test_task_service.py"

# Launch all invalid transition tests in parallel:
Task: "Implement test_start_already_in_progress_raises in backend/tests/unit/test_task_service.py"
Task: "Implement test_complete_from_pending_raises in backend/tests/unit/test_task_service.py"
Task: "Implement test_modify_completed_task_raises in backend/tests/unit/test_task_service.py"
```

---

## Implementation Strategy

### MVP First (User Stories 1 & 2 Only)

1. Complete Phase 1: Setup (T001-T006)
2. Complete Phase 2: Foundational (T007-T013)
3. Complete Phase 3: User Story 1 - Backend Service Tests (T014-T023)
4. Complete Phase 4: User Story 2 - Agent Graph Tests (T024-T034)
5. **STOP and VALIDATE**: Use `backend-test` MCP tool to run tests/unit/ - core business logic now covered

### Incremental Delivery

1. Setup + Foundational → Test infrastructure ready
2. Add US1 → Task state machine tested → ~15% coverage
3. Add US2 → Agent graph tested → ~25% coverage
4. Add US3 → Tools tested → ~30% coverage
5. Add US4 → API tested → ~35% coverage
6. Add US5 + US6 → Frontend tested → ~40% coverage

### Parallel Team Strategy

With backend-test-dev and frontend-test-dev agents:

1. Both complete their respective Setup tasks in parallel
2. Once Foundational is done:
   - backend-test-dev: US1 → US2 → US3 → US4
   - frontend-test-dev: US5 → US6
3. Tests complete independently, can be merged without conflicts

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently verifiable via MCP tools
- Commit after each completed user story phase
- **ALWAYS use `backend-test` MCP tool for backend tests** - never run pytest directly
- **ALWAYS use `frontend-test` MCP tool for frontend tests** - never run vitest/pnpm test directly

---

## Summary

| Metric | Value |
|--------|-------|
| **Total Tasks** | 70 |
| **Phase 1 (Setup)** | 6 tasks |
| **Phase 2 (Foundational)** | 7 tasks |
| **US1 (Backend Service)** | 10 tasks |
| **US2 (Agent Graph)** | 11 tasks |
| **US3 (Tools)** | 9 tasks |
| **US4 (API Integration)** | 7 tasks |
| **US5 (Frontend Hooks)** | 8 tasks |
| **US6 (Frontend Service)** | 8 tasks |
| **Phase 9 (Polish)** | 4 tasks |
| **Parallel Opportunities** | 45+ tasks marked [P] |
| **MVP Scope** | Setup + Foundational + US1 + US2 (34 tasks) |
