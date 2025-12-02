import type {
  Session,
  SessionDetail,
  SessionsListResponse,
  Task,
  TasksListResponse,
  Artifact,
  ArtifactsListResponse,
  ExecutionLogsResponse,
  ApiError,
} from "@/types/api";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      const error: ApiError = {
        detail: errorBody?.detail || response.statusText,
        code: errorBody?.code,
        message: errorBody?.message,
      };
      throw error;
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  // Sessions
  async listSessions(params?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<SessionsListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set("status", params.status);
    if (params?.limit) searchParams.set("limit", params.limit.toString());
    if (params?.offset) searchParams.set("offset", params.offset.toString());

    const query = searchParams.toString();
    return this.request<SessionsListResponse>(
      `/sessions${query ? `?${query}` : ""}`
    );
  }

  async createSession(): Promise<Session> {
    return this.request<Session>("/sessions", { method: "POST" });
  }

  async getSession(sessionId: string): Promise<SessionDetail> {
    return this.request<SessionDetail>(`/sessions/${sessionId}`);
  }

  async deleteSession(sessionId: string): Promise<void> {
    return this.request<void>(`/sessions/${sessionId}`, { method: "DELETE" });
  }

  // Tasks
  async listTasks(sessionId: string): Promise<TasksListResponse> {
    return this.request<TasksListResponse>(`/sessions/${sessionId}/tasks`);
  }

  async getTask(sessionId: string, taskId: string): Promise<Task> {
    return this.request<Task>(`/sessions/${sessionId}/tasks/${taskId}`);
  }

  // Artifacts
  async listArtifacts(
    sessionId: string,
    type?: string
  ): Promise<ArtifactsListResponse> {
    const query = type ? `?type=${type}` : "";
    return this.request<ArtifactsListResponse>(
      `/sessions/${sessionId}/artifacts${query}`
    );
  }

  async getArtifact(sessionId: string, artifactId: string): Promise<Artifact> {
    return this.request<Artifact>(
      `/sessions/${sessionId}/artifacts/${artifactId}`
    );
  }

  getArtifactDownloadUrl(sessionId: string, artifactId: string): string {
    return `${this.baseUrl}/sessions/${sessionId}/artifacts/${artifactId}/download`;
  }

  // Execution Logs
  async getExecutionLogs(
    sessionId: string,
    params?: { limit?: number; offset?: number }
  ): Promise<ExecutionLogsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set("limit", params.limit.toString());
    if (params?.offset) searchParams.set("offset", params.offset.toString());

    const query = searchParams.toString();
    return this.request<ExecutionLogsResponse>(
      `/sessions/${sessionId}/execution-logs${query ? `?${query}` : ""}`
    );
  }

  // Execution Heartbeat
  async sendExecutionHeartbeat(
    sessionId: string,
    connectionId: string
  ): Promise<{ active: boolean }> {
    return this.request<{ active: boolean }>(
      `/sessions/${sessionId}/execution-heartbeat`,
      {
        method: "POST",
        body: JSON.stringify({ connection_id: connectionId }),
      }
    );
  }

  // Claim execution (pauses stale execution on page load)
  async claimExecution(
    sessionId: string
  ): Promise<{ claimed: boolean; status: string; connection_id: string | null }> {
    return this.request<{
      claimed: boolean;
      status: string;
      connection_id: string | null;
    }>(`/sessions/${sessionId}/claim-execution`, {
      method: "POST",
    });
  }

  // SSE Endpoints (return URL for EventSource)
  getChatSSEUrl(sessionId: string): string {
    return `${this.baseUrl}/sessions/${sessionId}/chat`;
  }

  getExecuteSSEUrl(sessionId: string): string {
    return `${this.baseUrl}/sessions/${sessionId}/execute`;
  }

  getSummarizeSSEUrl(sessionId: string): string {
    return `${this.baseUrl}/sessions/${sessionId}/summarize`;
  }
}

export const api = new ApiClient(API_URL);
