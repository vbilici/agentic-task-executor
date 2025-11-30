#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { ProcessManager } from "./process-manager.js";
import { ApiManager } from "./api-manager.js";

// Type definitions for tool arguments
interface ServiceArgs {
  service?: "frontend" | "backend";
}

interface ServiceLogsArgs {
  service?: "frontend" | "backend";
  lines?: number;
}

interface SearchLogsArgs {
  service?: "frontend" | "backend";
  query?: string;
  case_sensitive?: boolean;
}

interface SendCommandArgs {
  service?: "frontend" | "backend";
  command?: string;
}

interface ApiQueryArgs {
  endpoint?: string;
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body?: any;
  headers?: Record<string, string>;
}

const server = new Server(
  {
    name: "libra-dev-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Initialize ProcessManager
const processManager = new ProcessManager();

// Initialize ApiManager
const apiManager = new ApiManager();

// Register all available tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    // Consolidated Service Control Tools
    {
      name: "start_service",
      description:
        "Start a Libra development service (frontend or backend) in iTerm2",
      inputSchema: {
        type: "object",
        properties: {
          service: {
            type: "string",
            enum: ["frontend", "backend"],
            description: "Which service to start",
          },
        },
        required: ["service"],
      },
    },
    {
      name: "stop_service",
      description: "Stop a development service and close its iTerm2 window",
      inputSchema: {
        type: "object",
        properties: {
          service: {
            type: "string",
            enum: ["frontend", "backend"],
            description: "Which service to stop",
          },
        },
        required: ["service"],
      },
    },
    {
      name: "restart_service",
      description: "Restart a development service in iTerm2",
      inputSchema: {
        type: "object",
        properties: {
          service: {
            type: "string",
            enum: ["frontend", "backend"],
            description: "Which service to restart",
          },
        },
        required: ["service"],
      },
    },
    // Service Status Tools
    {
      name: "get_service_status",
      description: "Get the status of a development service",
      inputSchema: {
        type: "object",
        properties: {
          service: {
            type: "string",
            enum: ["frontend", "backend"],
            description: "Which service to check",
          },
        },
        required: ["service"],
      },
    },
    {
      name: "get_all_service_status",
      description: "Get the status of all development services",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
      },
    },
    // iTerm2 Log Access Tools
    {
      name: "get_service_logs",
      description: "Get recent logs from a service running in iTerm2",
      inputSchema: {
        type: "object",
        properties: {
          service: {
            type: "string",
            enum: ["frontend", "backend"],
            description: "Which service logs to retrieve",
          },
          lines: {
            type: "number",
            description: "Number of recent lines to retrieve (default: 50)",
            default: 50,
          },
        },
        required: ["service"],
      },
    },
    {
      name: "search_service_logs",
      description:
        "Search logs from a service for specific patterns using regex",
      inputSchema: {
        type: "object",
        properties: {
          service: {
            type: "string",
            enum: ["frontend", "backend"],
            description: "Which service logs to search",
          },
          query: {
            type: "string",
            description: "Search term or regex pattern",
          },
          case_sensitive: {
            type: "boolean",
            description: "Whether search should be case sensitive",
            default: false,
          },
        },
        required: ["service", "query"],
      },
    },
    {
      name: "tail_service_logs",
      description:
        "Get the most recent logs from a service (tail-like functionality)",
      inputSchema: {
        type: "object",
        properties: {
          service: {
            type: "string",
            enum: ["frontend", "backend"],
            description: "Which service logs to tail",
          },
          lines: {
            type: "number",
            description: "Number of recent lines to retrieve (default: 10)",
            default: 10,
          },
        },
        required: ["service"],
      },
    },
    {
      name: "send_command_to_service",
      description: "Send a command to a running service in its iTerm2 window",
      inputSchema: {
        type: "object",
        properties: {
          service: {
            type: "string",
            enum: ["frontend", "backend"],
            description: "Which service to send command to",
          },
          command: {
            type: "string",
            description: "Command to send to the service",
          },
        },
        required: ["service", "command"],
      },
    },
    {
      name: "focus_service_window",
      description:
        "Bring a service's iTerm2 window to the front for manual inspection",
      inputSchema: {
        type: "object",
        properties: {
          service: {
            type: "string",
            enum: ["frontend", "backend"],
            description: "Which service window to focus",
          },
        },
        required: ["service"],
      },
    },
    // API Query Tools
    {
      name: "query_api",
      description: "Make an API request to the backend",
      inputSchema: {
        type: "object",
        properties: {
          endpoint: {
            type: "string",
            description: "API endpoint path (e.g., '/api/sessions')",
          },
          method: {
            type: "string",
            enum: ["GET", "POST", "PUT", "DELETE", "PATCH"],
            description: "HTTP method",
            default: "GET",
          },
          body: {
            type: "object",
            description: "Request body for POST/PUT/PATCH requests",
          },
          headers: {
            type: "object",
            description: "Additional headers to include",
          },
        },
        required: ["endpoint"],
      },
    },
    {
      name: "check_backend_health",
      description: "Check if the backend server is running and accessible",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  ],
}));

// Tool execution handlers
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      // Consolidated Service Control Tools
      case "start_service": {
        const typedArgs = args as ServiceArgs;
        const serviceName = typedArgs?.service;
        if (!serviceName) {
          return {
            content: [
              {
                type: "text",
                text: "Error: service parameter is required",
              },
            ],
          };
        }
        const startResult = await processManager.startService(serviceName);
        return {
          content: [
            {
              type: "text",
              text: `Service start: ${startResult.success ? "SUCCESS" : "FAILED"}\n${startResult.message}`,
            },
          ],
        };
      }

      case "stop_service": {
        const typedArgs = args as ServiceArgs;
        const serviceName = typedArgs?.service;
        if (!serviceName) {
          return {
            content: [
              {
                type: "text",
                text: "Error: service parameter is required",
              },
            ],
          };
        }
        const stopResult = await processManager.stopService(serviceName);
        return {
          content: [
            {
              type: "text",
              text: `Service stop: ${stopResult.success ? "SUCCESS" : "FAILED"}\n${stopResult.message}`,
            },
          ],
        };
      }

      case "restart_service": {
        const typedArgs = args as ServiceArgs;
        const serviceName = typedArgs?.service;
        if (!serviceName) {
          return {
            content: [
              {
                type: "text",
                text: "Error: service parameter is required",
              },
            ],
          };
        }
        const restartResult = await processManager.restartService(serviceName);
        return {
          content: [
            {
              type: "text",
              text: `Service restart: ${restartResult.success ? "SUCCESS" : "FAILED"}\n${restartResult.message}`,
            },
          ],
        };
      }

      // Service Status Tools
      case "get_service_status": {
        const typedArgs = args as ServiceArgs;
        const serviceName = typedArgs?.service;
        if (!serviceName) {
          return {
            content: [
              {
                type: "text",
                text: "Error: service parameter is required",
              },
            ],
          };
        }
        const statusResult = processManager.getServiceStatus(serviceName);
        return {
          content: [
            {
              type: "text",
              text: statusResult.success
                ? `Service '${serviceName}' status:\n${JSON.stringify(statusResult.status, null, 2)}`
                : `Error: ${statusResult.message}`,
            },
          ],
        };
      }

      case "get_all_service_status": {
        const allStatuses = processManager.getAllServiceStatuses();
        return {
          content: [
            {
              type: "text",
              text: `All service statuses:\n${JSON.stringify(allStatuses, null, 2)}`,
            },
          ],
        };
      }

      // iTerm2 Log Access Tools
      case "get_service_logs": {
        const typedArgs = args as ServiceLogsArgs;
        const logService = typedArgs?.service;
        const logLines = typedArgs?.lines ?? 50;
        if (!logService) {
          return {
            content: [
              {
                type: "text",
                text: "Error: service parameter is required",
              },
            ],
          };
        }
        const logsResult = await processManager.getServiceLogs(
          logService,
          logLines
        );
        return {
          content: [
            {
              type: "text",
              text: logsResult.success
                ? `Last ${logLines} lines from ${logService}:\n\n${logsResult.logs?.join("\n") ?? "No logs available"}`
                : `Error getting logs: ${logsResult.message}`,
            },
          ],
        };
      }

      case "search_service_logs": {
        const typedArgs = args as SearchLogsArgs;
        const searchService = typedArgs?.service;
        const searchQuery = typedArgs?.query;
        const caseSensitive = typedArgs?.case_sensitive ?? false;
        if (!searchService || !searchQuery) {
          return {
            content: [
              {
                type: "text",
                text: "Error: service and query parameters are required",
              },
            ],
          };
        }
        const searchResult = await processManager.searchServiceLogs(
          searchService,
          searchQuery,
          caseSensitive
        );
        return {
          content: [
            {
              type: "text",
              text: searchResult.success
                ? `Search results for "${searchQuery}" in ${searchService} logs:\n\n${searchResult.matches?.join("\n") ?? "No matches found"}`
                : `Error searching logs: ${searchResult.message}`,
            },
          ],
        };
      }

      case "tail_service_logs": {
        const typedArgs = args as ServiceLogsArgs;
        const tailService = typedArgs?.service;
        const tailLines = typedArgs?.lines ?? 10;
        if (!tailService) {
          return {
            content: [
              {
                type: "text",
                text: "Error: service parameter is required",
              },
            ],
          };
        }
        const tailResult = await processManager.tailServiceLogs(
          tailService,
          tailLines
        );
        return {
          content: [
            {
              type: "text",
              text: tailResult.success
                ? `Last ${tailLines} lines from ${tailService}:\n\n${tailResult.logs?.join("\n") ?? "No logs available"}`
                : `Error tailing logs: ${tailResult.message}`,
            },
          ],
        };
      }

      case "send_command_to_service": {
        const typedArgs = args as SendCommandArgs;
        const commandService = typedArgs?.service;
        const command = typedArgs?.command;
        if (!commandService || !command) {
          return {
            content: [
              {
                type: "text",
                text: "Error: service and command parameters are required",
              },
            ],
          };
        }
        const commandResult = await processManager.sendCommandToService(
          commandService,
          command
        );
        return {
          content: [
            {
              type: "text",
              text: `Command "${command}" sent to ${commandService}: ${commandResult.success ? "SUCCESS" : "FAILED"}\n${commandResult.message}`,
            },
          ],
        };
      }

      case "focus_service_window": {
        const typedArgs = args as ServiceArgs;
        const focusService = typedArgs?.service;
        if (!focusService) {
          return {
            content: [
              {
                type: "text",
                text: "Error: service parameter is required",
              },
            ],
          };
        }
        const focusResult =
          await processManager.focusServiceWindow(focusService);
        return {
          content: [
            {
              type: "text",
              text: `Focus ${focusService} window: ${focusResult.success ? "SUCCESS" : "FAILED"}\n${focusResult.message}`,
            },
          ],
        };
      }

      // API Query Tools
      case "query_api": {
        const typedArgs = args as ApiQueryArgs;
        const endpoint = typedArgs?.endpoint;
        const method = typedArgs?.method ?? "GET";
        const body = typedArgs?.body;
        const headers = typedArgs?.headers;

        if (!endpoint) {
          return {
            content: [
              {
                type: "text",
                text: "Error: endpoint parameter is required",
              },
            ],
          };
        }

        const apiResult = await apiManager.queryApi(
          endpoint,
          method,
          body,
          headers
        );
        return {
          content: [
            {
              type: "text",
              text: `API Query Result: ${apiResult.success ? "SUCCESS" : "FAILED"}\n${apiResult.message}\n\nResponse Data:\n${apiResult.data ? JSON.stringify(apiResult.data, null, 2) : "No data"}`,
            },
          ],
        };
      }

      case "check_backend_health": {
        const healthResult = await apiManager.isServerRunning();
        return {
          content: [
            {
              type: "text",
              text: `Backend Health: ${healthResult.running ? "HEALTHY" : "UNHEALTHY"}\n${healthResult.message}`,
            },
          ],
        };
      }

      default:
        return {
          content: [
            {
              type: "text",
              text: `Unknown tool: ${name}`,
            },
          ],
        };
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error executing tool ${name}: ${(error as Error).message}`,
        },
      ],
    };
  }
});

console.log("Starting Libra Development MCP Server...");
console.log(`Process working directory: ${process.cwd()}`);
console.log(
  `Available services: ${processManager.getAvailableServices().join(", ")}`
);

// Track if shutdown is already in progress to prevent multiple calls
let isShuttingDown = false;

// Shutdown handler to cleanup services when MCP server exits
const shutdown = async () => {
  if (isShuttingDown) {
    return; // Already shutting down, don't run again
  }
  isShuttingDown = true;

  console.log("MCP Server shutting down, cleaning up services...");
  try {
    await processManager.cleanup();
    console.log("Cleanup completed successfully");

    // Give a small buffer for any final async operations
    await new Promise(resolve => setTimeout(resolve, 500));
  } catch (error) {
    console.error("Error during cleanup:", error);
  }

  console.log("Exiting process...");
  process.exit(0);
};

// Handle various shutdown signals and events
process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());
process.on("SIGHUP", () => void shutdown());

// Handle stdio close (when Claude Code disconnects)
process.stdin.on("end", () => {
  console.log("Stdin ended, initiating shutdown...");
  void shutdown();
});

process.stdin.on("close", () => {
  console.log("Stdin closed, initiating shutdown...");
  void shutdown();
});

// Handle uncaught errors
process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
  void shutdown();
});

server.connect(new StdioServerTransport());
console.log("MCP Server connected with all tools registered!");
