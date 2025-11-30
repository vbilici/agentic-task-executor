# Implementation Plan: Agent-Driven TODO Executor

**Branch**: `001-agent-todo-executor` | **Date**: 2025-11-29 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-agent-todo-executor/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Full-stack AI agent application that lets users describe goals in natural language, generates structured TODO lists, executes tasks with real-time streaming updates, and manages artifacts/data via CRUD operations. Built with FastAPI + LangGraph backend and Vite + React + shadcn/ui frontend, using Supabase (PostgreSQL) for persistence and SSE for real-time communication.

**Architecture**: The planning agent uses a two-node LangGraph workflow: (1) **chat** node for conversational responses with streaming, (2) **extract_tasks** node using structured output to extract TODO items. This separation allows streaming user-facing responses while cleanly extracting structured task data in a single pass.

## Technical Context

**Language/Version**: Python 3.13 (backend), TypeScript 5.x (frontend)
**Primary Dependencies**: FastAPI, LangGraph, Anthropic Claude API, Tavily API (backend); Vite, React 18, shadcn/ui, Tailwind CSS (frontend)
**Storage**: Supabase (PostgreSQL) for sessions, tasks, artifacts, data items; LangGraph Postgres Checkpointer for agent state
**Testing**: pytest (backend), Vitest (frontend) - tests written when explicitly requested
**Target Platform**: Web browser (modern browsers with JavaScript), Linux/Docker server deployment
**Project Type**: Web application (frontend + backend)
**Performance Goals**: TODO list generation <10s, real-time updates <500ms latency, UI remains responsive during execution
**Constraints**: Artifact max 100KB, Tavily free tier (1000 searches/month), no user authentication (URL-based access)
**Scale/Scope**: Demo/interview purposes, single-user per session, 6 user stories

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Real-Time UX | [x] Pass | SSE for task execution & chat streaming, loading indicators for all async ops |
| II. Agent State Reliability | [x] Pass | LangGraph Postgres Checkpointer for state, sessions resumable after disconnect |
| III. Strict Type Safety | [x] Pass | Pydantic models (backend), TypeScript strict mode (frontend), OpenAPI→TS types |
| IV. Clean API Contracts | [x] Pass | FastAPI auto-generates OpenAPI, RESTful endpoints, typed error responses |
| V. Simplicity First | [x] Pass | No auth system, no user management, direct Supabase access, minimal abstractions |

**Post-Design Verification (2025-11-29)**:
- [x] I. Real-Time UX: SSE contracts defined in `contracts/sse-events.md`, <500ms latency target in quickstart tests
- [x] II. Agent State: `AsyncPostgresSaver` with connection pooling documented in `research.md`
- [x] III. Type Safety: Full Pydantic models in `data-model.md`, TypeScript types for all entities
- [x] IV. Clean API: OpenAPI 3.1 spec in `contracts/openapi.yaml` with typed errors
- [x] V. Simplicity: 5 core entities, direct Supabase client, no repository pattern

## Project Structure

### Documentation (this feature)

```text
specs/001-agent-todo-executor/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── app/
│   ├── models/          # Pydantic models for Session, Task, Artifact, DataItem, Message
│   ├── services/        # Business logic: SessionService, AgentService, ArtifactService
│   ├── api/             # FastAPI routers: sessions, tasks, artifacts, data_items, sse
│   ├── agent/           # LangGraph agent: graph definition, tools, state
│   ├── core/            # Config, database client, dependencies
│   └── main.py          # FastAPI application entry point
├── migrations/          # SQL migration files
├── tests/
│   ├── contract/        # API contract tests
│   ├── integration/     # End-to-end tests
│   └── unit/            # Business logic tests
└── pyproject.toml

frontend/
├── app/
│   ├── components/      # Reusable UI components (shadcn/ui based)
│   │   ├── ui/          # shadcn/ui primitives
│   │   ├── layout/      # App shell: sidebars, main content area
│   │   ├── session/     # Session-specific components
│   │   ├── chat/        # Chat and message components
│   │   └── artifacts/   # Artifact sidebar and viewer (right panel)
│   ├── pages/           # Route pages: Home, Session
│   ├── services/        # API client, SSE handler
│   ├── hooks/           # Custom React hooks (useSSE, useSidebarState)
│   ├── types/           # TypeScript types (generated from OpenAPI)
│   ├── lib/             # Utilities
│   └── App.tsx          # Root component with router
├── tests/
├── index.html
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
└── package.json
```

**Structure Decision**: Web application with separate frontend and backend directories. Backend uses FastAPI with a clear separation between API layer, services, and agent logic. Frontend is a Vite-based React SPA with shadcn/ui components.

## Agent Architecture

### Planning Graph (Two-Node Design)

The planning agent is implemented as a simple, linear LangGraph with two nodes:

```
User Message → [chat] → [extract_tasks] → END
                  ↓            ↓
              Streaming     Structured
               Response      Output
```

**Node 1: chat**
- **Purpose**: Generate conversational response to user
- **LLM**: GPT-4o with streaming enabled
- **Prompt**: `CHAT_PROMPT` (conversational planning assistant)
- **Output**: Streamed text chunks (via SSE to frontend)
- **Key Behavior**:
  - Asks clarifying questions if goal is unclear
  - Provides helpful, natural language responses
  - Does NOT output JSON or structured data directly

**Node 2: extract_tasks**
- **Purpose**: Extract structured TODO list from conversation
- **LLM**: GPT-4o with `with_structured_output(TaskList)`
- **Prompt**: `TASK_EXTRACTION_PROMPT` (extraction rules)
- **Output**: Pydantic `TaskList` model with `tasks: list[TaskItem]` and `ready_to_create_tasks: bool`
- **Key Behavior**:
  - Analyzes full conversation history
  - Only creates tasks when `ready_to_create_tasks=true`
  - Returns empty task list if goal still unclear
  - No streaming (structured output is atomic)

**Why Two Nodes?**
1. **Separation of Concerns**: User-facing chat separated from task extraction logic
2. **Streaming Control**: Only chat node streams; extraction happens silently in background
3. **Clean UI**: Users see natural conversation, not JSON or system artifacts
4. **Reliable Extraction**: Structured output prevents JSON parsing errors
5. **Single Pass**: Both operations happen in one graph execution

**State Flow**:
```python
input_state: PlanningState = {
    "messages": [HumanMessage(content=message)],
    "session_id": str(session_id),
    "tasks": [],
    "is_complete": False,
}
```

After execution:
- `messages` contains full conversation history (including new AI response)
- `tasks` contains extracted task dicts (if any)
- `is_complete` is `True` if tasks were generated

### SSE Event Streaming

The backend uses LangGraph's `astream_events(version="v2")` to capture node execution:

**Event Filtering (in `agent_service.py`)**:
```python
if event_type == "on_chat_model_stream":
    if node_name == "chat":  # Only stream from chat node
        yield {"type": "content", "content": chunk.content}

elif event_type == "on_chain_end":
    if node_name == "extract_tasks":  # Get tasks from extraction node
        tasks = output.get("tasks", [])
        yield {"type": "tasks_updated", "tasks": tasks}
```

**Frontend React Ref Pattern (in `useSSE.ts` and `SessionPage.tsx`)**:

The implementation uses `useRef` to prevent infinite re-render loops:

```typescript
// Store callbacks in ref to prevent re-renders
const optionsRef = useRef(options);

// Update ref when options change (doesn't trigger re-render)
useEffect(() => {
  optionsRef.current = options;
}, [options]);

// Use ref in async operations
optionsRef.current.onMessage?.(parsed);
```

**Why Refs?**
1. **Prevent Stale Closures**: Event handlers capture latest state without dependencies
2. **Avoid Re-renders**: Callback updates don't recreate event stream
3. **Clean Dependencies**: `connect()` has empty dependency array `[]`
4. **Streaming Content Ref**: `streamingContentRef.current` allows access to latest content in `done` handler without adding `streamingContent` to dependencies

This pattern is critical for SSE streaming where:
- Events arrive asynchronously over time
- Handlers need access to latest React state
- Adding state to dependencies would restart the connection

### Database Persistence

**LangGraph State**: Persisted via `AsyncPostgresSaver` (LangGraph's checkpointer)
- Connection pool with `autocommit=True` and `dict_row` factory
- Thread ID format: `session_{session_id}`
- Enables conversation continuity across disconnects

**Application Data**: Stored in Supabase (separate from LangGraph state)
- Sessions, tasks, messages, artifacts, data items
- Tasks created AFTER extraction completes (in `chat.py` endpoint)
- Sequence: extract → save to DB → send `tasks_updated` event with DB IDs

### UI Layout

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ ┌────────────┐                                              ┌──────────────────┐ │
│ │ [+ New]    │  Chat Area                                   │ Artifact Sidebar │ │
│ ├────────────┤  ┌────────────────────────────────────────┐  │ (on artifact)    │ │
│ │            │  │ User: Plan a birthday party...         │  │ ┌──────────────┐ │ │
│ │ ● Birthday │  │                                        │  │ │ Marketing    │ │ │
│ │   Party    │  │ Agent: Here's your task list:          │  │ │ Plan.md      │ │ │
│ │   planning │  │ □ Book venue                           │  │ │ [document] ↓ │ │ │
│ │            │  │ □ Send invitations                     │  │ ├──────────────┤ │ │
│ │ ○ CRM      │  │ □ Order catering                       │  │ │ Preview:     │ │ │
│ │   Research │  │ ...                                    │  │ │ # Marketing  │ │ │
│ │   completed│  └────────────────────────────────────────┘  │ │ ## Exec...   │ │ │
│ │            │                                              │ └──────────────┘ │ │
│ │ ○ Weekly   │  ┌────────────────────────────────────────┐  │                  │ │
│ │   Report   │  │ [Execute Tasks]                        │  │ Other artifacts: │ │
│ │   planning │  └────────────────────────────────────────┘  │ • Analysis.md   │ │
│ │            │                                              │ • Budget.xlsx   │ │
│ │            │  Execution Log:                              │                  │ │
│ │            │  ├─ Selected: Book venue                     │ [Collapse →]     │ │
│ │            │  ├─ Tool: web_search                         │                  │ │
│ │ [«]        │  └─ Result: Found 5 venues...                │                  │ │
│ └────────────┘                                              └──────────────────┘ │
│              ┌──────────────────────────────────────────────────────────────┐    │
│              │  Type a message...                                   [Send]  │    │
│              └──────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────────────┘

Collapsed Left Sidebar:
┌────┐
│ +  │  <- New Session
├────┤
│ ●  │  <- Current session (dot indicator)
│ ○  │
│ ○  │
│    │
│ [»]│  <- Expand button
└────┘
```

**Left Sidebar (Sessions)**:
- Permanent, always visible
- Collapsible to icon-only mode (persisted in localStorage)
- "New Session" button always at top
- Shows: session title, status indicator (●/○), timestamp
- Current session highlighted
- Most recent sessions first
- Delete session via context menu or swipe

**Right Sidebar (Artifacts)**:
- Opens automatically when first artifact is created
- Collapsible via button (shows badge with artifact count when closed)
- Shows artifact list with name, type badge, and truncated preview
- Clicking artifact opens full-screen modal
- Only visible when session has artifacts

**Artifact Modal (Full Screen)**:
```
┌────────────────────────────────────────────────────────────────┐
│  Marketing Plan.md                    [document]    [↓] [X]   │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  # Marketing Plan                                              │
│                                                                │
│  ## Executive Summary                                          │
│  This document outlines the marketing strategy for...          │
│                                                                │
│  ## Target Audience                                            │
│  - Primary: Young professionals aged 25-35                     │
│  - Secondary: Small business owners                            │
│                                                                │
│  ## Channels                                                   │
│  1. Social Media (Instagram, TikTok)                           │
│  2. Content Marketing                                          │
│  3. Email Campaigns                                            │
│                                                                │
│  ...                                                           │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```
- Full content with syntax highlighting (markdown, code, etc.)
- Download button [↓] in header
- Close button [X] returns to session view
- Escape key also closes modal
- Click outside modal to close

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

*No violations. Design follows all five constitution principles.*
