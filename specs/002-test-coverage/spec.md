# Feature Specification: Comprehensive Test Coverage

**Feature Branch**: `002-test-coverage`
**Created**: 2025-11-30
**Status**: Draft
**Input**: User description: "create a testing plan using @docs/testing-plan.md"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Backend Service Tests (Priority: P1)

As a developer, I want unit tests for core business logic (task service state machine, agent graph nodes) so that I can confidently refactor code and catch regressions before deployment.

**Why this priority**: The task service state machine and agent graph nodes are the heart of the application. Bugs here directly impact users and are hardest to debug in production.

**Independent Test**: Can be fully tested by running `pytest tests/unit/` and verifying all state transitions behave correctly. Delivers confidence in core business logic.

**Acceptance Scenarios**:

1. **Given** a task in "pending" state, **When** the task service starts it, **Then** the task transitions to "in_progress" state
2. **Given** a task in "in_progress" state, **When** the task service completes it, **Then** the task transitions to "done" state
3. **Given** a task in "pending" state, **When** attempting to complete it directly, **Then** an error is raised (invalid transition)
4. **Given** a task in "in_progress" state, **When** the task service fails it, **Then** the task transitions to "failed" state
5. **Given** multiple pending tasks, **When** getting pending tasks, **Then** they are returned ordered by order_index

---

### User Story 2 - Agent Graph Tests (Priority: P1)

As a developer, I want unit tests for planning and execution graph nodes so that I can verify agent behavior without making actual LLM calls.

**Why this priority**: Agent logic is complex with multiple code paths (tool calls, reflections, artifact creation). Tests with mocked LLMs ensure deterministic behavior verification.

**Independent Test**: Can be tested by running graph node tests with mocked LLM responses. Delivers verification of all agent decision paths.

**Acceptance Scenarios**:

1. **Given** a planning graph with mocked LLM, **When** chat node receives a message, **Then** it returns an AI message response
2. **Given** a planning graph, **When** a message contains "[EXECUTION COMPLETE]", **Then** the chat node uses the execution summary prompt
3. **Given** a task extraction node with mocked structured output, **When** ready_to_create_tasks is true, **Then** tasks are returned
4. **Given** an execution graph agent node, **When** the last message has tool_calls, **Then** should_continue returns "tools"
5. **Given** an execution graph agent node, **When** the last message has no tool_calls, **Then** should_continue returns "reflect"
6. **Given** a reflection node, **When** invoked with execution history, **Then** it extracts task result and reflection

---

### User Story 3 - Tool Unit Tests (Priority: P2)

As a developer, I want unit tests for agent tools (calculator, datetime) so that I can ensure tools produce correct outputs for various inputs.

**Why this priority**: Tools are pure functions that are easy to test and provide immediate confidence. Lower priority because they have fewer edge cases than state machine logic.

**Independent Test**: Can be tested by invoking tools directly with test inputs. Delivers verification of computational correctness.

**Acceptance Scenarios**:

1. **Given** a calculator tool, **When** evaluating "2 + 3 * 4", **Then** it returns "14" (correct precedence)
2. **Given** a calculator tool, **When** evaluating "sqrt(16)", **Then** it returns "4.0"
3. **Given** a calculator tool, **When** evaluating an invalid expression, **Then** it returns an error message
4. **Given** a datetime tool, **When** formatting a date in ISO format, **Then** it returns correctly formatted string
5. **Given** a datetime tool, **When** calculating difference between two dates, **Then** it returns accurate duration

---

### User Story 4 - API Integration Tests (Priority: P2)

As a developer, I want integration tests for session API endpoints so that I can verify the full request-response cycle works correctly.

**Why this priority**: Integration tests catch issues in the API layer that unit tests miss. Lower priority because these are slower and less granular than unit tests.

**Independent Test**: Can be tested by running API tests with test client against mocked database. Delivers end-to-end API verification.

**Acceptance Scenarios**:

1. **Given** an API test client, **When** POST /sessions is called, **Then** a new session is created and returned
2. **Given** an existing session, **When** GET /sessions/{id} is called, **Then** the session details are returned
3. **Given** multiple sessions exist, **When** GET /sessions is called, **Then** all sessions are listed
4. **Given** an existing session, **When** DELETE /sessions/{id} is called, **Then** the session is deleted

---

### User Story 5 - Frontend Hook Tests (Priority: P2)

As a developer, I want unit tests for the useSSE hook so that I can verify SSE event parsing and connection handling work correctly.

**Why this priority**: The useSSE hook is the most complex frontend business logic with async operations and streaming data. It's critical for real-time updates.

**Independent Test**: Can be tested by mocking fetch and verifying event parsing logic. Delivers confidence in real-time functionality.

**Acceptance Scenarios**:

1. **Given** a useSSE hook, **When** connect is called, **Then** a fetch request is made with correct parameters
2. **Given** an active connection, **When** disconnect is called, **Then** the connection is aborted
3. **Given** an SSE stream, **When** a complete event is received, **Then** it is parsed and callback is invoked
4. **Given** an SSE stream, **When** multiple events arrive, **Then** all are parsed correctly from the buffer
5. **Given** an SSE stream, **When** a connection error occurs, **Then** the error callback is invoked

---

### User Story 6 - Frontend Service & Utility Tests (Priority: P3)

As a developer, I want unit tests for API client and error handling utilities so that I can verify HTTP operations and error formatting work correctly.

**Why this priority**: These are supporting utilities that are straightforward to test. Lower priority because they have simpler logic than hooks.

**Independent Test**: Can be tested by mocking fetch for API client and testing error handler functions directly. Delivers verification of HTTP layer.

**Acceptance Scenarios**:

1. **Given** an API client, **When** listSessions is called, **Then** a GET request is made to /sessions
2. **Given** an API client, **When** createSession is called, **Then** a POST request is made with the session data
3. **Given** an API error response, **When** passed to error handler, **Then** the error message is extracted
4. **Given** a generic Error object, **When** passed to error handler, **Then** the error message is formatted
5. **Given** an unknown error type, **When** passed to error handler, **Then** a fallback message is returned

---

### Edge Cases

- What happens when a test runs against an unavailable database connection?
- How does the system handle test isolation when tests run in parallel?
- What happens when mocked LLM responses don't match expected schema?
- How does the SSE parser handle incomplete JSON in the buffer?
- What happens when tool evaluation times out?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Test suite MUST achieve approximately 40% code coverage on business logic
- **FR-002**: Backend tests MUST use pytest with pytest-asyncio for async code
- **FR-003**: Frontend tests MUST use Vitest with React Testing Library
- **FR-004**: Unit tests MUST mock external dependencies (database, LLM, HTTP)
- **FR-005**: Integration tests MUST use test clients that simulate HTTP requests
- **FR-006**: Tests MUST be isolated and not depend on execution order
- **FR-007**: Test files MUST follow project structure (backend/tests/, frontend/app/test/)
- **FR-008**: Mocked LLM responses MUST be deterministic for reproducible tests
- **FR-009**: Tests MUST include descriptive names that explain the scenario being tested
- **FR-010**: Test fixtures MUST provide reusable mock objects for common dependencies

### Key Entities

- **Test Suite**: Collection of test files organized by type (unit, integration) and layer (backend, frontend)
- **Test Fixture**: Reusable setup code that provides mock objects or test data
- **Mock**: Simulated dependency that returns predetermined responses
- **Test Case**: Individual test function that verifies a specific behavior

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Test suite achieves 40% code coverage on backend business logic
- **SC-002**: Test suite achieves 40% code coverage on frontend hooks and services
- **SC-003**: All tests complete execution in under 2 minutes total
- **SC-004**: 100% of tests pass consistently (no flaky tests)
- **SC-005**: Tests cover all task state machine transitions (pending, in_progress, done, failed)
- **SC-006**: Tests cover all agent graph routing decisions (tools vs reflect)
- **SC-007**: Tests cover all calculator operations (arithmetic, functions, error handling)
- **SC-008**: Tests cover all API endpoints (CRUD operations)
- **SC-009**: Tests demonstrate comprehensive mocking patterns for LLMs and external services
- **SC-010**: Test suite can be run with a single command per layer (backend: pytest, frontend: vitest)

## Assumptions

- pytest and vitest are the standard test runners for this project
- Mock objects are preferred over test databases for unit tests
- Integration tests may use test databases or in-memory alternatives
- Test coverage is measured on business logic, not boilerplate or configuration
- Existing testing plan in docs/testing-plan.md provides the detailed implementation approach
