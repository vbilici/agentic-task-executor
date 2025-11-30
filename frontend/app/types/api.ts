// Session types
export type SessionStatus = "planning" | "executing" | "completed";

export interface Session {
  id: string;
  title: string;
  status: SessionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SessionDetail extends Session {
  tasks: Task[];
  messages: Message[];
  artifacts: ArtifactSummary[];
  dataItems: DataItem[];
}

// Task types
export type TaskStatus = "pending" | "in_progress" | "done" | "failed";

export interface Task {
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
export type MessageRole = "user" | "assistant" | "system";

export interface Message {
  id: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  createdAt: string;
}

// Artifact types
export type ArtifactType = "document" | "note" | "summary" | "plan" | "other";

export interface Artifact {
  id: string;
  sessionId: string;
  taskId: string | null;
  name: string;
  type: ArtifactType;
  content: string;
  createdAt: string;
}

export interface ArtifactSummary {
  id: string;
  sessionId: string;
  taskId: string | null;
  name: string;
  type: ArtifactType;
  createdAt: string;
}

// DataItem types
export interface DataItem {
  id: string;
  sessionId: string;
  itemType: string;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// Chat SSE Event types
export type ChatEventType = "content" | "tasks_updated" | "error" | "done";

export interface ChatContentEvent {
  type: "content";
  content: string;
}

export interface ChatTasksUpdatedEvent {
  type: "tasks_updated";
  tasks: Task[];
}

export interface ChatErrorEvent {
  type: "error";
  error: string;
}

export interface ChatDoneEvent {
  type: "done";
  content?: string;  // Clean content without JSON blocks
}

export type ChatEvent =
  | ChatContentEvent
  | ChatTasksUpdatedEvent
  | ChatErrorEvent
  | ChatDoneEvent;

// Execution SSE Event types
export type ExecutionEventType =
  | "task_selected"
  | "tool_call"
  | "tool_result"
  | "artifact_created"
  | "data_modified"
  | "task_completed"
  | "reflection"
  | "error"
  | "done";

export interface TaskSelectedEvent {
  type: "task_selected";
  taskId: string;
}

export interface ToolCallEvent {
  type: "tool_call";
  taskId: string;
  tool: string;
  input: Record<string, unknown>;
}

export interface ToolResultEvent {
  type: "tool_result";
  taskId: string;
  tool: string;
  output: string;
}

export interface ArtifactCreatedEvent {
  type: "artifact_created";
  taskId: string;
  artifactId: string;
  name: string;
  artifactType: ArtifactType;
}

export interface DataModifiedEvent {
  type: "data_modified";
  taskId: string;
  dataItemId: string;
  operation: "create" | "update" | "delete";
  itemType: string;
}

export interface TaskCompletedEvent {
  type: "task_completed";
  taskId: string;
  status: "done" | "failed";
  result: string;
}

export interface ReflectionEvent {
  type: "reflection";
  taskId: string;
  text: string;
}

export interface ExecutionErrorEvent {
  type: "error";
  taskId?: string;
  error: string;
}

export interface ExecutionDoneEvent {
  type: "done";
  summary: {
    total: number;
    completed: number;
    failed: number;
  };
}

export type ExecutionEvent =
  | TaskSelectedEvent
  | ToolCallEvent
  | ToolResultEvent
  | ArtifactCreatedEvent
  | DataModifiedEvent
  | TaskCompletedEvent
  | ReflectionEvent
  | ExecutionErrorEvent
  | ExecutionDoneEvent;

// API Response types
export interface SessionsListResponse {
  sessions: Session[];
  total: number;
}

export interface TasksListResponse {
  tasks: Task[];
}

export interface ArtifactsListResponse {
  artifacts: ArtifactSummary[];
}

export interface DataItemsListResponse {
  dataItems: DataItem[];
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}
