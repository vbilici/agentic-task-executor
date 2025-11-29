# Agent-Driven TODO Executor - Implementation Plan

## Overview
Build a full-stack application where an AI agent chats with users about goals, generates structured TODO lists, and executes tasks in a loop with real-time visibility.

## Tech Stack
- **Backend**: FastAPI + LangGraph + LangChain
- **Package Managers**: uv (backend), pnpm (frontend)
- **Database**: Supabase (PostgreSQL)
- **State Persistence**: LangGraph Postgres Checkpointer (`langgraph-checkpoint-postgres`)
- **Frontend**: Vite + React + shadcn/ui + Tailwind CSS
- **LLM**: OpenAI GPT-4 (via LangChain)
- **Real-time**: SSE (Server-Sent Events) for execution updates

--

## Architecture

### High-Level Flow
```
User Goal → Planning Agent → TODO List → Execution Loop → Results
     ↑                                          ↓
     └──────────── Chat Interface ←─────────────┘
```

### LangGraph State Machine
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   PLANNING  │ ──→ │  EXECUTING  │ ──→ │  COMPLETE   │
└─────────────┘     └─────────────┘     └─────────────┘
       ↑                   │
       └───────────────────┘ (if needs replanning)
```

---

## Project Structure

```
libra/
├── supabase/
│   └── migrations/         # Database migrations
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI app entry
│   │   ├── config.py            # Settings & env vars
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   └── routes/
│   │   │       ├── chat.py      # Chat endpoints + SSE streaming
│   │   │       ├── sessions.py  # Session management
│   │   │       ├── tasks.py     # Task endpoints
│   │   │       └── execute.py   # Execution endpoints + SSE streaming
│   │   ├── agent/
│   │   │   ├── __init__.py
│   │   │   ├── graph.py         # LangGraph definition
│   │   │   ├── nodes.py         # Planning, execution nodes
│   │   │   ├── state.py         # Agent state schema
│   │   │   └── tools.py         # Task execution tools
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── schemas.py       # Pydantic models
│   │   │   └── database.py      # Supabase models
│   │   └── services/
│   │       ├── __init__.py
│   │       ├── database.py      # Supabase/Postgres client
│   │       ├── checkpoint.py    # LangGraph checkpoint setup
│   │       └── session.py       # Session service
│   ├── pyproject.toml
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # Main app with routing
│   │   ├── main.tsx             # Vite entry point
│   │   ├── components/
│   │   │   ├── chat/
│   │   │   │   ├── ChatContainer.tsx
│   │   │   │   ├── MessageList.tsx
│   │   │   │   ├── MessageBubble.tsx
│   │   │   │   └── ChatInput.tsx
│   │   │   ├── tasks/
│   │   │   │   ├── TaskList.tsx
│   │   │   │   ├── TaskCard.tsx
│   │   │   │   └── TaskStatus.tsx
│   │   │   ├── execution/
│   │   │   │   └── ExecutionStream.tsx
│   │   │   └── ui/              # shadcn components
│   │   ├── pages/
│   │   │   ├── Home.tsx         # Landing/create session
│   │   │   └── Session.tsx      # Main chat+tasks view
│   │   ├── lib/
│   │   │   ├── api.ts           # API client
│   │   │   └── types.ts         # TypeScript types
│   │   └── hooks/
│   │       ├── useSession.ts
│   │       ├── useChat.ts
│   │       └── useSSE.ts        # EventSource hook
│   ├── package.json
│   └── .env.example
└── README.md
```

---

## Database Schema (Supabase)

### LangGraph Checkpoint Tables
LangGraph Postgres Checkpointer automatically creates and manages its own tables for:
- Chat messages / conversation history
- Agent state persistence
- Checkpoint data for resuming sessions

```python
# Initialize checkpointer - tables created automatically
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

async with AsyncPostgresSaver.from_conn_string(DATABASE_URL) as checkpointer:
    await checkpointer.setup()  # Creates checkpoint tables
```

### Application Tables (Manual)

```sql
-- Sessions metadata table (lightweight - just for listing/management)
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id TEXT UNIQUE NOT NULL,  -- LangGraph thread ID for checkpoint lookup
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  title TEXT,  -- Auto-generated from first message
  status TEXT DEFAULT 'planning'  -- planning, executing, completed
);

-- Tasks table (extracted from agent state for UI display)
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  order_index INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending', -- pending, in_progress, done, failed, needs_followup
  result TEXT,
  reflection TEXT
);
```

**Note**: Execution logs are streamed via SSE and printed to terminal - not persisted to database.

**Note**: Messages are stored in LangGraph checkpoints, not a separate table. The frontend fetches conversation history via the agent state.

---

## API Endpoints

### REST API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/sessions` | Create new session |
| GET | `/api/sessions/{id}` | Get session with tasks |
| POST | `/api/sessions/{id}/chat` | Send message, get response |
| POST | `/api/sessions/{id}/execute` | Start execution loop |
| GET | `/api/sessions/{id}/tasks` | Get all tasks |

### SSE (Server-Sent Events)

| Endpoint | Description |
|----------|-------------|
| `GET /api/sessions/{id}/execute/stream` | SSE stream for real-time task updates during execution |
| `GET /api/sessions/{id}/chat/stream` | SSE stream for streaming chat responses |

---

## LangGraph Agent Design

### State Schema
```python
class AgentState(TypedDict):
    session_id: str
    messages: list[BaseMessage]
    tasks: list[Task]
    current_task_index: int
    phase: Literal["planning", "executing", "complete"]
```

### Nodes

1. **planning_node**:
   - Input: User goal message
   - Output: Structured TODO list
   - Uses structured output to generate tasks

2. **select_task_node**:
   - Input: Current state with tasks
   - Output: Next task to execute (first pending)

3. **execute_task_node**:
   - Input: Selected task
   - Output: Task result (mocked or real execution)
   - Updates task status

4. **reflect_node**:
   - Input: Task execution result
   - Output: Reflection, possible status adjustment

5. **check_completion_node**:
   - Input: All tasks
   - Output: Route to next task or complete

### Graph Flow
```
START → planning → select_task → execute_task → reflect → check_completion
                        ↑                                       │
                        └───────────────────────────────────────┘
                                    (if tasks remaining)
```

---

## Implementation Steps

### Phase 1: Backend Foundation
1. Initialize Python project with uv (`uv init`)
2. Set up FastAPI application structure
3. Configure Supabase connection
4. Create database tables via Supabase dashboard
5. Implement basic CRUD for sessions, messages, tasks

### Phase 2: LangGraph Agent
1. Define state schema
2. Implement planning node with structured output
3. Implement execution loop nodes
4. Add reflection capability
5. Wire up the graph with conditional edges
6. Configure LangGraph Postgres checkpointer for state persistence

### Phase 3: API Integration
1. Create chat endpoint that invokes planning
2. Create execute endpoint with SSE streaming
3. Implement StreamingResponse for real-time updates

### Phase 4: Frontend
1. Initialize Vite + React project with shadcn/ui
2. Build chat interface components
3. Build task list visualization with status indicators
4. Build execution stream component (SSE consumer)
5. Connect to backend API

### Phase 5: Polish & Documentation
1. Error handling and edge cases
2. Loading states and animations
3. Write comprehensive README
4. Record demo video
5. Document extension possibilities

---

## Agent Tools

The agent will have access to 3 real tools for task execution:

### 1. Web Search (Tavily)
```python
@tool
def web_search(query: str) -> str:
    """Search the web for information using Tavily API."""
    client = TavilyClient(api_key=settings.TAVILY_API_KEY)
    response = client.search(query, max_results=5)
    return format_search_results(response)
```
- Requires `TAVILY_API_KEY` environment variable
- Free tier: 1000 searches/month

### 2. Calculator
```python
@tool
def calculator(expression: str) -> str:
    """Evaluate a mathematical expression safely."""
    # Use numexpr or ast.literal_eval for safe evaluation
    result = safe_eval(expression)
    return f"Result: {result}"
```
- No external API needed
- Supports basic arithmetic and math functions

### 3. Current Date/Time
```python
@tool
def get_current_datetime(timezone: str = "UTC") -> str:
    """Get the current date and time in specified timezone."""
    tz = pytz.timezone(timezone)
    now = datetime.now(tz)
    return now.strftime("%Y-%m-%d %H:%M:%S %Z")
```
- No external API needed
- Supports timezone conversion

### Tool Selection During Execution

The agent will analyze each task and decide which tool(s) to use:
- Tasks requiring information → Web Search
- Tasks involving calculations → Calculator
- Tasks needing current time → DateTime tool
- Tasks with no tool match → Mark as "needs manual intervention"

---

## Real-time Updates Flow

```
Frontend (Vite/React)                 Backend (FastAPI)
       │                                      │
       │  GET /execute/stream (SSE)           │
       │ ────────────────────────────────────→│
       │                                      │  Run agent loop
       │          event: task_selected        │
       │←─────────────────────────────────────│
       │          event: task_executing       │
       │←─────────────────────────────────────│
       │          event: task_completed       │
       │←─────────────────────────────────────│
       │          event: execution_done       │
       │←─────────────────────────────────────│
       │  Update UI                           │
```

Using SSE for streaming execution updates. Supabase used for persistence only.

### Execution Log Format

Each execution step is streamed via SSE and displayed in the chat/execution panel:

```
📋 Selected task #2: "Research competitor pricing"
🔧 Using tool: web_search("competitor pricing SaaS 2024")
✅ Result: Found 5 relevant sources
💭 Reflection: Pricing data collected, moving to analysis task
```

**SSE Event Payloads:**
```json
{"event": "task_selected", "data": {"task_index": 2, "title": "Research competitor pricing"}}
{"event": "tool_call", "data": {"tool": "web_search", "input": "competitor pricing SaaS 2024"}}
{"event": "task_completed", "data": {"task_index": 2, "status": "done", "result": "Found 5 relevant sources"}}
{"event": "reflection", "data": {"task_index": 2, "content": "Pricing data collected, moving to analysis task"}}
```

Backend also prints these to terminal for debugging.

---

## Environment Variables

### Backend (.env)
```
OPENAI_API_KEY=sk-...
TAVILY_API_KEY=tvly-...      # For web search tool
DATABASE_URL=postgresql://postgres:xxx@db.xxx.supabase.co:5432/postgres  # For LangGraph checkpoint
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=eyJ...
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:8000
```

---

## Type Synchronization

Pydantic models are the single source of truth. TypeScript types are auto-generated from OpenAPI.

**Setup (frontend):**
```bash
pnpm add -D openapi-typescript
```

**package.json script:**
```json
{
  "scripts": {
    "gen-types": "openapi-typescript http://localhost:8000/openapi.json -o src/lib/api-types.ts"
  }
}
```

**Workflow:**
1. Define/update Pydantic models in backend
2. Run backend locally
3. Run `pnpm gen-types` in frontend
4. Commit generated `api-types.ts`

**Generated types example:**
```typescript
export interface Session {
  id: string;
  thread_id: string;
  title: string | null;
  status: "planning" | "executing" | "completed";
}

export interface Task {
  id: string;
  session_id: string;
  order_index: number;
  title: string;
  status: "pending" | "in_progress" | "done" | "failed";
  result: string | null;
}
```

**Rule:** Never manually write API types in frontend - always generate from OpenAPI spec.

---

## Extension Ideas (for README)

1. **Real Task Execution**: Integrate with actual tools (web search, code execution, API calls)
2. **Multi-Agent**: Specialized agents for different task types
3. **Human-in-the-Loop**: Approval workflow for certain tasks
4. **Task Dependencies**: DAG-based execution instead of linear
5. **Retry Logic**: Automatic retries with exponential backoff
6. **Analytics**: Track success rates, execution times
7. **Templates**: Pre-built TODO templates for common goals
