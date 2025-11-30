# SSE Event Contracts

This document describes the Server-Sent Events (SSE) payloads for real-time streaming.

## Implementation Architecture

The backend uses LangGraph's `astream_events(version="v2")` API to capture events from the planning graph execution. The graph has two nodes:

1. **chat node**: Generates conversational response (streamed to frontend)
2. **extract_tasks node**: Extracts structured TODO list using `with_structured_output()` (not streamed)

Event filtering in `agent_service.py` ensures only relevant events reach the frontend:
- `on_chat_model_stream` events from "chat" node → `content` events
- `on_chain_end` events from "extract_tasks" node → `tasks_updated` events

The frontend uses React refs (`optionsRef`, `streamingContentRef`) to prevent re-render loops during async event handling.

## Chat Streaming Events

**Endpoint**: `POST /sessions/{sessionId}/chat`

**Flow**: User message → [LangGraph execution] → Stream events → Save to DB → Send final events

### Event: `content`

Streamed text content from the assistant's conversational response (from chat node).

```json
{
  "type": "content",
  "content": "Here's a task list..."
}
```

**Timing**: Emitted continuously during chat node execution
**Source**: `on_chat_model_stream` events where `node_name == "chat"`
**Frontend handling**: Accumulated in `streamingContent` state, displayed in real-time

### Event: `tasks_updated`

Task list has been updated (new tasks created). Sent AFTER tasks are saved to database.

```json
{
  "type": "tasks_updated",
  "tasks": [
    {
      "id": "uuid",
      "title": "Research competitors",
      "description": "Find top 5 competitors in the CRM market",
      "status": "pending",
      "order": 0,
      "sessionId": "uuid",
      "createdAt": "2025-11-30T12:00:00Z"
    }
  ]
}
```

**Timing**: Emitted once after graph execution completes AND tasks saved to database
**Source**: `on_chain_end` events from extract_tasks node → database insertion → event sent with DB records
**Frontend handling**: Updates task list with full task objects including database IDs
**Note**: Tasks include database IDs because they're sent after DB insertion completes

### Event: `error`

An error occurred during chat processing.

```json
{
  "type": "error",
  "error": "Failed to generate response"
}
```

**Timing**: Emitted when exceptions occur during graph execution or database operations
**Frontend handling**: Logged to console, resets `isSending` state

### Event: `done`

Chat response completed. All processing finished.

```json
{
  "type": "done"
}
```

**Timing**: Emitted after all processing completes (message saved, tasks saved if any)
**Frontend handling**:
- Creates final message object from accumulated streaming content
- Resets `streamingContent` to empty string
- Sets `isSending` to false

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

## Frontend Implementation: React Ref Pattern

The frontend uses React refs to prevent infinite re-render loops during SSE streaming. This is a critical architectural decision for reliable real-time updates.

### The Problem

Without refs, this common pattern causes infinite loops:

```typescript
// ❌ BROKEN: Creates infinite loop
const { connect } = useSSE<ChatEvent>({
  onMessage: (event) => {
    if (event.type === "content") {
      setStreamingContent(prev => prev + event.content);  // Updates state
    }
    if (event.type === "done") {
      // Need access to streamingContent here, but...
      setMessages(prev => [...prev, { content: streamingContent }]);
    }
  }
});

// Adding streamingContent to dependencies restarts connection!
const handleSend = (message: string) => {
  connect(url, { message });  // Depends on onMessage callback
};
```

**Why it loops**:
1. `streamingContent` changes → triggers re-render
2. `onMessage` callback recreated with new closure
3. `connect()` sees new callback → recreates connection
4. Stream starts over → infinite loop

### The Solution: Refs

```typescript
// ✅ CORRECT: Use refs to break the loop
const streamingContentRef = useRef("");

useEffect(() => {
  streamingContentRef.current = streamingContent;
}, [streamingContent]);

const { connect } = useSSE<ChatEvent>({
  onMessage: useCallback((event) => {
    if (event.type === "content") {
      setStreamingContent(prev => prev + event.content);
    }
    if (event.type === "done") {
      // Access latest value via ref (no dependency!)
      const finalContent = streamingContentRef.current;
      setMessages(prev => [...prev, { content: finalContent }]);
    }
  }, []),  // Empty dependencies - callback never recreated
});
```

### How It Works

**In `useSSE.ts`**:
```typescript
const optionsRef = useRef(options);

useEffect(() => {
  optionsRef.current = options;  // Update ref (no re-render)
}, [options]);

// Use ref in event handler (always has latest callbacks)
optionsRef.current.onMessage?.(parsed);
```

**In `SessionPage.tsx`**:
```typescript
const streamingContentRef = useRef("");

useEffect(() => {
  streamingContentRef.current = streamingContent;
}, [streamingContent]);

const { connect } = useSSE<ChatEvent>({
  onMessage: useCallback((event: ChatEvent) => {
    switch (event.type) {
      case "content":
        setStreamingContent(prev => prev + event.content);
        break;
      case "done":
        // Use ref to access latest streaming content
        const finalContent = event.content || streamingContentRef.current;
        setMessages(prev => [...prev, { content: finalContent }]);
        break;
    }
  }, []),  // sessionId removed - no dependencies needed
});
```

### Why This Pattern?

1. **Prevents Re-renders**: Updating refs doesn't trigger component re-renders
2. **Stable Callbacks**: `onMessage` with `[]` dependencies never recreates
3. **Latest State Access**: Refs always contain current values
4. **No Stale Closures**: Event handlers see fresh state via refs
5. **Connection Stability**: SSE connection stays open without restarting

### Key Rules

1. **Store callbacks in refs**: `optionsRef.current = options`
2. **Empty dependency arrays**: `useCallback(() => {...}, [])`
3. **Sync state to refs**: `useEffect(() => { ref.current = state }, [state])`
4. **Access via refs in handlers**: `ref.current.onMessage?.(event)`

This pattern is essential for any React component handling long-lived async operations (SSE, WebSockets, etc.) where event handlers need access to current state without recreating the connection.
