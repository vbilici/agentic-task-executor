<!--
  Sync Impact Report
  ==================
  Version change: 1.0.2 → 1.1.0 (MINOR - new principle added)

  Modified sections:
    - Testing section under Development Standards: Expanded with agent delegation rules
    - Quality Gates: Added test verification gate

  Added sections:
    - Principle VI: Test-Driven Development (TDD)

  Removed sections: None

  Templates requiring updates:
    - .specify/templates/plan-template.md: ✅ Updated (added Principle VI to Constitution Check table)
    - .specify/templates/spec-template.md: ✅ No changes required
    - .specify/templates/tasks-template.md: ✅ No changes required (already includes test
      task patterns)
    - .specify/templates/checklist-template.md: ✅ No changes required

  Follow-up TODOs: None
-->

# Libra Constitution

## Core Principles

### I. Real-Time User Experience

Every user interaction MUST provide immediate, visible feedback. The system prioritizes
responsiveness and transparency in all operations.

- SSE (Server-Sent Events) MUST be used for all long-running operations (task execution,
  chat responses)
- UI MUST show loading states, progress indicators, and streaming updates
- No operation should appear "stuck" - users MUST see activity within 500ms of initiation
- Execution logs MUST stream in real-time during task processing

**Rationale**: Users engaging with an AI agent expect immediate acknowledgment and visibility
into what the system is doing. Silent processing erodes trust and engagement.

### II. Agent State Reliability

LangGraph state and checkpoint integrity are non-negotiable. The system MUST be resumable
and debuggable at any point.

- All agent state MUST persist via LangGraph Postgres Checkpointer
- Sessions MUST be resumable after crashes, restarts, or disconnections
- State transitions MUST be atomic - partial updates are forbidden
- Every state change MUST be traceable through execution logs
- Thread IDs MUST map deterministically to sessions

**Rationale**: An agent that loses context or corrupts state mid-execution destroys user
trust and wastes their time. Reliability is foundational to the product's value proposition.

### III. Strict Type Safety

All code MUST be statically typed with no escape hatches. Type errors are build failures.

- **Python (Backend)**: Pydantic models for all data structures, type hints on all functions,
  mypy strict mode enabled
- **TypeScript (Frontend)**: strict mode enabled, no `any` types except where interfacing
  with untyped libraries (must be documented)
- API contracts MUST be defined with typed schemas (Pydantic → OpenAPI → TypeScript)
- Database models MUST have corresponding Pydantic/TypeScript representations

**Rationale**: A full-stack application with AI components has many integration points.
Static typing catches mismatches at build time rather than runtime, reducing debugging
time and production incidents.

### IV. Clean API Contracts

REST endpoints MUST be well-documented, consistent, and self-describing.

- All endpoints MUST have OpenAPI documentation auto-generated from Pydantic models
- HTTP status codes MUST accurately reflect outcomes (4xx for client errors, 5xx for
  server errors)
- Error responses MUST include machine-readable codes and human-readable messages
- Endpoint naming MUST follow RESTful conventions (`/sessions/{id}/tasks`, not `/getSessionTasks`)
- SSE endpoints MUST document event types and payload schemas

**Rationale**: The frontend and backend evolve together but are separate codebases. Clear
API contracts enable independent development and reduce integration friction.

### V. Simplicity First (YAGNI)

Start with the simplest solution that works. Add complexity only when proven necessary.

- No premature abstraction - three similar lines of code is better than an unproven helper
- No feature flags or configuration for hypothetical future needs
- No "just in case" error handling for scenarios that cannot occur
- Delete unused code completely - no commented-out blocks or `_unused` variables
- Each new dependency MUST justify its inclusion against the cost of maintenance

**Rationale**: This is a focused product with a clear scope. Over-engineering slows
iteration and obscures the core value. Build what's needed today.

### VI. Test-Driven Development (TDD)

All test creation, editing, and execution MUST be delegated to specialized test agents
using MCP tools for verification.

- **Test Agent Delegation**: All test-related tasks MUST be delegated to the appropriate agent:
  - Backend tests (Python/pytest): Use `.claude/agents/backend-test-dev.md` agent
  - Frontend tests (TypeScript/Vitest): Use `.claude/agents/frontend-test-dev.md` agent
- **MCP Tool Verification**: Tests MUST be executed using dedicated MCP tools:
  - Backend: Use `backend-test` MCP service
  - Frontend: Use `frontend-test` MCP service
- **TDD Workflow**: When tests are requested:
  1. Write tests FIRST (they MUST fail initially)
  2. Implement code to make tests pass
  3. Refactor while keeping tests green
- **Never Run Tests Manually**: Direct test commands (e.g., `pytest`, `vitest`, `pnpm test`)
  MUST NOT be used - always use MCP tools through the specialized agents

**Rationale**: Specialized test agents maintain consistent testing patterns, enforce best
practices, and ensure tests are properly verified through MCP tooling. This separation
of concerns improves test quality and maintainability while enabling efficient TDD workflows.

## Development Standards

### Backend (FastAPI + LangGraph)

- FastAPI application structure per `PLAN.md` project layout
- Async/await throughout - no blocking I/O in request handlers
- Database operations via Supabase client with typed responses
- Environment variables for all configuration (no hardcoded secrets)
- Terminal logging for debugging (no database persistence)

### Frontend (Vite + React + shadcn/ui)

- Single-page application - no SSR needed for this use case
- Tailwind CSS for styling - no custom CSS unless necessary
- shadcn/ui components as the primary UI library
- React hooks for state management - no additional state libraries unless complexity demands
- EventSource API for SSE consumption

### Testing

Testing follows Principle VI (Test-Driven Development) with mandatory agent delegation:

- **Backend Tests**: Delegate to `backend-test-dev` agent (`.claude/agents/backend-test-dev.md`)
  - Uses pytest with pytest-asyncio
  - Verify via `backend-test` MCP tool
  - Test categories: unit, integration, API endpoint, LangGraph workflow, Pydantic model
- **Frontend Tests**: Delegate to `frontend-test-dev` agent (`.claude/agents/frontend-test-dev.md`)
  - Uses Vitest with React Testing Library
  - Verify via `frontend-test` MCP tool
  - Test categories: component, hook, utility, integration, snapshot
- **When to Write Tests**:
  - When explicitly requested in feature specifications
  - Contract tests verify API schemas match between frontend and backend
  - Integration tests cover critical user journeys end-to-end
  - Unit tests for complex business logic only (not for simple CRUD)
- **Test Verification Workflow**:
  1. Agent writes tests following stack-specific conventions
  2. Agent executes tests via MCP tool (NEVER manual commands)
  3. Agent iterates until tests pass
  4. Agent reports results with summary

## Quality Gates

Before any PR is merged, the following MUST pass:

1. **Type Check**: `mypy` (backend) and `tsc --noEmit` (frontend) pass with zero errors
2. **Lint**: Code passes configured linters without warnings
3. **Tests**: All requested tests pass (verified via MCP tools)
4. **Test Agent Verification**: Test creation/modification done through specialized agents
5. **Build**: Production build completes without errors
6. **Constitution Compliance**: No violations of the six core principles

## Governance

This constitution supersedes all other practices and conventions. When in doubt,
refer to these principles.

### Amendment Process

1. Propose amendment with rationale in a dedicated PR
2. Document impact on existing code and templates
3. Update all dependent artifacts (templates, docs) in the same PR
4. Version bump follows semantic versioning:
   - MAJOR: Principle removal or incompatible redefinition
   - MINOR: New principle or significant expansion
   - PATCH: Clarification or wording improvement

### Compliance

- All code reviews MUST verify constitution compliance
- Violations MUST be documented in the Complexity Tracking section of `plan.md`
  with justification
- Unjustified violations block PR approval

**Version**: 1.1.0 | **Ratified**: 2025-11-28 | **Last Amended**: 2025-11-30
