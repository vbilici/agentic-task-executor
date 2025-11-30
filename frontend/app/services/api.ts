import type {
  Session,
  SessionDetail,
  SessionsListResponse,
  Task,
  TasksListResponse,
  Artifact,
  ArtifactsListResponse,
  DataItem,
  DataItemsListResponse,
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
      const error: ApiError = await response.json().catch(() => ({
        code: "UNKNOWN_ERROR",
        message: response.statusText,
      }));
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

  // Data Items
  async listDataItems(
    sessionId: string,
    itemType?: string
  ): Promise<DataItemsListResponse> {
    const query = itemType ? `?item_type=${itemType}` : "";
    return this.request<DataItemsListResponse>(
      `/sessions/${sessionId}/data-items${query}`
    );
  }

  async getDataItem(sessionId: string, dataItemId: string): Promise<DataItem> {
    return this.request<DataItem>(
      `/sessions/${sessionId}/data-items/${dataItemId}`
    );
  }

  // SSE Endpoints (return URL for EventSource)
  getChatSSEUrl(sessionId: string): string {
    return `${this.baseUrl}/sessions/${sessionId}/chat`;
  }

  getExecuteSSEUrl(sessionId: string): string {
    return `${this.baseUrl}/sessions/${sessionId}/execute`;
  }
}

export const api = new ApiClient(API_URL);
