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

- [ ] T001 [P] Create backend directory structure per plan.md in `backend/`
- [ ] T002 [P] Initialize Python 3.13 project with pyproject.toml in `backend/pyproject.toml`
- [ ] T003 [P] Configure ruff linter and mypy in `backend/pyproject.toml`
- [ ] T004 [P] Create .env.example with required variables in `backend/.env.example`

### Stream B: Frontend Setup

- [ ] T005 [P] Create Vite + React + TypeScript project in `frontend/`
- [ ] T006 [P] Configure Tailwind CSS in `frontend/tailwind.config.js`
- [ ] T007 [P] Initialize shadcn/ui in `frontend/`
- [ ] T008 [P] Configure TypeScript strict mode in `frontend/tsconfig.json`
- [ ] T009 [P] Create .env.example with VITE_API_URL in `frontend/.env.example`

**Checkpoint**: Both backend and frontend project scaffolds ready

---

## Phase 2: Foundational (Parallel Streams: 2)

**Purpose**: Core infrastructure - Backend and Frontend can continue in parallel

**⚠️ CRITICAL**: Phase 2 must complete before user story implementation

### Stream A: Backend Foundation

- [ ] T010 [P] Create database config and Supabase client in `backend/app/core/database.py`
- [ ] T011 [P] Create app config with environment loading in `backend/app/core/config.py`
- [ ] T012 [P] Create base Pydantic models (enums, base classes) in `backend/app/models/base.py`
- [ ] T013 [P] Create Session model in `backend/app/models/session.py`
- [ ] T014 [P] Create Task model in `backend/app/models/task.py`
- [ ] T015 [P] Create Message model in `backend/app/models/message.py`
- [ ] T016 [P] Create Artifact model in `backend/app/models/artifact.py`
- [ ] T017 [P] Create DataItem model in `backend/app/models/data_item.py`
- [ ] T018 Create FastAPI app with CORS in `backend/app/main.py` (depends on T010, T011)
- [ ] T019 Create health check endpoint in `backend/app/api/health.py`
- [ ] T020 [P] Create SQL migration file for all tables in `backend/migrations/001_initial.sql`

### Stream B: Frontend Foundation

- [ ] T021 [P] Create TypeScript types from OpenAPI spec in `frontend/app/types/api.ts`
- [ ] T022 [P] Create API client service in `frontend/app/services/api.ts`
- [ ] T023 [P] Create SSE handler hook in `frontend/app/hooks/useSSE.ts`
- [ ] T024 [P] Create sidebar state hook in `frontend/app/hooks/useSidebarState.ts`
- [ ] T025 [P] Create app shell layout component in `frontend/app/components/layout/AppShell.tsx`
- [ ] T026 [P] Create left sidebar component (sessions) in `frontend/app/components/layout/SessionSidebar.tsx`
- [ ] T027 [P] Create right sidebar component (artifacts) in `frontend/app/components/layout/ArtifactSidebar.tsx`
- [ ] T028 [P] Setup React Router with Home and Session routes in `frontend/app/App.tsx`
- [ ] T029 [P] Add shadcn/ui Button component in `frontend/app/components/ui/button.tsx`
- [ ] T030 [P] Add shadcn/ui Card component in `frontend/app/components/ui/card.tsx`
- [ ] T031 [P] Add shadcn/ui Dialog component (for artifact modal) in `frontend/app/components/ui/dialog.tsx`
- [ ] T032 [P] Add shadcn/ui Input component in `frontend/app/components/ui/input.tsx`
- [ ] T033 [P] Add shadcn/ui ScrollArea component in `frontend/app/components/ui/scroll-area.tsx`

**Checkpoint**: Foundation ready - user story implementation can begin

---

## Phase 3: User Story 1 - Describe Goal and Get TODO List (P1) 🎯 MVP

**Goal**: User describes goal → Agent generates structured TODO list

**Independent Test**: Type "Plan a birthday party" → See 3-10 actionable tasks

### Stream A: Backend [US1]

- [ ] T034 [P] [US1] Create SessionService (create, get, list, delete) in `backend/app/services/session_service.py`
- [ ] T035 [P] [US1] Create TaskService (create, update, list by session) in `backend/app/services/task_service.py`
- [ ] T036 [P] [US1] Create MessageService (create, list by session) in `backend/app/services/message_service.py`
- [ ] T037 [US1] Create LangGraph agent state schema in `backend/app/agent/state.py` (depends on T012-T17)
- [ ] T038 [US1] Create planning agent system prompt in `backend/app/agent/prompts.py`
- [ ] T039 [US1] Create LangGraph planning graph in `backend/app/agent/graph.py` (depends on T037, T038)
- [ ] T040 [US1] Create AgentService with checkpointer in `backend/app/services/agent_service.py` (depends on T039)
- [ ] T041 [US1] Create sessions router (CRUD endpoints) in `backend/app/api/sessions.py` (depends on T034)
- [ ] T042 [US1] Create chat SSE endpoint in `backend/app/api/chat.py` (depends on T040)
- [ ] T043 [US1] Register routers in main.py `backend/app/main.py`

### Stream B: Frontend [US1]

- [ ] T044 [P] [US1] Create SessionList component in `frontend/app/components/session/SessionList.tsx`
- [ ] T045 [P] [US1] Create SessionListItem component in `frontend/app/components/session/SessionListItem.tsx`
- [ ] T046 [P] [US1] Create ChatInput component in `frontend/app/components/chat/ChatInput.tsx`
- [ ] T047 [P] [US1] Create ChatMessage component in `frontend/app/components/chat/ChatMessage.tsx`
- [ ] T048 [P] [US1] Create ChatMessageList component in `frontend/app/components/chat/ChatMessageList.tsx`
- [ ] T049 [P] [US1] Create TaskList component in `frontend/app/components/session/TaskList.tsx`
- [ ] T050 [P] [US1] Create TaskItem component in `frontend/app/components/session/TaskItem.tsx`
- [ ] T051 [P] [US1] Create LoadingIndicator component in `frontend/app/components/ui/loading.tsx`
- [ ] T052 [US1] Create Home page (new session button) in `frontend/app/pages/HomePage.tsx` (depends on T044-T45)
- [ ] T053 [US1] Create Session page in `frontend/app/pages/SessionPage.tsx` (depends on T046-T51)
- [ ] T054 [US1] Wire up chat SSE for streaming responses in `frontend/app/pages/SessionPage.tsx`

**Checkpoint**: US1 complete - Users can create sessions, describe goals, and see generated task lists

---

## Phase 4: User Story 2 - Watch Agent Execute Tasks (P2)

**Goal**: User clicks Execute → Sees real-time task execution with tool usage

**Independent Test**: Generate tasks with web search → Click Execute → See streaming updates

### Stream A: Backend [US2]

- [ ] T055 [P] [US2] Create web_search tool (Tavily) in `backend/app/agent/tools/web_search.py`
- [ ] T056 [P] [US2] Create calculator tool in `backend/app/agent/tools/calculator.py`
- [ ] T057 [P] [US2] Create datetime tool in `backend/app/agent/tools/datetime_tool.py`
- [ ] T058 [US2] Create execution agent graph with tools in `backend/app/agent/execution_graph.py` (depends on T055-T57)
- [ ] T059 [US2] Add execute endpoint with SSE streaming in `backend/app/api/execute.py` (depends on T058)
- [ ] T060 [US2] Update TaskService with status transitions in `backend/app/services/task_service.py`

### Stream B: Frontend [US2]

- [ ] T061 [P] [US2] Create ExecuteButton component in `frontend/app/components/session/ExecuteButton.tsx`
- [ ] T062 [P] [US2] Create ExecutionLog component in `frontend/app/components/session/ExecutionLog.tsx`
- [ ] T063 [P] [US2] Create ExecutionLogEntry component in `frontend/app/components/session/ExecutionLogEntry.tsx`
- [ ] T064 [P] [US2] Create ToolCallDisplay component in `frontend/app/components/session/ToolCallDisplay.tsx`
- [ ] T065 [US2] Add execution SSE handler to Session page in `frontend/app/pages/SessionPage.tsx`
- [ ] T066 [US2] Update TaskItem with in_progress/done/failed states in `frontend/app/components/session/TaskItem.tsx`

**Checkpoint**: US2 complete - Users can execute tasks and see real-time streaming updates

---

## Phase 5: User Story 3 - Agent Creates Artifacts (P3)

**Goal**: Agent creates documents/notes → User views in sidebar → Opens in modal

**Independent Test**: Ask "Create a marketing plan" → See artifact in sidebar → View in modal

### Stream A: Backend [US3]

- [ ] T067 [P] [US3] Create ArtifactService (create, get, list, download) in `backend/app/services/artifact_service.py`
- [ ] T068 [US3] Create create_artifact tool in `backend/app/agent/tools/create_artifact.py` (depends on T067)
- [ ] T069 [US3] Create read_artifact tool in `backend/app/agent/tools/read_artifact.py` (depends on T067)
- [ ] T070 [US3] Create artifacts router in `backend/app/api/artifacts.py` (depends on T067)
- [ ] T071 [US3] Add artifact tools to execution graph in `backend/app/agent/execution_graph.py`

### Stream B: Frontend [US3]

- [ ] T072 [P] [US3] Create ArtifactList component in `frontend/app/components/artifacts/ArtifactList.tsx`
- [ ] T073 [P] [US3] Create ArtifactListItem component in `frontend/app/components/artifacts/ArtifactListItem.tsx`
- [ ] T074 [P] [US3] Create ArtifactModal component (full-screen) in `frontend/app/components/artifacts/ArtifactModal.tsx`
- [ ] T075 [P] [US3] Create ArtifactPreview component in `frontend/app/components/artifacts/ArtifactPreview.tsx`
- [ ] T076 [P] [US3] Create markdown renderer utility in `frontend/app/lib/markdown.ts`
- [ ] T077 [US3] Wire artifact sidebar to session data in `frontend/app/components/layout/ArtifactSidebar.tsx`
- [ ] T078 [US3] Add artifact_created SSE handler in `frontend/app/pages/SessionPage.tsx`

**Checkpoint**: US3 complete - Users can see artifacts created by agent and view/download them

---

## Phase 6: User Story 4 - Agent CRUD Operations (P4)

**Goal**: Agent creates/reads/updates/deletes structured data items

**Independent Test**: Ask "Create contact list with 3 people" → "Update John's phone" → Verify changes

### Stream A: Backend [US4]

- [ ] T079 [P] [US4] Create DataItemService (CRUD operations) in `backend/app/services/data_item_service.py`
- [ ] T080 [US4] Create create_data_item tool in `backend/app/agent/tools/create_data_item.py` (depends on T079)
- [ ] T081 [US4] Create read_data_items tool in `backend/app/agent/tools/read_data_items.py` (depends on T079)
- [ ] T082 [US4] Create update_data_item tool in `backend/app/agent/tools/update_data_item.py` (depends on T079)
- [ ] T083 [US4] Create delete_data_item tool in `backend/app/agent/tools/delete_data_item.py` (depends on T079)
- [ ] T084 [US4] Create data-items router in `backend/app/api/data_items.py` (depends on T079)
- [ ] T085 [US4] Add CRUD tools to execution graph in `backend/app/agent/execution_graph.py`

### Stream B: Frontend [US4]

- [ ] T086 [P] [US4] Create DataItemList component in `frontend/app/components/session/DataItemList.tsx`
- [ ] T087 [P] [US4] Create DataItemCard component in `frontend/app/components/session/DataItemCard.tsx`
- [ ] T088 [US4] Add data items section to Session page in `frontend/app/pages/SessionPage.tsx`
- [ ] T089 [US4] Add data_modified SSE handler in `frontend/app/pages/SessionPage.tsx`

**Checkpoint**: US4 complete - Agent can manage structured data within sessions

---

## Phase 7: User Story 5 - Session Persistence (P5)

**Goal**: Users return to previous sessions → See full history

**Independent Test**: Create session with artifacts → Close browser → Reopen → Everything preserved

### Stream A: Backend [US5]

- [ ] T090 [US5] Add session listing with pagination in `backend/app/api/sessions.py`
- [ ] T091 [US5] Add session detail endpoint (with tasks, messages, artifacts, data) in `backend/app/api/sessions.py`
- [ ] T092 [US5] Ensure LangGraph checkpointer resumes correctly in `backend/app/services/agent_service.py`

### Stream B: Frontend [US5]

- [ ] T093 [US5] Update SessionSidebar to fetch and display all sessions in `frontend/app/components/layout/SessionSidebar.tsx`
- [ ] T094 [US5] Add session navigation (click to switch) in `frontend/app/components/layout/SessionSidebar.tsx`
- [ ] T095 [US5] Persist sidebar collapse state to localStorage in `frontend/app/hooks/useSidebarState.ts`
- [ ] T096 [US5] Add delete session functionality with confirmation in `frontend/app/components/session/SessionListItem.tsx`

**Checkpoint**: US5 complete - Full session persistence and navigation working

---

## Phase 8: User Story 6 - Chat Refinement (P6)

**Goal**: Users have back-and-forth conversation to refine tasks

**Independent Test**: Get initial tasks → Ask "Add budget planning task" → See updated list

### Stream A: Backend [US6]

- [ ] T097 [US6] Update planning graph to handle follow-up messages in `backend/app/agent/graph.py`
- [ ] T098 [US6] Add task update logic (add/remove/modify tasks) in `backend/app/services/task_service.py`

### Stream B: Frontend [US6]

- [ ] T099 [US6] Enable chat input after initial response in `frontend/app/pages/SessionPage.tsx`
- [ ] T100 [US6] Handle tasks_updated SSE event in `frontend/app/pages/SessionPage.tsx`

**Checkpoint**: US6 complete - Full conversational planning flow working

---

## Phase 9: Polish & Cross-Cutting

**Purpose**: Final integration and cleanup

- [ ] T101 [P] Add error boundary component in `frontend/app/components/ErrorBoundary.tsx`
- [ ] T102 [P] Add toast notifications for errors in `frontend/app/components/ui/toast.tsx`
- [ ] T103 [P] Add empty state components in `frontend/app/components/ui/empty-state.tsx`
- [ ] T104 [P] Verify all API error responses match OpenAPI spec in `backend/app/api/`
- [ ] T105 [P] Add request logging middleware in `backend/app/main.py`
- [ ] T106 Run mypy type checking on backend `backend/`
- [ ] T107 Run TypeScript strict checking on frontend `frontend/`
- [ ] T108 Validate against quickstart.md test scenarios

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
| US2 (P2) | US1 backend (T039-T043) | US1 frontend |
| US3 (P3) | US2 backend (T058) | US2 frontend |
| US4 (P4) | US2 backend (T058) | US3 (fully parallel) |
| US5 (P5) | Phase 2 only | US1-US4 (independent) |
| US6 (P6) | US1 backend (T039) | US2-US5 |

### Parallel Execution Map

```
Agent 1 (Backend)              Agent 2 (Frontend)
─────────────────              ──────────────────
T001-T004 (Setup)       ║      T005-T009 (Setup)
         ↓              ║               ↓
T010-T020 (Found.)      ║      T021-T033 (Found.)
         ↓              ║               ↓
T034-T043 (US1 BE)      ║      T044-T054 (US1 FE)
         ↓              ║               ↓
T055-T060 (US2 BE)      ║      T061-T066 (US2 FE)
         ↓              ║               ↓
T067-T071 (US3 BE)      ║      T072-T078 (US3 FE)
         ↓              ║               ↓
T079-T085 (US4 BE)      ║      T086-T089 (US4 FE)
         ↓              ║               ↓
T090-T092 (US5 BE)      ║      T093-T096 (US5 FE)
         ↓              ║               ↓
T097-T098 (US6 BE)      ║      T099-T100 (US6 FE)
         ↓              ║               ↓
         └──────────────╨───────────────┘
                        ↓
                 T101-T108 (Polish)
```

### Maximum Parallelism (4+ Agents)

```
Agent 1: Backend Setup → Backend Foundation → US1-US6 Backend
Agent 2: Frontend Setup → Frontend Foundation → US1-US6 Frontend
Agent 3: US3 + US4 Backend (after US2 BE done) - Can split tools
Agent 4: US3 + US4 Frontend (after US2 FE done) - Can split components
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1: Setup (both streams)
2. Complete Phase 2: Foundational (both streams)
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
| Setup | 9 | 9 (all parallel) |
| Foundational | 24 | 22 (BE/FE parallel) |
| US1 | 21 | 18 (within streams) |
| US2 | 12 | 10 (within streams) |
| US3 | 12 | 10 (within streams) |
| US4 | 11 | 8 (within streams) |
| US5 | 7 | 4 (within streams) |
| US6 | 4 | 2 (within streams) |
| Polish | 8 | 5 (independent) |
| **Total** | **108** | **88 parallelizable** |

---

## Notes

- All [P] tasks can run in parallel with other [P] tasks in same phase
- Backend (`backend/app/`) and Frontend (`frontend/app/`) are fully parallel streams
- Each user story has independent BE and FE work that can proceed simultaneously
- US3 and US4 have no dependencies on each other - can be fully parallelized
- US5 only depends on Phase 2, can start early and run parallel to US1-US4
- Commit after each task completion for clean git history
