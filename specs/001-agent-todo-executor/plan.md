# Implementation Plan: Agent-Driven TODO Executor

**Branch**: `001-agent-todo-executor` | **Date**: 2025-11-29 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-agent-todo-executor/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Full-stack AI agent application that lets users describe goals in natural language, generates structured TODO lists, executes tasks with real-time streaming updates, and manages artifacts/data via CRUD operations. Built with FastAPI + LangGraph backend and Vite + React + shadcn/ui frontend, using Supabase (PostgreSQL) for persistence and SSE for real-time communication.

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
