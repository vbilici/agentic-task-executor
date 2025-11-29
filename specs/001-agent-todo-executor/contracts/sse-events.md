# SSE Event Contracts

This document describes the Server-Sent Events (SSE) payloads for real-time streaming.

## Chat Streaming Events

**Endpoint**: `POST /sessions/{sessionId}/chat`

### Event: `content`

Streamed text content from the assistant.

```json
{
  "type": "content",
  "content": "Here's a task list..."
}
```

### Event: `tasks_updated`

Task list has been updated (new tasks created or existing modified).

```json
{
  "type": "tasks_updated",
  "tasks": [
    {
      "id": "uuid",
      "title": "Research competitors",
      "description": "Find top 5 competitors in the CRM market",
      "status": "pending",
      "order": 0
    }
  ]
}
```

### Event: `error`

An error occurred during chat processing.

```json
{
  "type": "error",
  "error": "Failed to generate response"
}
```

### Event: `done`

Chat response completed.

```json
{
  "type": "done"
}
```

## Execution Streaming Events

**Endpoint**: `POST /sessions/{sessionId}/execute`

### Event: `task_selected`

Agent has selected a task to work on.

```json
{
  "type": "task_selected",
  "taskId": "uuid"
}
```

### Event: `tool_call`

Agent is calling a tool.

```json
{
  "type": "tool_call",
  "taskId": "uuid",
  "tool": "web_search",
  "input": {
    "query": "CRM market competitors 2025"
  }
}
```

### Event: `tool_result`

Tool execution completed.

```json
{
  "type": "tool_result",
  "taskId": "uuid",
  "tool": "web_search",
  "output": "Found 5 results: Salesforce, HubSpot..."
}
```

### Event: `artifact_created`

Agent created a new artifact.

```json
{
  "type": "artifact_created",
  "taskId": "uuid",
  "artifactId": "uuid",
  "name": "Competitor Analysis",
  "artifactType": "document"
}
```

### Event: `data_modified`

Agent created, updated, or deleted a data item.

```json
{
  "type": "data_modified",
  "taskId": "uuid",
  "dataItemId": "uuid",
  "operation": "create",
  "itemType": "contact"
}
```

### Event: `task_completed`

Task execution finished.

```json
{
  "type": "task_completed",
  "taskId": "uuid",
  "status": "done",
  "result": "Successfully researched competitors"
}
```

### Event: `reflection`

Agent's reflection on task completion.

```json
{
  "type": "reflection",
  "taskId": "uuid",
  "text": "The competitor analysis is complete. Key insight: Salesforce dominates enterprise but HubSpot leads in SMB..."
}
```

### Event: `error`

An error occurred during execution.

```json
{
  "type": "error",
  "taskId": "uuid",
  "error": "Web search API rate limit exceeded"
}
```

### Event: `done`

All tasks have been processed.

```json
{
  "type": "done",
  "summary": {
    "total": 5,
    "completed": 4,
    "failed": 1
  }
}
```

## SSE Format

All events follow the SSE format:

```
event: <event_type>
data: <json_payload>

```

Example stream:

```
event: task_selected
data: {"type":"task_selected","taskId":"abc-123"}

event: tool_call
data: {"type":"tool_call","taskId":"abc-123","tool":"web_search","input":{"query":"CRM competitors"}}

event: tool_result
data: {"type":"tool_result","taskId":"abc-123","tool":"web_search","output":"Found results..."}

event: task_completed
data: {"type":"task_completed","taskId":"abc-123","status":"done","result":"Research complete"}

event: done
data: {"type":"done","summary":{"total":1,"completed":1,"failed":0}}

```

## Error Recovery

If the client disconnects during streaming:

1. Execution continues on the server
2. Client can reconnect and poll `/sessions/{sessionId}` for current state
3. Completed events are not replayed (client should sync state on reconnect)

## TypeScript Types

```typescript
// Chat events
type ChatEventType = "content" | "tasks_updated" | "error" | "done";

interface ChatContentEvent {
  type: "content";
  content: string;
}

interface ChatTasksUpdatedEvent {
  type: "tasks_updated";
  tasks: Task[];
}

interface ChatErrorEvent {
  type: "error";
  error: string;
}

interface ChatDoneEvent {
  type: "done";
}

type ChatEvent =
  | ChatContentEvent
  | ChatTasksUpdatedEvent
  | ChatErrorEvent
  | ChatDoneEvent;

// Execution events
type ExecutionEventType =
  | "task_selected"
  | "tool_call"
  | "tool_result"
  | "artifact_created"
  | "data_modified"
  | "task_completed"
  | "reflection"
  | "error"
  | "done";

interface TaskSelectedEvent {
  type: "task_selected";
  taskId: string;
}

interface ToolCallEvent {
  type: "tool_call";
  taskId: string;
  tool: string;
  input: Record<string, unknown>;
}

interface ToolResultEvent {
  type: "tool_result";
  taskId: string;
  tool: string;
  output: string;
}

interface ArtifactCreatedEvent {
  type: "artifact_created";
  taskId: string;
  artifactId: string;
  name: string;
  artifactType: ArtifactType;
}

interface DataModifiedEvent {
  type: "data_modified";
  taskId: string;
  dataItemId: string;
  operation: "create" | "update" | "delete";
  itemType: string;
}

interface TaskCompletedEvent {
  type: "task_completed";
  taskId: string;
  status: "done" | "failed";
  result: string;
}

interface ReflectionEvent {
  type: "reflection";
  taskId: string;
  text: string;
}

interface ExecutionErrorEvent {
  type: "error";
  taskId?: string;
  error: string;
}

interface ExecutionDoneEvent {
  type: "done";
  summary: {
    total: number;
    completed: number;
    failed: number;
  };
}

type ExecutionEvent =
  | TaskSelectedEvent
  | ToolCallEvent
  | ToolResultEvent
  | ArtifactCreatedEvent
  | DataModifiedEvent
  | TaskCompletedEvent
  | ReflectionEvent
  | ExecutionErrorEvent
  | ExecutionDoneEvent;
```
