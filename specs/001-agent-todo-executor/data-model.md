# Data Model: Agent-Driven TODO Executor

**Feature**: 001-agent-todo-executor
**Date**: 2025-11-29

## Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   Session   │───┬───│    Task     │       │   Message   │
└─────────────┘   │   └─────────────┘       └─────────────┘
       │          │          │                     │
       │          │          └──────────┬──────────┘
       │          │                     │
       │          │               ┌─────┴─────┐
       │          └───────────────│  Artifact │
       │                          └───────────┘
       │
       └──────────────────────────┬───────────┐
                                  │ DataItem  │
                                  └───────────┘
```

## Entities

### Session

Represents a user's goal-pursuit journey. The root entity that contains all related data.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, auto-generated | Unique identifier |
| title | string | max 200 chars | Auto-generated from first user message |
| status | enum | planning, executing, completed | Current session state |
| created_at | timestamp | auto, UTC | Creation timestamp |
| updated_at | timestamp | auto, UTC | Last modification timestamp |

**Status Transitions**:
- `planning` → `executing` (when user clicks "Execute")
- `executing` → `completed` (when all tasks processed)
- `planning` → `planning` (during chat refinement)

**Indexes**:
- `idx_sessions_created_at` on `created_at DESC` (for listing)
- `idx_sessions_status` on `status` (for filtering)

### Task

A single actionable item within a session's TODO list.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, auto-generated | Unique identifier |
| session_id | UUID | FK → Session, NOT NULL | Parent session |
| title | string | max 500 chars, NOT NULL | Task title |
| description | string | nullable, max 2000 chars | Optional detailed description |
| status | enum | pending, in_progress, done, failed | Task execution state |
| result | text | nullable | Execution result or error message |
| reflection | text | nullable | Agent's reflection on the task |
| order | integer | NOT NULL | Position in task list (0-indexed) |
| created_at | timestamp | auto, UTC | Creation timestamp |
| updated_at | timestamp | auto, UTC | Last modification timestamp |

**Status Transitions**:
- `pending` → `in_progress` (agent selects task)
- `in_progress` → `done` (task completed successfully)
- `in_progress` → `failed` (task failed with error)

**Indexes**:
- `idx_tasks_session_order` on `(session_id, order)` (for ordered retrieval)
- `idx_tasks_session_status` on `(session_id, status)` (for filtering)

**Constraints**:
- `UNIQUE (session_id, order)` - no duplicate ordering within session
- `ON DELETE CASCADE` from Session

### Message

A single exchange in the conversation between user and agent.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, auto-generated | Unique identifier |
| session_id | UUID | FK → Session, NOT NULL | Parent session |
| role | enum | user, assistant, system | Message author role |
| content | text | NOT NULL | Message content |
| created_at | timestamp | auto, UTC | Creation timestamp |

**Indexes**:
- `idx_messages_session_created` on `(session_id, created_at)` (for ordered retrieval)

**Constraints**:
- `ON DELETE CASCADE` from Session

### Artifact

A created deliverable within a session (document, note, summary, plan).

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, auto-generated | Unique identifier |
| session_id | UUID | FK → Session, NOT NULL | Parent session |
| task_id | UUID | FK → Task, nullable | Creating task (if applicable) |
| name | string | max 200 chars, NOT NULL | Artifact name |
| type | enum | document, note, summary, plan, other | Artifact category |
| content | text | NOT NULL, max 100KB | Artifact content |
| created_at | timestamp | auto, UTC | Creation timestamp |

**Validation Rules**:
- Content size must be ≤ 102,400 bytes (100KB)
- Name must be non-empty

**Indexes**:
- `idx_artifacts_session` on `session_id` (for listing)
- `idx_artifacts_task` on `task_id` (for task association)

**Constraints**:
- `ON DELETE CASCADE` from Session
- `ON DELETE SET NULL` from Task (artifact persists if task deleted)

### DataItem

A structured piece of information within a session for CRUD operations.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, auto-generated | Unique identifier |
| session_id | UUID | FK → Session, NOT NULL | Parent session |
| item_type | string | max 100 chars, NOT NULL | Category/type (e.g., "contact", "note") |
| data | JSONB | NOT NULL | Structured key-value data |
| created_at | timestamp | auto, UTC | Creation timestamp |
| updated_at | timestamp | auto, UTC | Last modification timestamp |

**Indexes**:
- `idx_dataitems_session_type` on `(session_id, item_type)` (for typed listing)
- `idx_dataitems_data` GIN index on `data` (for JSON queries)

**Constraints**:
- `ON DELETE CASCADE` from Session

## Pydantic Models (Backend)

```python
from datetime import datetime
from enum import Enum
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class SessionStatus(str, Enum):
    PLANNING = "planning"
    EXECUTING = "executing"
    COMPLETED = "completed"


class TaskStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    DONE = "done"
    FAILED = "failed"


class MessageRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class ArtifactType(str, Enum):
    DOCUMENT = "document"
    NOTE = "note"
    SUMMARY = "summary"
    PLAN = "plan"
    OTHER = "other"


class Session(BaseModel):
    id: UUID
    title: str = Field(max_length=200)
    status: SessionStatus = SessionStatus.PLANNING
    created_at: datetime
    updated_at: datetime


class Task(BaseModel):
    id: UUID
    session_id: UUID
    title: str = Field(max_length=500)
    description: str | None = Field(default=None, max_length=2000)
    status: TaskStatus = TaskStatus.PENDING
    result: str | None = None
    reflection: str | None = None
    order: int = Field(ge=0)
    created_at: datetime
    updated_at: datetime


class Message(BaseModel):
    id: UUID
    session_id: UUID
    role: MessageRole
    content: str
    created_at: datetime


class Artifact(BaseModel):
    id: UUID
    session_id: UUID
    task_id: UUID | None = None
    name: str = Field(max_length=200)
    type: ArtifactType
    content: str
    created_at: datetime

    @field_validator("content")
    @classmethod
    def validate_content_size(cls, v: str) -> str:
        if len(v.encode("utf-8")) > 102400:
            raise ValueError("Artifact content exceeds 100KB limit")
        return v


class DataItem(BaseModel):
    id: UUID
    session_id: UUID
    item_type: str = Field(max_length=100)
    data: dict[str, Any]
    created_at: datetime
    updated_at: datetime
```

## TypeScript Types (Frontend)

```typescript
// Session types
type SessionStatus = "planning" | "executing" | "completed";

interface Session {
  id: string;
  title: string;
  status: SessionStatus;
  createdAt: string; // ISO 8601
  updatedAt: string;
}

// Task types
type TaskStatus = "pending" | "in_progress" | "done" | "failed";

interface Task {
  id: string;
  sessionId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  result: string | null;
  reflection: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
}

// Message types
type MessageRole = "user" | "assistant" | "system";

interface Message {
  id: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  createdAt: string;
}

// Artifact types
type ArtifactType = "document" | "note" | "summary" | "plan" | "other";

interface Artifact {
  id: string;
  sessionId: string;
  taskId: string | null;
  name: string;
  type: ArtifactType;
  content: string;
  createdAt: string;
}

// DataItem types
interface DataItem {
  id: string;
  sessionId: string;
  itemType: string;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// Execution Event types (SSE)
type ExecutionEventType =
  | "task_selected"
  | "tool_call"
  | "tool_result"
  | "artifact_created"
  | "data_modified"
  | "task_completed"
  | "reflection";

interface ExecutionEvent {
  type: ExecutionEventType;
  taskId?: string;
  tool?: string;
  input?: unknown;
  output?: string;
  artifactId?: string;
  dataItemId?: string;
  status?: TaskStatus;
  text?: string;
}
```

## Database Schema (Supabase/PostgreSQL)

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Session status enum
CREATE TYPE session_status AS ENUM ('planning', 'executing', 'completed');

-- Task status enum
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'done', 'failed');

-- Message role enum
CREATE TYPE message_role AS ENUM ('user', 'assistant', 'system');

-- Artifact type enum
CREATE TYPE artifact_type AS ENUM ('document', 'note', 'summary', 'plan', 'other');

-- Sessions table
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    status session_status NOT NULL DEFAULT 'planning',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_created_at ON sessions(created_at DESC);
CREATE INDEX idx_sessions_status ON sessions(status);

-- Tasks table
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description VARCHAR(2000),
    status task_status NOT NULL DEFAULT 'pending',
    result TEXT,
    reflection TEXT,
    "order" INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (session_id, "order")
);

CREATE INDEX idx_tasks_session_order ON tasks(session_id, "order");
CREATE INDEX idx_tasks_session_status ON tasks(session_id, status);

-- Messages table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    role message_role NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_session_created ON messages(session_id, created_at);

-- Artifacts table
CREATE TABLE artifacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    name VARCHAR(200) NOT NULL,
    type artifact_type NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT content_size_limit CHECK (octet_length(content) <= 102400)
);

CREATE INDEX idx_artifacts_session ON artifacts(session_id);
CREATE INDEX idx_artifacts_task ON artifacts(task_id);

-- Data items table
CREATE TABLE data_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    item_type VARCHAR(100) NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dataitems_session_type ON data_items(session_id, item_type);
CREATE INDEX idx_dataitems_data ON data_items USING GIN (data);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_sessions_updated_at
    BEFORE UPDATE ON sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_data_items_updated_at
    BEFORE UPDATE ON data_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## LangGraph Checkpoint Tables

The `langgraph-checkpoint-postgres` package creates its own tables automatically via `checkpointer.setup()`:

- `checkpoints` - Stores graph state snapshots
- `checkpoint_blobs` - Stores serialized state data
- `checkpoint_writes` - Stores pending writes

These tables are managed by LangGraph and should not be modified directly.
