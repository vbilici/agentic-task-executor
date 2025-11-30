# Feature Specification: Agent-Driven TODO Executor

**Feature Branch**: `001-agent-todo-executor`
**Created**: 2025-11-29
**Status**: Draft
**Input**: User description: "Build full-stack Agent-Driven TODO Executor MVP with artifact creation and CRUD operations"

## Clarifications

### Session 2025-11-29

- Q: How long do sessions persist and can users delete them? → A: Sessions persist indefinitely; users can delete them manually.
- Q: What is the maximum size for artifact content? → A: 100KB per artifact (sufficient for medium documents).
- Q: How should artifacts be displayed in the UI? → A: Right sidebar panel shows artifact list with previews. Clicking an artifact opens a full-screen modal for viewing complete content. Modal includes: artifact title, type badge, full content with syntax highlighting, download button, and close (X) button. Sidebar remains for quick switching between artifacts.
- Q: How should sessions be navigated? → A: Permanent left sidebar with collapsible state. Always visible but can collapse to icon-only mode (showing just session icons/avatars). Expanded shows session titles, status, timestamps. "New Session" button always visible. Current session highlighted. Collapse state persisted in localStorage.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Describe Goal and Get TODO List (Priority: P1)

A user opens the application, starts a new session, and describes what they want to accomplish in natural language. The AI agent analyzes their goal and generates a structured TODO list with clear, actionable tasks.

**Why this priority**: This is the core value proposition - users need to be able to communicate goals and receive organized task breakdowns before anything else can happen.

**Independent Test**: Can be fully tested by typing a goal like "Plan a birthday party for 20 people" and verifying a structured task list appears with relevant, actionable items.

**Acceptance Scenarios**:

1. **Given** a user is on the home page, **When** they click "New Session", **Then** they are taken to a chat interface where they can type their goal.
2. **Given** a user is in a new session, **When** they type a goal like "Research competitors in the CRM market", **Then** the agent responds with a structured TODO list containing 3-10 specific, actionable tasks.
3. **Given** a user has submitted a goal, **When** the agent is generating the TODO list, **Then** the user sees a loading indicator showing the agent is working.
4. **Given** the agent has generated tasks, **When** the task list is displayed, **Then** each task shows a title, optional description, and "pending" status.

---

### User Story 2 - Watch Agent Execute Tasks in Real-Time (Priority: P2)

After the TODO list is generated, the user can trigger the agent to begin executing tasks. As the agent works through each task, the user sees real-time updates showing which task is selected, what tool is being used, the result, and the agent's reflection.

**Why this priority**: Real-time visibility is the key differentiator - users need to see the agent working to trust and understand what it's doing.

**Independent Test**: Can be fully tested by generating a TODO list with tasks requiring web search (e.g., "Find current weather in Tokyo") and observing real-time status updates as the agent executes.

**Acceptance Scenarios**:

1. **Given** a session with a generated TODO list, **When** the user clicks "Execute", **Then** the agent begins processing tasks sequentially.
2. **Given** execution has started, **When** the agent selects a task, **Then** the UI immediately shows which task is being worked on with an "in progress" indicator.
3. **Given** a task is in progress, **When** the agent uses a tool (web search, calculator, datetime, artifact creation, CRUD), **Then** the user sees the tool name and input in the execution log.
4. **Given** a task completes, **When** the result is returned, **Then** the UI updates to show the task status as "done" or "failed" with the result/error.
5. **Given** a task completes, **When** the agent reflects on the result, **Then** the reflection text appears in the execution log.
6. **Given** all tasks are complete, **When** execution finishes, **Then** the user sees a summary and the session status changes to "completed".

---

### User Story 3 - Agent Creates and Manages Artifacts (Priority: P3)

During task execution, the agent can create artifacts (documents, notes, summaries, plans) and store them within the session. Users can view, download, or reference these artifacts.

**Why this priority**: Artifacts give the agent tangible output beyond just completing tasks - users get deliverables they can use.

**Independent Test**: Can be tested by asking the agent to "Create a marketing plan document" and verifying an artifact is created with viewable content.

**Acceptance Scenarios**:

1. **Given** a task requires creating a document, **When** the agent executes that task, **Then** an artifact is created with a name, type, and content.
2. **Given** artifacts have been created in a session, **When** the user views the session, **Then** they see a list of all artifacts with their names and types.
3. **Given** an artifact exists, **When** the user clicks on it, **Then** they can view the full content.
4. **Given** an artifact exists, **When** the user wants to save it, **Then** they can download it as a file.
5. **Given** a later task needs to reference a previous artifact, **When** the agent executes, **Then** it can read and use the artifact's content.

---

### User Story 4 - Agent Performs CRUD on Session Data (Priority: P4)

The agent can create, read, update, and delete data items within a session (e.g., notes, contacts, items in a list). This enables tasks that involve managing structured information.

**Why this priority**: CRUD capabilities make the agent useful for organizational tasks, but basic execution and artifacts should work first.

**Independent Test**: Can be tested by asking the agent to "Create a contact list with 3 people" and then "Update John's phone number" and verifying the data changes.

**Acceptance Scenarios**:

1. **Given** a task requires creating structured data, **When** the agent executes, **Then** a data item is created with appropriate fields.
2. **Given** data items exist in a session, **When** the user views the session, **Then** they see a list of data items organized by type.
3. **Given** a task requires updating existing data, **When** the agent executes, **Then** the specified data item is modified.
4. **Given** a task requires deleting data, **When** the agent executes, **Then** the specified data item is removed.
5. **Given** a task requires reading data, **When** the agent executes, **Then** it can access and use the stored data in its response.

---

### User Story 5 - Return to Previous Sessions (Priority: P5)

Users can close the browser and return later to see their previous sessions. They can view the conversation history, task list, artifacts, and data from past sessions.

**Why this priority**: Session persistence enables users to work on longer goals across multiple visits, but the core features must work first.

**Independent Test**: Can be fully tested by creating a session with artifacts, closing the browser, reopening, and verifying everything is preserved.

**Acceptance Scenarios**:

1. **Given** a user has completed at least one session, **When** they visit the home page, **Then** they see a list of their previous sessions with titles and status.
2. **Given** a session list is displayed, **When** the user clicks on a session, **Then** they see the full conversation history, task list, artifacts, and data.
3. **Given** a user is viewing a previous session, **When** the session was in "planning" status, **Then** they can continue the conversation or trigger execution.

---

### User Story 6 - Chat with Agent During Planning (Priority: P6)

Users can have a back-and-forth conversation with the agent to refine their goal or ask clarifying questions before the TODO list is finalized.

**Why this priority**: Conversational refinement improves task quality but is an enhancement to the core single-shot planning flow.

**Independent Test**: Can be tested by asking follow-up questions like "Can you add a task for budget planning?" and seeing the task list update.

**Acceptance Scenarios**:

1. **Given** a user has received an initial TODO list, **When** they send a follow-up message, **Then** the agent updates the task list accordingly.
2. **Given** a conversation is in progress, **When** the agent responds, **Then** the response streams in real-time.

**Implementation Note**: The planning agent uses a two-node graph architecture where the chat node handles conversational responses (streamed to the user) and a separate extract_tasks node uses structured output to reliably extract TODO items from the conversation. This separation ensures users see natural conversation while the system cleanly extracts structured task data in the background.

---

### Edge Cases

- What happens when the user submits an empty or very vague goal?
  - System prompts user to be more specific with an example of a good goal
- What happens when the agent cannot complete a task (e.g., web search fails)?
  - Task is marked as "failed" with an error message, agent continues to next task
- What happens when the user closes the browser during execution?
  - Execution continues on the server; user can return and see progress/results
- What happens when there's a network interruption during SSE streaming?
  - Frontend automatically attempts to reconnect; missed events are recovered from current state
- What happens when artifact creation fails (e.g., content too large)?
  - Task fails with explanation; agent may attempt to split into smaller artifacts
- What happens when CRUD operation targets non-existent data?
  - Operation fails gracefully with clear error message; agent can adapt

## Requirements *(mandatory)*

### Functional Requirements

**Session Management**
- **FR-001**: System MUST allow users to create new sessions with a single click
- **FR-002**: System MUST accept natural language goal descriptions via a chat input
- **FR-003**: System MUST persist sessions indefinitely so users can return to them later
- **FR-004**: System MUST display a list of previous sessions on the home page
- **FR-005**: System MUST automatically generate a session title from the first user message
- **FR-006**: System MUST allow users to delete sessions (cascading to tasks, artifacts, and data items)

**Task Planning**
- **FR-007**: System MUST generate a structured TODO list (3-10 tasks) from a user's goal description using structured output extraction
- **FR-008**: System MUST display each task with title, description (optional), and status
- **FR-009**: System MUST allow streaming chat responses during planning conversation (using SSE)
- **FR-009a**: System MUST use React refs to prevent re-render loops during SSE streaming (implementation detail: `optionsRef` and `streamingContentRef` pattern)

**Task Execution**
- **FR-010**: System MUST allow users to trigger task execution after planning
- **FR-011**: System MUST execute tasks sequentially, updating status in real-time
- **FR-012**: System MUST stream execution updates (task selection, tool usage, results, reflections) to the UI
- **FR-013**: System MUST handle task failures gracefully and continue to the next task
- **FR-014**: System MUST show loading/progress indicators during all async operations

**Agent Tools**
- **FR-015**: Agent MUST have access to a web search tool for information retrieval
- **FR-016**: Agent MUST have access to a calculator tool for mathematical operations
- **FR-017**: Agent MUST have access to a date/time tool for temporal information
- **FR-018**: Agent MUST be able to create artifacts (documents, notes, summaries, plans)
- **FR-019**: Agent MUST be able to perform CRUD operations on session data items

**Artifacts**
- **FR-020**: System MUST store artifacts with name, type, and content (max 100KB per artifact)
- **FR-021**: System MUST display a list of artifacts within a session
- **FR-022**: System MUST allow users to view artifact content
- **FR-023**: System MUST allow users to download artifacts as files
- **FR-024**: System MUST reject artifact creation exceeding the 100KB size limit with a clear error

**Data Items (CRUD)**
- **FR-025**: System MUST allow agent to create structured data items within a session
- **FR-026**: System MUST allow agent to read existing data items
- **FR-027**: System MUST allow agent to update existing data items
- **FR-028**: System MUST allow agent to delete data items
- **FR-029**: System MUST display data items organized by type within a session

### Key Entities

- **Session**: Represents a user's goal-pursuit journey. Contains a unique identifier, title (auto-generated), status (planning/executing/completed), creation timestamp, and associations with conversation history, tasks, artifacts, and data items.

- **Task**: A single actionable item within a session's TODO list. Contains title, optional description, status (pending/in_progress/done/failed), execution result, agent reflection, and order within the list.

- **Message**: A single exchange in the conversation between user and agent. Part of the conversation history within a session.

- **Artifact**: A created deliverable within a session. Contains name, type (document/note/summary/plan/other), content, creation timestamp, and association with the creating task.

- **DataItem**: A structured piece of information within a session. Contains type/category, key-value data, creation timestamp, and modification history.

- **Execution Event**: A real-time update during task execution. Types include task_selected, tool_call, artifact_created, data_modified, task_completed, and reflection.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can describe a goal and receive a TODO list within 10 seconds
- **SC-002**: Real-time execution updates appear within 500ms of occurring on the server
- **SC-003**: Users can return to any previous session and see its full history, artifacts, and data
- **SC-004**: 90% of generated TODO lists contain actionable, relevant tasks for the stated goal
- **SC-005**: Task execution completes without user intervention for tasks within tool capabilities
- **SC-006**: Users can complete the full flow (new session -> goal -> TODO list -> execute -> see results) in under 5 minutes for a simple goal
- **SC-007**: The application remains responsive during task execution (no UI freezing)
- **SC-008**: Artifacts created by the agent are viewable and downloadable by users
- **SC-009**: Data items created via CRUD operations persist across browser sessions

## Assumptions

- Users have a modern web browser with JavaScript enabled
- Users have a stable internet connection for real-time streaming
- The Tavily API free tier (1000 searches/month) is sufficient for demo/interview purposes
- No user authentication is required - sessions are accessible to anyone with the URL
- Single-user usage pattern - no concurrent editing of the same session
- Artifact content is text-based (no binary files like images in MVP)
- Data items are JSON-serializable structured data
