<!--
  Sync Impact Report
  ==================
  Version change: 1.0.1 → 1.0.2 (PATCH - simplify frontend stack)

  Modified sections:
    - Development Standards/Frontend: Changed from Next.js to Vite + React
      (no SSR needed for single-page chat app)

  Added sections: None

  Removed sections: None

  Templates requiring updates:
    - .specify/templates/plan-template.md: No changes required
    - .specify/templates/spec-template.md: No changes required
    - .specify/templates/tasks-template.md: No changes required
    - .specify/templates/checklist-template.md: No changes required

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

- Tests are written when explicitly requested in feature specifications
- Contract tests verify API schemas match between frontend and backend
- Integration tests cover critical user journeys end-to-end
- Unit tests for complex business logic only (not for simple CRUD)

## Quality Gates

Before any PR is merged, the following MUST pass:

1. **Type Check**: `mypy` (backend) and `tsc --noEmit` (frontend) pass with zero errors
2. **Lint**: Code passes configured linters without warnings
3. **Tests**: All requested tests pass
4. **Build**: Production build completes without errors
5. **Constitution Compliance**: No violations of the five core principles

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

**Version**: 1.0.2 | **Ratified**: 2025-11-28 | **Last Amended**: 2025-11-29
