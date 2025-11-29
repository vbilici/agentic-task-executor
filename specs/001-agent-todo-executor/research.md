# Research: Agent-Driven TODO Executor

**Feature**: 001-agent-todo-executor
**Date**: 2025-11-29

## Technology Decisions

### 1. LangGraph v1 + FastAPI Integration

**Decision**: Use LangGraph v1 with `langchain.agents.create_agent` pattern

**Rationale**:
- LangGraph 1.0 has zero breaking changes from v0, full backward compatibility
- `create_react_agent` from `langgraph.prebuilt` is deprecated in favor of `langchain.agents.create_agent`
- v1 provides middleware system for customization (before_model, after_model hooks)
- StateGraph pattern with TypedDict is the recommended approach for custom state

**Alternatives Considered**:
- Raw LangGraph StateGraph: More control but more boilerplate for standard agent pattern
- LangChain legacy chains: Moved to `langchain-classic`, not recommended for new projects

**Key Implementation Patterns**:

```python
# Installation
# uv add langchain langchain-core langgraph langgraph-checkpoint-postgres "psycopg[binary,pool]"

# Agent creation (v1 pattern)
from langchain.agents import create_agent

agent = create_agent(
    model="claude-sonnet-4-5-20250929",
    tools=[search_web, create_artifact, crud_operations],
    system_prompt="You are a helpful TODO executor agent..."
)

# State schema (must be TypedDict in v1)
from typing import TypedDict, Annotated
from langgraph.graph.message import add_messages

class AgentState(TypedDict):
    messages: Annotated[list, add_messages]
    session_id: str
    tasks: list[dict]
```

### 2. Postgres Checkpointer Setup

**Decision**: Use `AsyncPostgresSaver` with connection pooling via Supabase PostgreSQL

**Rationale**:
- LangGraph Postgres Checkpointer provides durable state persistence
- Sessions resumable after crashes, restarts, or disconnections
- Thread IDs map deterministically to sessions
- Connection pooling essential for production workloads

**Key Implementation**:

```python
# uv add langgraph-checkpoint-postgres "psycopg[binary,pool]"

from psycopg_pool import AsyncConnectionPool
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

# Connection pool with required settings
pool = AsyncConnectionPool(
    conninfo=DATABASE_URL,
    max_size=20,
    open=False,
    timeout=5
)
await pool.open(wait=True, timeout=5)

checkpointer = AsyncPostgresSaver(conn=pool)
await checkpointer.setup()  # Creates tables on first use

# Compile graph with persistence
graph = builder.compile(checkpointer=checkpointer)

# Thread management
config = {"configurable": {"thread_id": f"session_{session_id}"}}
```

**Critical Requirements**:
- Must call `.setup()` on first use to create checkpoint tables
- For manual connections: `autocommit=True` and `row_factory=dict_row` required
- Thread IDs should be unique per session

### 3. SSE Streaming Pattern

**Decision**: Use `astream_events(version="v2")` for real-time updates

**Rationale**:
- Constitution requires <500ms feedback for all operations
- SSE provides server-push without WebSocket complexity
- `astream_events` v2 is the recommended API in LangGraph v1

**Backend Pattern (FastAPI)**:

```python
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
import json

@app.post("/sessions/{session_id}/execute")
async def execute_tasks(session_id: str):
    async def event_generator():
        config = {"configurable": {"thread_id": f"session_{session_id}"}}

        async for event in graph.astream_events(
            {"messages": messages},
            config=config,
            version="v2"
        ):
            event_name = event["event"]

            if event_name == "on_chat_model_stream":
                chunk = event["data"]["chunk"]
                yield f"event: llm_stream\ndata: {json.dumps({'content': chunk.content})}\n\n"

            elif event_name == "on_tool_start":
                yield f"event: tool_start\ndata: {json.dumps({'tool': event['name']})}\n\n"

            elif event_name == "on_tool_end":
                yield f"event: tool_end\ndata: {json.dumps({'output': str(event['data']['output'])})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
```

**Frontend Pattern (React + TypeScript)**:

```typescript
const useSSE = <T>(url: string) => {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      setData(JSON.parse(event.data));
    };

    eventSource.onerror = (err) => {
      setError(err as Error);
      // Exponential backoff reconnection
    };

    return () => eventSource.close();
  }, [url]);

  return { data, error };
};
```

### 4. Tavily API Integration

**Decision**: Use Tavily as the web search tool with caching for free tier optimization

**Rationale**:
- Free tier provides 1000 searches/month (sufficient for demo)
- Direct integration with LangChain tools
- Response includes AI-extracted relevant snippets

**Key Implementation**:

```python
# uv add tavily-python langchain-tavily

from langchain_tavily import TavilySearch

# Basic search tool
search_tool = TavilySearch(
    max_results=5,
    search_depth="basic",  # 1 credit vs 2 for "advanced"
)

# Rate limit optimization
# - Cache results locally (query hash as key)
# - Use search_depth="basic" for simple lookups
# - Batch under 90 requests/min
```

**Error Handling**:
- `MissingAPIKeyError`: API key not configured
- `InvalidAPIKeyError`: Invalid API key
- `UsageLimitExceededError`: Monthly quota exceeded

### 5. Tool Implementation Pattern

**Decision**: Use `@tool` decorator with `ToolRuntime` for state access

**Rationale**:
- LangChain v1 unified state access via `ToolRuntime`
- Replaces deprecated `InjectedState`, `InjectedStore`, `InjectedToolCallId`
- Type-safe state access with TypedDict

**Tool Examples**:

```python
from langchain.tools import tool, ToolRuntime
from typing import TypedDict

class SessionState(TypedDict):
    messages: list
    session_id: str
    artifacts: list[dict]
    data_items: list[dict]

@tool
def create_artifact(
    name: str,
    content: str,
    artifact_type: str,
    runtime: ToolRuntime[None, SessionState]
) -> str:
    """Create a new artifact (document, note, summary, plan) in the session."""
    session_id = runtime.state["session_id"]
    # Persist to database
    artifact = save_artifact(session_id, name, content, artifact_type)
    return f"Created artifact: {name}"

@tool
def web_search(query: str) -> str:
    """Search the web for information."""
    results = tavily_client.search(query, max_results=5)
    return format_search_results(results)

@tool
def create_data_item(
    item_type: str,
    data: dict,
    runtime: ToolRuntime[None, SessionState]
) -> str:
    """Create a structured data item in the session."""
    session_id = runtime.state["session_id"]
    item = save_data_item(session_id, item_type, data)
    return f"Created {item_type}: {data}"
```

### 6. Frontend Architecture

**Decision**: Vite + React 18 + shadcn/ui + Tailwind CSS

**Rationale**:
- Constitution specifies Vite + React (no SSR needed for SPA)
- shadcn/ui provides accessible, customizable components
- TypeScript strict mode for type safety
- EventSource API for SSE consumption

**Key Patterns**:

```typescript
// Type-safe SSE events
type ExecutionEvent =
  | { type: 'task_selected'; taskId: string }
  | { type: 'tool_call'; tool: string; input: unknown }
  | { type: 'tool_result'; output: string }
  | { type: 'task_completed'; taskId: string; status: 'done' | 'failed' }
  | { type: 'reflection'; text: string };

// State management with reducer for streaming updates
type SSEAction =
  | { type: 'MESSAGE'; payload: ExecutionEvent }
  | { type: 'ERROR'; payload: Error }
  | { type: 'CONNECTED' }
  | { type: 'DISCONNECTED' };
```

## Package Dependencies

### Backend (Python 3.13)

```toml
# pyproject.toml
[project]
dependencies = [
    "fastapi>=0.115.0",
    "uvicorn[standard]>=0.32.0",
    "langchain>=1.0.0",
    "langchain-core>=1.0.0",
    "langchain-anthropic>=0.3.0",
    "langgraph>=1.0.0",
    "langgraph-checkpoint-postgres>=3.0.0",
    "psycopg[binary,pool]>=3.2.0",
    "tavily-python>=0.5.0",
    "langchain-tavily>=0.2.0",
    "pydantic>=2.10.0",
    "python-dotenv>=1.0.0",
    "httpx>=0.28.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0.0",
    "pytest-asyncio>=0.24.0",
    "mypy>=1.13.0",
    "ruff>=0.8.0",
]
```

### Frontend (TypeScript)

```json
{
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^7.0.0",
    "@tanstack/react-query": "^5.60.0",
    "tailwindcss": "^3.4.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.5.0",
    "lucide-react": "^0.460.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "vite": "^6.0.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "vitest": "^2.1.0"
  }
}
```

## Open Questions Resolved

| Question | Resolution |
|----------|------------|
| LangGraph version? | v1.0 with `langchain.agents.create_agent` |
| State persistence? | Postgres Checkpointer with AsyncConnectionPool |
| Streaming approach? | SSE via `astream_events(version="v2")` |
| Web search tool? | Tavily with caching for free tier |
| Tool state access? | `ToolRuntime` pattern (v1 unified approach) |
| Frontend framework? | Vite + React 18 + shadcn/ui (per constitution) |

## Sources

- [LangChain & LangGraph 1.0 Release](https://blog.langchain.com/langchain-langgraph-1dot0/)
- [LangGraph v1 Migration Guide](https://docs.langchain.com/oss/python/migrate/langgraph-v1)
- [LangChain v1 Migration Guide](https://docs.langchain.com/oss/python/migrate/langchain-v1)
- [langgraph-checkpoint-postgres PyPI](https://pypi.org/project/langgraph-checkpoint-postgres/)
- [Tavily API Documentation](https://docs.tavily.com/)
- [SSE with FastAPI and React](https://www.softgrade.org/sse-with-fastapi-react-langgraph/)
