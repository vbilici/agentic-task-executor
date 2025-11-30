# Tasks: Agent-Driven TODO Executor

**Input**: Design documents from `/specs/001-agent-todo-executor/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not requested in specification - tests omitted.

**Parallelization Strategy**: Tasks are organized for maximum parallel execution. Backend (BE) and Frontend (FE) streams can run simultaneously. Tasks marked [P] can run in parallel within their phase.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[US#]**: User story association (US1-US6)

---

## Phase 1: Setup (Parallel Streams: 2)

**Purpose**: Project initialization - Backend and Frontend can start simultaneously

### Stream A: Backend Setup

- [x] T001 [P] Create backend directory structure per plan.md in `backend/`
- [x] T002 [P] Initialize Python 3.13 project with pyproject.toml in `backend/pyproject.toml`
- [x] T003 [P] Configure ruff linter and mypy in `backend/pyproject.toml`
- [x] T004 [P] Create .env.example with required variables in `backend/.env.example`

### Stream B: Frontend Setup

- [x] T005 [P] Create Vite + React + TypeScript project in `frontend/`
- [x] T006 [P] Initialize shadcn/ui using CLI: `pnpm dlx shadcn@latest init` in `frontend/`
- [x] T007 [P] Configure TypeScript strict mode in `frontend/tsconfig.json`
- [x] T008 [P] Create .env.example with VITE_API_URL in `frontend/.env.example`

**Checkpoint**: Both backend and frontend project scaffolds ready

---

## Phase 2: Foundational (Parallel Streams: 2)

**Purpose**: Core infrastructure - Backend and Frontend can continue in parallel

**⚠️ CRITICAL**: Phase 2 must complete before user story implementation

### Stream A: Backend Foundation

- [x] T009 [P] Create database config and Supabase client in `backend/app/core/database.py`
- [x] T010 [P] Create app config with environment loading in `backend/app/core/config.py`
- [x] T011 [P] Create base Pydantic models (enums, base classes) in `backend/app/models/base.py`
- [x] T012 [P] Create Session model in `backend/app/models/session.py`
- [x] T013 [P] Create Task model in `backend/app/models/task.py`
- [x] T014 [P] Create Message model in `backend/app/models/message.py`
- [x] T015 [P] Create Artifact model in `backend/app/models/artifact.py`
- [x] T016 [P] Create DataItem model in `backend/app/models/data_item.py`
- [x] T017 Create FastAPI app with CORS in `backend/app/main.py` (depends on T009, T010)
- [x] T018 Create health check endpoint in `backend/app/api/health.py`
- [x] T019 [P] Create SQL migration file for all tables in `backend/migrations/001_initial.sql`

### Stream B: Frontend Foundation

- [x] T020 [P] Create TypeScript types from OpenAPI spec in `frontend/src/types/api.ts`
- [x] T021 [P] Create API client service in `frontend/src/services/api.ts`
- [x] T022 [P] Create SSE handler hook in `frontend/src/hooks/useSSE.ts`
- [x] T023 [P] Create sidebar state hook in `frontend/src/hooks/useSidebarState.ts`
- [x] T024 [P] Create app shell layout component in `frontend/src/components/layout/AppShell.tsx`
- [x] T025 [P] Create left sidebar component (sessions) in `frontend/src/components/layout/SessionSidebar.tsx`
- [x] T026 [P] Create right sidebar component (artifacts) in `frontend/src/components/layout/ArtifactSidebar.tsx`
- [x] T027 [P] Setup React Router with Home and Session routes in `frontend/src/App.tsx`
- [x] T028 Install all shadcn/ui components via CLI in `frontend/`: `pnpm dlx shadcn@latest add button card dialog input scroll-area badge skeleton tooltip dropdown-menu separator sheet table alert-dialog toast`

**Checkpoint**: Foundation ready - user story implementation can begin

---

## Phase 3: User Story 1 - Describe Goal and Get TODO List (P1) 🎯 MVP

**Goal**: User describes goal → Agent generates structured TODO list

**Independent Test**: Type "Plan a birthday party" → See 3-10 actionable tasks

### Stream A: Backend [US1]

- [x] T029 [P] [US1] Create SessionService (create, get, list, delete) in `backend/app/services/session_service.py`
- [x] T030 [P] [US1] Create TaskService (create, update, list by session) in `backend/app/services/task_service.py`
- [x] T031 [P] [US1] Create MessageService (create, list by session) in `backend/app/services/message_service.py`
- [x] T032 [US1] Create LangGraph agent state schema in `backend/app/agent/state.py` (depends on T011-T016)
- [x] T033 [US1] Create planning agent system prompt in `backend/app/agent/prompts.py`
- [x] T034 [US1] Create LangGraph planning graph in `backend/app/agent/graph.py` (depends on T032, T033)
- [x] T035 [US1] Create AgentService with checkpointer in `backend/app/services/agent_service.py` (depends on T034)
- [x] T036 [US1] Create sessions router (CRUD endpoints) in `backend/app/api/sessions.py` (depends on T029)
- [x] T037 [US1] Create chat SSE endpoint in `backend/app/api/chat.py` (depends on T035)
- [x] T038 [US1] Register routers in main.py `backend/app/main.py`

### Stream B: Frontend [US1]

- [x] T039 [P] [US1] Create SessionList component in `frontend/src/components/session/SessionList.tsx`
- [x] T040 [P] [US1] Create SessionListItem component in `frontend/src/components/session/SessionListItem.tsx`
- [x] T041 [P] [US1] Create ChatInput component in `frontend/src/components/chat/ChatInput.tsx`
- [x] T042 [P] [US1] Create ChatMessage component in `frontend/src/components/chat/ChatMessage.tsx`
- [x] T043 [P] [US1] Create ChatMessageList component in `frontend/src/components/chat/ChatMessageList.tsx`
- [x] T044 [P] [US1] Create TaskList component in `frontend/src/components/session/TaskList.tsx`
- [x] T045 [P] [US1] Create TaskItem component in `frontend/src/components/session/TaskItem.tsx`
- [x] T046 [P] [US1] Create LoadingIndicator component in `frontend/src/components/ui/LoadingIndicator.tsx`
- [x] T047 [US1] Create Home page (new session button) in `frontend/src/pages/HomePage.tsx` (depends on T039-T040)
- [x] T048 [US1] Create Session page in `frontend/src/pages/SessionPage.tsx` (depends on T041-T046)
- [x] T049 [US1] Wire up chat SSE for streaming responses in `frontend/src/pages/SessionPage.tsx`

**Checkpoint**: US1 complete - Users can create sessions, describe goals, and see generated task lists

---

## Phase 4: User Story 2 - Watch Agent Execute Tasks (P2)

**Goal**: User clicks Execute → Sees real-time task execution with tool usage

**Independent Test**: Generate tasks with web search → Click Execute → See streaming updates

### Stream A: Backend [US2]

- [x] T050 [P] [US2] Create web_search tool (Tavily) in `backend/app/agent/tools/web_search.py`
- [x] T051 [P] [US2] Create calculator tool in `backend/app/agent/tools/calculator.py`
- [x] T052 [P] [US2] Create datetime tool in `backend/app/agent/tools/datetime_tool.py`
- [x] T053 [US2] Create execution agent graph with tools in `backend/app/agent/execution_graph.py` (depends on T050-T052)
- [x] T054 [US2] Add execute endpoint with SSE streaming in `backend/app/api/execute.py` (depends on T053)
- [x] T055 [US2] Update TaskService with status transitions in `backend/app/services/task_service.py`

### Stream B: Frontend [US2]

- [x] T056 [P] [US2] Create ExecuteButton component in `frontend/app/components/session/ExecuteButton.tsx`
- [x] T057 [P] [US2] Create ExecutionLog component in `frontend/app/components/session/ExecutionLog.tsx`
- [x] T058 [P] [US2] Create ExecutionLogEntry component in `frontend/app/components/session/ExecutionLogEntry.tsx`
- [x] T059 [P] [US2] Create ToolCallDisplay component in `frontend/app/components/session/ToolCallDisplay.tsx`
- [x] T060 [US2] Add execution SSE handler to Session page in `frontend/app/pages/SessionPage.tsx`
- [x] T061 [US2] Update TaskItem with in_progress/done/failed states in `frontend/app/components/session/TaskItem.tsx`

**Checkpoint**: US2 complete - Users can execute tasks and see real-time streaming updates

---

## Phase 5: User Story 3 - Agent Creates Artifacts (P3)

**Goal**: Agent creates documents/notes → User views in sidebar → Opens in modal

**Independent Test**: Ask "Create a marketing plan" → See artifact in sidebar → View in modal

### Stream A: Backend [US3]

- [ ] T062 [P] [US3] Create ArtifactService (create, get, list, download) in `backend/app/services/artifact_service.py`
- [ ] T063 [US3] Create create_artifact tool in `backend/app/agent/tools/create_artifact.py` (depends on T062)
- [ ] T064 [US3] Create read_artifact tool in `backend/app/agent/tools/read_artifact.py` (depends on T062)
- [ ] T065 [US3] Create artifacts router in `backend/app/api/artifacts.py` (depends on T062)
- [ ] T066 [US3] Add artifact tools to execution graph in `backend/app/agent/execution_graph.py`

### Stream B: Frontend [US3]

- [ ] T067 [P] [US3] Create ArtifactList component in `frontend/app/components/artifacts/ArtifactList.tsx`
- [ ] T068 [P] [US3] Create ArtifactListItem component in `frontend/app/components/artifacts/ArtifactListItem.tsx`
- [ ] T069 [P] [US3] Create ArtifactModal component (full-screen) in `frontend/app/components/artifacts/ArtifactModal.tsx`
- [ ] T070 [P] [US3] Create ArtifactPreview component in `frontend/app/components/artifacts/ArtifactPreview.tsx`
- [ ] T071 [P] [US3] Create markdown renderer utility in `frontend/app/lib/markdown.ts`
- [ ] T072 [US3] Wire artifact sidebar to session data in `frontend/app/components/layout/ArtifactSidebar.tsx`
- [ ] T073 [US3] Add artifact_created SSE handler in `frontend/app/pages/SessionPage.tsx`

**Checkpoint**: US3 complete - Users can see artifacts created by agent and view/download them

---

## Phase 6: User Story 4 - Agent CRUD Operations (P4)

**Goal**: Agent creates/reads/updates/deletes structured data items

**Independent Test**: Ask "Create contact list with 3 people" → "Update John's phone" → Verify changes

### Stream A: Backend [US4]

- [ ] T074 [P] [US4] Create DataItemService (CRUD operations) in `backend/app/services/data_item_service.py`
- [ ] T075 [US4] Create create_data_item tool in `backend/app/agent/tools/create_data_item.py` (depends on T074)
- [ ] T076 [US4] Create read_data_items tool in `backend/app/agent/tools/read_data_items.py` (depends on T074)
- [ ] T077 [US4] Create update_data_item tool in `backend/app/agent/tools/update_data_item.py` (depends on T074)
- [ ] T078 [US4] Create delete_data_item tool in `backend/app/agent/tools/delete_data_item.py` (depends on T074)
- [ ] T079 [US4] Create data-items router in `backend/app/api/data_items.py` (depends on T074)
- [ ] T080 [US4] Add CRUD tools to execution graph in `backend/app/agent/execution_graph.py`

### Stream B: Frontend [US4]

- [ ] T081 [P] [US4] Create DataItemList component in `frontend/app/components/session/DataItemList.tsx`
- [ ] T082 [P] [US4] Create DataItemCard component in `frontend/app/components/session/DataItemCard.tsx`
- [ ] T083 [US4] Add data items section to Session page in `frontend/app/pages/SessionPage.tsx`
- [ ] T084 [US4] Add data_modified SSE handler in `frontend/app/pages/SessionPage.tsx`

**Checkpoint**: US4 complete - Agent can manage structured data within sessions

---

## Phase 7: User Story 5 - Session Persistence (P5)

**Goal**: Users return to previous sessions → See full history

**Independent Test**: Create session with artifacts → Close browser → Reopen → Everything preserved

### Stream A: Backend [US5]

- [ ] T085 [US5] Add session listing with pagination in `backend/app/api/sessions.py`
- [ ] T086 [US5] Add session detail endpoint (with tasks, messages, artifacts, data) in `backend/app/api/sessions.py`
- [ ] T087 [US5] Ensure LangGraph checkpointer resumes correctly in `backend/app/services/agent_service.py`

### Stream B: Frontend [US5]

- [ ] T088 [US5] Update SessionSidebar to fetch and display all sessions in `frontend/app/components/layout/SessionSidebar.tsx`
- [ ] T089 [US5] Add session navigation (click to switch) in `frontend/app/components/layout/SessionSidebar.tsx`
- [ ] T090 [US5] Persist sidebar collapse state to localStorage in `frontend/app/hooks/useSidebarState.ts`
- [ ] T091 [US5] Add delete session functionality with confirmation in `frontend/app/components/session/SessionListItem.tsx`

**Checkpoint**: US5 complete - Full session persistence and navigation working

---

## Phase 8: User Story 6 - Chat Refinement (P6)

**Goal**: Users have back-and-forth conversation to refine tasks

**Independent Test**: Get initial tasks → Ask "Add budget planning task" → See updated list

> **Note**: Basic chat refinement was implemented as part of US1. The planning graph uses LangGraph checkpointer for conversation continuity, and tasks are replaced on each response. This phase focuses on advanced task management.

### Stream A: Backend [US6]

- [x] T092 [US6] ~~Update planning graph to handle follow-up messages~~ Already implemented via two-node architecture with checkpointer persistence in `backend/app/agent/graph.py`
- [ ] T093 [US6] Add task update logic (add/remove/modify individual tasks) in `backend/app/services/task_service.py`

### Stream B: Frontend [US6]

- [x] T094 [US6] ~~Enable chat input after initial response~~ Already implemented in `frontend/app/pages/SessionPage.tsx`
- [x] T095 [US6] ~~Handle tasks_updated SSE event~~ Already implemented in `frontend/app/pages/SessionPage.tsx`

**Checkpoint**: US6 complete - Full conversational planning flow working

---

## Phase 9: Polish & Cross-Cutting

**Purpose**: Final integration and cleanup

- [ ] T096 [P] Add error boundary component in `frontend/app/components/ErrorBoundary.tsx`
- [ ] T097 [P] Configure Toaster provider in `frontend/app/App.tsx`
- [ ] T098 [P] Add empty state components in `frontend/app/components/ui/EmptyState.tsx`
- [ ] T099 [P] Verify all API error responses match OpenAPI spec in `backend/app/api/`
- [ ] T100 [P] Add request logging middleware in `backend/app/main.py`
- [ ] T101 Run mypy type checking on backend `backend/`
- [ ] T102 Run TypeScript strict checking on frontend `frontend/`
- [ ] T103 Validate against quickstart.md test scenarios

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup)          → No dependencies, BE + FE parallel
Phase 2 (Foundational)   → Depends on Phase 1, BE + FE parallel
Phase 3-8 (User Stories) → Depend on Phase 2, BE + FE parallel per story
Phase 9 (Polish)         → Depends on all user stories
```

### User Story Dependencies

| Story | Depends On | Can Parallel With |
|-------|------------|-------------------|
| US1 (P1) | Phase 2 | - |
| US2 (P2) | US1 backend (T034-T038) | US1 frontend |
| US3 (P3) | US2 backend (T053) | US2 frontend |
| US4 (P4) | US2 backend (T053) | US3 (fully parallel) |
| US5 (P5) | Phase 2 only | US1-US4 (independent) |
| US6 (P6) | US1 backend (T034) | US2-US5 |

### Parallel Execution Map

```
Agent 1 (Backend)              Agent 2 (Frontend)
─────────────────              ──────────────────
T001-T004 (Setup)       ║      T005-T008 (Setup)
         ↓              ║               ↓
T009-T019 (Found.)      ║      T020-T028 (Found. + shadcn)
         ↓              ║               ↓
T029-T038 (US1 BE)      ║      T039-T049 (US1 FE)
         ↓              ║               ↓
T050-T055 (US2 BE)      ║      T056-T061 (US2 FE)
         ↓              ║               ↓
T062-T066 (US3 BE)      ║      T067-T073 (US3 FE)
         ↓              ║               ↓
T074-T080 (US4 BE)      ║      T081-T084 (US4 FE)
         ↓              ║               ↓
T085-T087 (US5 BE)      ║      T088-T091 (US5 FE)
         ↓              ║               ↓
T092-T093 (US6 BE)      ║      T094-T095 (US6 FE)
         ↓              ║               ↓
         └──────────────╨───────────────┘
                        ↓
                 T096-T103 (Polish)
```

---

## shadcn/ui Components

All UI primitives are installed in a single command (T028) from the `frontend/` directory:

```bash
pnpm dlx shadcn@latest add button card dialog input scroll-area badge skeleton tooltip dropdown-menu separator sheet table alert-dialog toast
```

Components installed:
- **button** - Primary action buttons
- **card** - Content containers
- **dialog** - Modal dialogs (artifact modal)
- **input** - Text input fields (chat input)
- **scroll-area** - Scrollable containers
- **badge** - Status badges (task status, artifact type)
- **skeleton** - Loading placeholders
- **tooltip** - Hover tooltips
- **dropdown-menu** - Context menus (session actions)
- **separator** - Visual dividers
- **sheet** - Slide-out panels (sidebars)
- **table** - Data tables (data items)
- **alert-dialog** - Confirmation dialogs (delete session)
- **toast** - Notifications

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1: Setup (both streams)
2. Complete Phase 2: Foundational (both streams, including shadcn install)
3. Complete Phase 3: US1 (both streams)
4. **VALIDATE**: Test goal → task list flow
5. Deploy MVP

### Incremental Delivery

| Milestone | Stories | Capability |
|-----------|---------|------------|
| MVP | US1 | Goal → Task list |
| Alpha | US1 + US2 | + Task execution |
| Beta | US1-US4 | + Artifacts + CRUD |
| Release | US1-US6 | Full feature set |

---

## Task Summary

| Phase | Tasks | Parallel Opportunities |
|-------|-------|----------------------|
| Setup | 8 | 8 (all parallel) |
| Foundational | 20 | 18 (BE/FE parallel) |
| US1 | 21 | 18 (within streams) |
| US2 | 12 | 10 (within streams) |
| US3 | 12 | 10 (within streams) |
| US4 | 11 | 8 (within streams) |
| US5 | 7 | 4 (within streams) |
| US6 | 4 | 2 (within streams) |
| Polish | 8 | 5 (independent) |
| **Total** | **103** | **83 parallelizable** |

---

## Notes

- All [P] tasks can run in parallel with other [P] tasks in same phase
- Backend (`backend/app/`) and Frontend (`frontend/app/`) are fully parallel streams
- Each user story has independent BE and FE work that can proceed simultaneously
- US3 and US4 have no dependencies on each other - can be fully parallelized
- US5 only depends on Phase 2, can start early and run parallel to US1-US4
- **All shadcn/ui components installed in single command** (T028) for efficiency
- Components are auto-generated in `frontend/app/components/ui/` by the CLI
- Commit after each task completion for clean git history
