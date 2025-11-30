export class ApiManager {
  private backendUrl: string;

  constructor(backendUrl: string = "http://localhost:8000") {
    this.backendUrl = backendUrl;
  }

  /**
   * Make an API request to the backend
   */
  async queryApi(
    endpoint: string,
    method: string = "GET",
    body?: object,
    headers?: Record<string, string>
  ): Promise<{
    success: boolean;
    message: string;
    data?: unknown;
  }> {
    try {
      const url = endpoint.startsWith("http")
        ? endpoint
        : `${this.backendUrl}${endpoint}`;

      const requestOptions: {
        method: string;
        headers: Record<string, string>;
        body?: string;
      } = {
        method,
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
      };

      if (body && method !== "GET") {
        requestOptions.body = JSON.stringify(body);
      }

      const response = await fetch(url, requestOptions);

      if (!response.ok) {
        let errorMessage = "Request failed";
        try {
          const responseData = (await response.json()) as {
            detail?: string;
            message?: string;
          };
          errorMessage =
            responseData?.detail || responseData?.message || "Unknown error";
        } catch {
          errorMessage = `HTTP ${response.status} error`;
        }

        return {
          success: false,
          message: errorMessage,
        };
      }

      const data = await response.json();
      return {
        success: true,
        message: "Request successful",
        data,
      };
    } catch (error) {
      return {
        success: false,
        message: `API request failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  }

  /**
   * Check if the backend server is running
   */
  async isServerRunning(): Promise<{ running: boolean; message: string }> {
    try {
      const response = await fetch(`${this.backendUrl}/api/health`, {
        method: "GET",
      });

      if (response.ok) {
        const data = (await response.json()) as { status?: string };
        return {
          running: true,
          message: `Backend server is running (status: ${data.status ?? "ok"})`,
        };
      } else {
        return {
          running: false,
          message: `Backend server returned status ${response.status}`,
        };
      }
    } catch (error) {
      return {
        running: false,
        message: `Backend server is not accessible: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  }
}
