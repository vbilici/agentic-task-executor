# Libra Development Guidelines

## Project Overview

Libra is an **Agent-Driven TODO Executor** - a full-stack application where an AI agent chats with users about goals, generates structured TODO lists, and executes tasks with real-time visibility.

**High-Level Flow:**
```
User Goal → Planning Agent → TODO List → Execution Loop → Results
     ↑                                          ↓
     └──────────── Chat Interface ←─────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | Python 3.13, FastAPI, LangGraph, LangChain |
| **Frontend** | TypeScript 5.x, Vite, React 18, shadcn/ui, Tailwind CSS |
| **Database** | Supabase (PostgreSQL) |
| **State** | LangGraph Postgres Checkpointer |
| **LLM** | Anthropic Claude API |
| **Tools** | Tavily API (web search) |
| **Real-time** | SSE (Server-Sent Events) |
| **Package Managers** | uv (backend), pnpm (frontend) |

## Project Structure

```
libra/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app entry
│   │   ├── core/
│   │   │   ├── config.py        # Settings & env vars
│   │   │   └── database.py      # Supabase client
│   │   ├── api/
│   │   │   ├── sessions.py      # Session CRUD
│   │   │   ├── chat.py          # Chat + SSE streaming
│   │   │   ├── execute.py       # Execution + SSE streaming
│   │   │   ├── artifacts.py     # Artifact endpoints
│   │   │   └── data_items.py    # Data item CRUD
│   │   ├── agent/
│   │   │   ├── graph.py         # LangGraph definition
│   │   │   ├── state.py         # Agent state schema
│   │   │   ├── prompts.py       # System prompts
│   │   │   └── tools/           # Agent tools (web_search, calculator, etc.)
│   │   ├── models/              # Pydantic models
│   │   └── services/            # Business logic
│   ├── migrations/              # SQL migrations
│   └── pyproject.toml
├── frontend/
│   ├── app/
│   │   ├── App.tsx              # Main app with routing
│   │   ├── components/
│   │   │   ├── ui/              # shadcn/ui components
│   │   │   ├── layout/          # AppShell, sidebars
│   │   │   ├── chat/            # Chat components
│   │   │   ├── session/         # Session/task components
│   │   │   └── artifacts/       # Artifact components
│   │   ├── pages/               # HomePage, SessionPage
│   │   ├── hooks/               # useSSE, useSidebarState
│   │   ├── services/            # API client
│   │   ├── types/               # TypeScript types
│   │   └── lib/                 # Utilities
│   ├── package.json
│   └── vite.config.ts
└── specs/                       # Feature specifications
```

## Commands

### Backend

```bash
# Navigate to backend
cd backend

# Install dependencies
uv sync

# Start dev server
uv run fastapi dev

# Run linting (auto-fix first!)
uv run ruff check --fix app/
uv run ruff format app/

# Type checking
uv run mypy app/

# Run tests
uv run pytest
```

### Frontend

```bash
# Navigate to frontend
cd frontend

# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Install shadcn/ui components
pnpm dlx shadcn@latest add <component>

# Linting with OxLint (auto-fix first!)
pnpm lint:fix
pnpm lint

# Type check
pnpm tsc --noEmit

# Generate API types from backend OpenAPI
pnpm gen-types

# Build for production
pnpm build
```

## Key URLs

- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **OpenAPI Schema**: http://localhost:8000/openapi.json

## Code Style

### Backend (Python)
- Pydantic models for ALL data structures
- Type hints on ALL functions
- mypy strict mode compliance
- Async/await for all I/O operations
- No `Any` types unless documented

### Frontend (TypeScript)
- TypeScript strict mode enabled
- No `any` types (document exceptions)
- Types auto-generated from backend OpenAPI (`pnpm gen-types`)
- Never manually define API response types
- React hooks for state management (no Zustand/Redux)

## Constitutional Principles

### I. Real-Time User Experience
- SSE MUST be used for all long-running operations
- No operation should appear "stuck" - users MUST see activity within 500ms
- Loading indicators for all async operations

### II. Agent State Reliability
- All agent state MUST persist via LangGraph Postgres Checkpointer
- Sessions MUST be resumable after crashes/restarts
- State transitions MUST be atomic

### III. Strict Type Safety
- Backend: Pydantic models, mypy strict mode
- Frontend: TypeScript strict mode, generated API types

### IV. Clean API Contracts
- OpenAPI documentation auto-generated from Pydantic models
- RESTful endpoint naming (`/sessions/{id}/tasks`, not `/getSessionTasks`)
- Error responses include machine-readable codes + human messages

### V. Simplicity First (YAGNI)
- No premature abstraction
- No repository pattern (direct Supabase client)
- No unnecessary state management libraries
- Delete unused code completely

## Environment Variables

### Backend (.env)
```
DATABASE_URL=postgresql://...
ANTHROPIC_API_KEY=sk-ant-...
TAVILY_API_KEY=tvly-...          # Optional: enables web_search and web_fetch tools
HOST=0.0.0.0
PORT=8000
DEBUG=true
```

> **Note:** `TAVILY_API_KEY` is optional. When not provided, the application runs without web search capabilities (`web_search` and `web_fetch` tools are disabled).

### Frontend (.env.local)
```
VITE_API_URL=http://localhost:8000
```

## Feature Specifications

Design documents are in `specs/001-agent-todo-executor/`:
- `spec.md` - User stories and requirements
- `plan.md` - Technical implementation plan
- `tasks.md` - Implementation tasks
- `data-model.md` - Entity definitions
- `contracts/` - API contracts (OpenAPI, SSE events)

<!-- MANUAL ADDITIONS START -->

## Test Development

**IMPORTANT**: All test creation, editing, and fixing operations MUST be delegated to specialized test agents:

| Agent | Purpose | Location |
|-------|---------|----------|
| `backend-test-dev` | Python tests (pytest, FastAPI, LangGraph, Pydantic) | `.claude/agents/backend-test-dev.md` |
| `frontend-test-dev` | TypeScript tests (Vitest, React Testing Library) | `.claude/agents/frontend-test-dev.md` |

### When to Delegate

- Writing new tests for features or bug fixes
- Updating tests after code refactoring
- Fixing failing tests
- Adding test coverage for existing code
- Creating integration tests

### How to Delegate

Use the Task tool to launch the appropriate agent:
```
Task(subagent_type="backend-test-dev", prompt="Write tests for...")
Task(subagent_type="frontend-test-dev", prompt="Create tests for...")
```

**Never write tests directly** - always delegate to the specialized agent for the relevant stack.

<!-- MANUAL ADDITIONS END -->

## Active Technologies
- Python 3.13 (backend), TypeScript 5.x (frontend) + pytest, pytest-asyncio, pytest-mock, httpx (backend); Vitest, @testing-library/react, @testing-library/jest-dom (frontend) (002-test-coverage)
- N/A (tests use mocks, not real database) (002-test-coverage)

