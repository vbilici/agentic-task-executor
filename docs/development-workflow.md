# Development Workflow

This document describes the AI-assisted development workflow used to build this app.

## Overview

The app is developed using **Claude Code** as the primary AI coding assistant, enhanced with:
- A **custom MCP server** for real-time service management and debugging
- **Specialized agents** for different development tasks

```
┌─────────────────────────────────────────────────────────────────┐
│                     Claude Code (Main AI)                        │
│                                                                 │
│  Coordinates all development tasks, delegates to specialists    │
└─────────────────────────┬───────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│  MCP Server   │ │   Agents      │ │  Code Tools   │
│               │ │               │ │               │
│ • Services    │ │ • backend-dev │ │ • Read/Write  │
│ • Logs        │ │ • frontend-dev│ │ • Grep/Glob   │
│ • API calls   │ │ • test agents │ │ • Bash        │
└───────────────┘ └───────────────┘ └───────────────┘
```

---

## Claude Code

[Claude Code](https://docs.anthropic.com/en/docs/claude-code) is Anthropic's official CLI for AI-assisted software development. It provides:

- Direct file system access (read, write, edit)
- Code search and navigation
- Shell command execution
- Git operations
- Web search for documentation

Claude Code serves as the central orchestrator, delegating specialized tasks to purpose-built agents.

---

## Custom MCP Server

The **libra-mcp-server** (`packages/libra-mcp-server/`) is a custom [Model Context Protocol](https://modelcontextprotocol.io/) server that extends Claude Code's capabilities for this app.

### Why a Custom MCP Server?

During development, debugging requires:
1. Starting/stopping services without leaving Claude Code
2. Real-time access to service logs for error diagnosis
3. Quick API testing without manual curl commands

The MCP server solves this by providing tools that Claude Code can use directly.

### Available Tools

#### Service Management
| Tool | Description |
|------|-------------|
| `start_service` | Start frontend, backend, or test runners in iTerm2 |
| `stop_service` | Stop a service and close its window |
| `restart_service` | Restart a service |
| `get_service_status` | Check if a service is running |
| `get_all_service_status` | Status of all services |

#### Log Access
| Tool | Description |
|------|-------------|
| `get_service_logs` | Get recent N lines from a service |
| `search_service_logs` | Search logs with regex patterns |
| `tail_service_logs` | Get the last few lines (tail -f style) |

#### Debugging
| Tool | Description |
|------|-------------|
| `send_command_to_service` | Send keystrokes to a service terminal |
| `focus_service_window` | Bring service window to front |
| `query_api` | Make HTTP requests to the backend API |
| `check_backend_health` | Verify backend is responding |

### Supported Services

| Service | Command | Purpose |
|---------|---------|---------|
| `frontend` | `pnpm dev` | Vite dev server |
| `backend` | `uv run fastapi dev` | FastAPI server |
| `frontend-test` | `pnpm test:watch` | Vitest in watch mode |
| `backend-test` | `uv run pytest-watcher` | Pytest in watch mode |

### How It Works

The MCP server uses **AppleScript** to control iTerm2:
- Creates dedicated windows for each service
- Captures terminal output for log retrieval
- Positions windows on external monitors (auto-detected)
- Persists window state across Claude Code sessions

### Example Workflow

```
User: "The frontend is showing a blank page"

Claude Code:
1. Uses `get_service_logs(service="frontend")` to fetch recent logs
2. Finds "TypeError: Cannot read property of undefined"
3. Uses `get_service_logs(service="backend")` to check API responses
4. Identifies the bug and fixes it
5. Uses `restart_service(service="frontend")` to apply changes
```

---

## Specialized Agents

Claude Code delegates complex tasks to specialized agents defined in `.claude/agents/`. Each agent has deep expertise in a specific domain.

### Agent Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Claude Code                             │
│                    (Orchestrator Agent)                         │
└───────────┬─────────────┬─────────────┬─────────────┬──────────┘
            │             │             │             │
            ▼             ▼             ▼             ▼
     ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
     │ backend  │  │ frontend │  │ backend  │  │ frontend │
     │   dev    │  │   dev    │  │ test-dev │  │ test-dev │
     └──────────┘  └──────────┘  └──────────┘  └──────────┘
           │             │             │             │
           ▼             ▼             ▼             ▼
      FastAPI       React/TS       pytest        Vitest
      LangGraph     Tailwind       mocking       RTL
      Pydantic      shadcn/ui      async         hooks
```

### Available Agents

#### 1. backend-dev
**Purpose**: Backend API development
**Expertise**: FastAPI, LangGraph, LangChain, Pydantic, async Python, SSE streaming

**Triggers**:
- Creating API endpoints
- Implementing LangGraph agent logic
- Adding SSE streaming
- Service layer implementation

#### 2. frontend-dev
**Purpose**: Frontend feature development
**Expertise**: React 18, TypeScript, Tailwind CSS, shadcn/ui, SSE consumption, state management

**Triggers**:
- Building React components
- Implementing SSE streaming clients
- UI/UX implementations
- API integrations

#### 3. backend-test-dev
**Purpose**: Backend test creation and maintenance
**Expertise**: pytest, pytest-asyncio, FastAPI testing, LangGraph testing, mocking strategies

**Triggers**:
- Writing tests for new endpoints
- Testing LangGraph agent workflows
- Pydantic model validation tests
- Integration tests

#### 4. frontend-test-dev
**Purpose**: Frontend test creation and maintenance
**Expertise**: Vitest, React Testing Library, component testing, hook testing, snapshot tests

**Triggers**:
- Writing component tests
- Hook testing
- Integration tests
- Fixing failing tests

#### 5. database-ops
**Purpose**: Database schema management
**Expertise**: PostgreSQL, Supabase migrations, schema design

**Triggers**:
- Creating new tables
- Schema modifications
- Migration creation

### Agent Delegation Pattern

When Claude Code encounters a task matching an agent's expertise:

1. **Analyzes the request** to determine the appropriate specialist
2. **Spawns the agent** with full context about the task
3. **Agent executes** using its specialized knowledge and tools
4. **Returns results** to Claude Code for integration

### Constitutional Principles

All agents follow the app's constitutional principles:

| Principle | Application |
|-----------|-------------|
| **Real-Time UX** | SSE for all long-running operations |
| **State Reliability** | LangGraph checkpointer for persistence |
| **Strict Type Safety** | Pydantic/TypeScript strict mode |
| **Clean API Contracts** | OpenAPI auto-generation |
| **Simplicity First** | No over-engineering (YAGNI) |

---

## Planning Workflow

Feature planning uses different approaches based on complexity:

### Large Features: GitHub SpecKit

For significant features requiring detailed design, [GitHub SpecKit](https://github.com/softgradeinternational/speckit) is used to generate comprehensive specification documents.

**SpecKit generates**:
- `spec.md` - Feature requirements and user stories
- `plan.md` - Technical implementation plan
- `tasks.md` - Actionable task breakdown
- `data-model.md` - Entity definitions and schemas
- `research.md` - Technology decisions and patterns
- `contracts/` - API specifications, SSE event formats

**Location**: `specs/{feature-number}-{feature-name}/`

**Workflow**:
1. Define the feature in natural language
2. Run SpecKit commands to generate specs
3. Review and refine the generated documents
4. Agents reference specs during implementation

### Small to Medium Features: Claude Code Plan Mode

For smaller features, Claude Code's built-in **Plan Mode** provides lightweight planning:

**Triggers Plan Mode**:
- Multiple valid implementation approaches
- Architectural decisions needed
- Unclear scope requiring exploration

**Plan Mode Workflow**:
1. Enter plan mode to explore the codebase
2. Research existing patterns and code
3. Design the implementation approach
4. Present plan for user approval
5. Exit plan mode and implement

**When to use each**:

| Feature Size | Planning Approach | Example |
|--------------|-------------------|---------|
| Large (multi-day) | SpecKit | New agent workflow, major refactor |
| Medium (hours) | Plan Mode | New API endpoint with routing logic |
| Small (minutes) | Direct implementation | Bug fix, UI tweak |

---

## Development Commands

### Quick Reference

```bash
# Backend
cd backend && uv run fastapi dev          # Start server
cd backend && uv run ruff check --fix app/  # Lint + fix
cd backend && uv run pytest               # Run tests

# Frontend
cd frontend && pnpm dev                   # Start server
cd frontend && pnpm lint:fix              # Lint + fix
cd frontend && pnpm test                  # Run tests
cd frontend && pnpm gen-types             # Generate API types
```

### MCP Server

```bash
cd packages/libra-mcp-server
pnpm build                                # Build the server
```

The MCP server is configured in Claude Code's settings and starts automatically.

---

## Typical Development Session

1. **Start services** via MCP tools (or manually)
2. **Describe the feature** to Claude Code
3. **Claude Code delegates** to appropriate agents:
   - `backend-dev` for API work
   - `frontend-dev` for UI work
4. **Debug issues** using MCP log tools
5. **Write tests** via test agents
6. **Verify** everything works
7. **Commit** using Claude Code's git integration

This workflow enables rapid iteration with AI assistance while maintaining code quality through specialized agents and real-time debugging capabilities.
