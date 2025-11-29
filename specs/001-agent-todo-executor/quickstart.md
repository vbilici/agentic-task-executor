# Quickstart: Agent-Driven TODO Executor

**Feature**: 001-agent-todo-executor
**Date**: 2025-11-29

## Prerequisites

- Python 3.13+
- Node.js 20+
- uv (Python package manager)
- pnpm (Node.js package manager)
- Supabase account (or local PostgreSQL)
- Anthropic API key
- Tavily API key (free tier: 1000 searches/month)

## Environment Setup

### 1. Clone and Setup

```bash
cd libra

# Backend setup
cd backend
uv sync
cp .env.example .env
# Edit .env with your API keys

# Frontend setup
cd ../frontend
pnpm install
cp .env.example .env.local
```

### 2. Environment Variables

**Backend (.env)**:
```bash
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/libra

# AI Services
ANTHROPIC_API_KEY=sk-ant-...
TAVILY_API_KEY=tvly-...

# Server
HOST=0.0.0.0
PORT=8000
DEBUG=true
```

**Frontend (.env.local)**:
```bash
VITE_API_URL=http://localhost:8000
```

### 3. Database Setup

```bash
# If using Supabase, run the migration in the SQL editor
# Or use local PostgreSQL:
psql -U postgres -f backend/migrations/001_initial.sql
```

### 4. Start Development Servers

```bash
# Terminal 1: Backend
cd backend
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2: Frontend
cd frontend
pnpm dev
```

## Manual Test Scenarios

### User Story 1: Describe Goal and Get TODO List

**Test: Basic goal to TODO conversion**

1. Open http://localhost:5173
2. Click "New Session"
3. Type: "Plan a birthday party for 20 people"
4. Press Enter

**Expected**:
- Loading indicator appears within 500ms
- Agent responds with 3-10 tasks within 10 seconds
- Tasks include items like: venue, invitations, food, decorations
- Each task shows title, optional description, "pending" status
- Session title auto-generates from goal

**Test: Complex goal handling**

1. Create new session
2. Type: "Research competitors in the CRM market and create a comparison document"

**Expected**:
- Tasks generated for: research, analysis, document creation
- Tasks are ordered logically (research before document)

### User Story 2: Watch Agent Execute Tasks

**Test: Real-time execution visibility**

1. Create session with goal: "Find the current weather in Tokyo and New York"
2. Wait for tasks to generate
3. Click "Execute"

**Expected**:
- Execution button becomes disabled
- First task shows "in progress" indicator
- Execution log shows:
  - "Selected task: [task title]"
  - "Using tool: web_search"
  - "Tool input: {query: ...}"
  - "Tool result: ..."
- Task status updates to "done" with result
- Agent reflection appears in log
- Process repeats for next task
- Final summary shows completed/failed counts

**Test: Task failure handling**

1. Create session with goal: "Search for xyznonexistent12345 product reviews"
2. Execute tasks

**Expected**:
- Task marked as "failed" with error message
- Execution continues to next task
- Summary shows failure count

### User Story 3: Agent Creates Artifacts

**Test: Document creation with sidebar**

1. Create session: "Create a marketing plan for a new mobile app"
2. Execute tasks

**Expected**:
- During execution, "artifact_created" event appears
- Right sidebar slides open showing the artifact
- Sidebar displays: artifact name, type badge, truncated preview
- Multiple artifacts stack in sidebar list
- Collapse button hides sidebar (artifacts badge shows count)

**Test: Artifact full-screen modal**

1. Create session: "Create a marketing plan for a new mobile app"
2. Execute tasks until artifact is created
3. Click artifact in sidebar

**Expected**:
- Full-screen modal opens with artifact content
- Modal header shows: artifact name, type badge, download button, close button
- Full content displayed with syntax highlighting (markdown rendered)
- Press Escape key to close modal
- Click outside modal to close
- Click [X] button to close
- Download button downloads file with correct name/extension

**Test: Artifact sidebar interactions**

1. Create session with goal that produces multiple artifacts
2. Execute and wait for artifacts

**Expected**:
- Sidebar shows list of all artifacts with previews
- Click artifact opens modal, sidebar remains visible behind
- Close modal, click different artifact to view
- Sidebar persists across page navigation within session
- Sidebar collapse state remembered during session

**Test: Artifact size limit**

1. Ask agent to create very long document
2. If content exceeds 100KB:

**Expected**:
- Task fails with clear error message
- Agent may attempt to split content

### User Story 4: CRUD Operations

**Test: Create structured data**

1. Create session: "Create a contact list with 3 people: John (555-1234), Jane (555-5678), Bob (555-9012)"
2. Execute tasks

**Expected**:
- Data items panel shows 3 contacts
- Each contact has name and phone fields
- Items are organized by type "contact"

**Test: Update data**

1. Continue session: "Update John's phone number to 555-0000"
2. Execute

**Expected**:
- John's contact shows updated phone number
- Updated timestamp changes

**Test: Delete data**

1. Continue session: "Remove Bob from the contact list"
2. Execute

**Expected**:
- Bob's contact no longer appears
- Only John and Jane remain

### User Story 5: Session Persistence

**Test: Return to session**

1. Create session with tasks and artifacts
2. Note the session ID from URL
3. Close browser completely
4. Reopen browser, navigate to session URL

**Expected**:
- Full conversation history visible
- Task list with statuses preserved
- Artifacts accessible
- Data items visible

**Test: Left sidebar session navigation**

1. Create 3+ sessions with different goals
2. Observe left sidebar

**Expected**:
- All sessions visible in left sidebar
- Most recent at top
- Current session highlighted with filled dot (●)
- Other sessions show empty dot (○)
- Session title and status (planning/executing/completed) visible
- Click different session to navigate instantly

**Test: Sidebar collapse/expand**

1. Click collapse button [«] on left sidebar
2. Observe collapsed state
3. Click expand button [»]

**Expected**:
- Sidebar collapses to icon-only mode (~48px width)
- New Session (+) button still visible
- Session dots still visible and clickable
- Expand button visible at bottom
- Collapse state persists on page refresh (localStorage)

**Test: New session from sidebar**

1. Click [+ New] button in left sidebar

**Expected**:
- New session created
- Navigated to new session
- New session appears at top of sidebar
- New session highlighted as current

**Test: Delete session**

1. Right-click session in sidebar (or use context menu)
2. Select "Delete"

**Expected**:
- Confirmation prompt appears
- Session removed from sidebar
- If current session deleted, navigate to most recent
- Tasks, artifacts, data items cascade deleted

### User Story 6: Chat Refinement

**Test: Follow-up messages**

1. Create session: "Plan a team building event"
2. Wait for initial tasks
3. Send: "Add a task for booking transportation"

**Expected**:
- Agent acknowledges request
- Task list updates with new task
- Streaming response visible

**Test: Clarification**

1. Create session: "Make something"
2. Wait for response

**Expected**:
- Agent asks for clarification
- Example of good goal provided

## API Test Scenarios

### Session Management

```bash
# Create session
curl -X POST http://localhost:8000/sessions

# List sessions
curl http://localhost:8000/sessions

# Get session details
curl http://localhost:8000/sessions/{id}

# Delete session
curl -X DELETE http://localhost:8000/sessions/{id}
```

### Chat (SSE)

```bash
# Send message and stream response
curl -N -X POST http://localhost:8000/sessions/{id}/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Plan a birthday party"}'
```

### Execute Tasks (SSE)

```bash
# Start execution and stream events
curl -N -X POST http://localhost:8000/sessions/{id}/execute
```

### Artifacts

```bash
# List artifacts
curl http://localhost:8000/sessions/{id}/artifacts

# Get artifact
curl http://localhost:8000/sessions/{id}/artifacts/{artifactId}

# Download artifact
curl http://localhost:8000/sessions/{id}/artifacts/{artifactId}/download
```

### Data Items

```bash
# List data items
curl http://localhost:8000/sessions/{id}/data-items

# List by type
curl "http://localhost:8000/sessions/{id}/data-items?item_type=contact"
```

## Success Criteria Validation

| Criterion | Test | Expected |
|-----------|------|----------|
| SC-001: TODO in <10s | Time goal submission to task display | < 10 seconds |
| SC-002: Updates in <500ms | Measure SSE event latency | < 500ms |
| SC-003: Session persistence | Close/reopen browser test | All data preserved |
| SC-004: Quality tasks | Review 10 different goals | 90%+ have actionable tasks |
| SC-005: Autonomous execution | Run 10 task sets | Complete without intervention |
| SC-006: Full flow <5min | Time new session to completion | < 5 minutes for simple goal |
| SC-007: UI responsiveness | Monitor during execution | No freezing |
| SC-008: Artifact access | Create and download artifacts | Viewable and downloadable |
| SC-009: CRUD persistence | Create items, refresh page | Items persist |

## Common Issues

### Backend won't start

- Check DATABASE_URL is correct
- Ensure PostgreSQL is running
- Verify API keys are set

### SSE not streaming

- Check browser supports EventSource
- Verify CORS is configured
- Check for proxy issues (nginx buffer)

### Tasks not generating

- Check ANTHROPIC_API_KEY is valid
- Review backend logs for errors
- Verify model is available

### Web search fails

- Check TAVILY_API_KEY is valid
- Verify not rate limited (1000/month free)
- Check query format
