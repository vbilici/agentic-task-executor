// Session types
export type SessionStatus = "planning" | "executing" | "paused" | "completed";

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
  order: number;
  createdAt: string;
  updatedAt: string;
}

// Message types
export type MessageRole = "user" | "assistant" | "system";

// Messages from checkpoint only have role and content
// Local messages (before sync) may have additional fields
export interface Message {
  role: MessageRole;
  content: string;
  // Optional fields - only present for locally created messages
  id?: string;
  sessionId?: string;
  createdAt?: string;
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

// Chat SSE Event types
export type ChatEventType = "content" | "tasks_extracting" | "tasks_updated" | "error" | "done";

export interface ChatContentEvent {
  type: "content";
  content: string;
}

export interface ChatTasksExtractingEvent {
  type: "tasks_extracting";
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
  | ChatTasksExtractingEvent
  | ChatTasksUpdatedEvent
  | ChatErrorEvent
  | ChatDoneEvent;

// Execution SSE Event types
export type ExecutionEventType =
  | "task_selected"
  | "tool_call"
  | "tool_result"
  | "artifact_analysis_start"
  | "artifact_analysis_complete"
  | "artifact_created"
  | "task_completed"
  | "summary_creating"
  | "execution_summary"
  | "paused"
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

export interface ArtifactAnalysisStartEvent {
  type: "artifact_analysis_start";
  taskId: string;
}

export interface ArtifactAnalysisCompleteEvent {
  type: "artifact_analysis_complete";
  taskId: string;
  created: boolean;
}

export interface ArtifactCreatedEvent {
  type: "artifact_created";
  taskId: string;
  artifactId: string;
  name: string;
  artifactType: ArtifactType;
}

export interface TaskCompletedEvent {
  type: "task_completed";
  taskId: string;
  status: "done" | "failed";
  result: string;
}

export interface ExecutionErrorEvent {
  type: "error";
  taskId?: string;
  error: string;
}

export interface SummaryCreatingEvent {
  type: "summary_creating";
}

export interface ExecutionSummaryEvent {
  type: "execution_summary";
  summary: string;
}

export interface ExecutionDoneEvent {
  type: "done";
  summary: {
    total: number;
    completed: number;
    failed: number;
  };
}

export interface ExecutionPausedEvent {
  type: "paused";
  reason: "client_disconnected" | "user_requested";
}

export type ExecutionEvent =
  | TaskSelectedEvent
  | ToolCallEvent
  | ToolResultEvent
  | ArtifactAnalysisStartEvent
  | ArtifactAnalysisCompleteEvent
  | ArtifactCreatedEvent
  | TaskCompletedEvent
  | SummaryCreatingEvent
  | ExecutionSummaryEvent
  | ExecutionPausedEvent
  | ExecutionErrorEvent
  | ExecutionDoneEvent;

// Execution Log types (persisted to database)
export type ExecutionLogEventType =
  | "task_selected"
  | "tool_call"
  | "tool_result"
  | "content"
  | "task_completed"
  | "artifact_analysis_start"
  | "artifact_analysis_complete"
  | "artifact_created"
  | "paused"
  | "error"
  | "done";

export interface ExecutionLog {
  id: string;
  sessionId: string;
  taskId: string | null;
  eventType: ExecutionLogEventType;
  eventData: ExecutionEvent;
  createdAt: string;
}

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

export interface ExecutionLogsResponse {
  logs: ExecutionLog[];
  total: number;
}

// FastAPI returns errors in this format
export interface ApiError {
  detail: string;
  // Additional fields for custom error responses
  code?: string;
  message?: string;
}
