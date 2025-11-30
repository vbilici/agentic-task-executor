import { execa } from "execa";
import { resolve } from "path";
import * as fs from "fs";
import * as path from "path";
import chalk from "chalk";

export interface ServiceConfig {
  name: "frontend" | "backend";
  directory: string;
  command: string;
  args: string[];
  port?: number;
}

export interface ServiceState {
  pid: number | null;
  status: "stopped" | "starting" | "running" | "stopping" | "error";
  startTime: Date | null;
  itermWindowId: string | null;
  itermTabId: string | null;
  lastError?: string;
}

interface PersistedState {
  version: string;
  lastUpdated: string;
  services: Record<string, ServiceState>;
}

export class ProcessManager {
  private services: Map<string, ServiceState> = new Map();
  private workspaceRoot: string;
  private stateFilePath: string;
  private configs: ServiceConfig[] = [
    {
      name: "frontend",
      directory: "frontend",
      command: "pnpm",
      args: ["dev"],
      port: 3001,
    },
    {
      name: "backend",
      directory: "backend",
      command: "uv",
      args: ["run", "fastapi", "dev"],
      port: 8000,
    },
  ];

  constructor() {
    // Find workspace root by going up from current directory
    this.workspaceRoot = this.findWorkspaceRoot();
    this.stateFilePath = path.join(
      this.workspaceRoot,
      ".libra-mcp-state.json"
    );

    console.log(
      chalk.green(`[ProcessManager]`),
      `Workspace root set to: ${this.workspaceRoot}`
    );
    console.log(
      chalk.blue(`[ProcessManager]`),
      `State file path: ${this.stateFilePath}`
    );

    // Validate that the workspace root has the expected structure
    const frontendPath = path.join(this.workspaceRoot, "frontend");
    const backendPath = path.join(this.workspaceRoot, "backend");

    if (!fs.existsSync(frontendPath) || !fs.existsSync(backendPath)) {
      console.error(
        chalk.red(`[ProcessManager]`),
        `WARNING: Workspace root does not contain frontend/ and backend/ directories!`
      );
      console.error(
        chalk.red(`[ProcessManager]`),
        `Frontend exists: ${fs.existsSync(frontendPath)}`
      );
      console.error(
        chalk.red(`[ProcessManager]`),
        `Backend exists: ${fs.existsSync(backendPath)}`
      );
    }

    // Initialize service states with default values
    this.configs.forEach((config) => {
      const serviceDir = path.join(this.workspaceRoot, config.directory);
      console.log(
        chalk.blue(`[ProcessManager]`),
        `Service '${config.name}' directory: ${serviceDir} (exists: ${fs.existsSync(serviceDir)})`
      );

      this.services.set(config.name, {
        pid: null,
        status: "stopped",
        startTime: null,
        itermWindowId: null,
        itermTabId: null,
      });
    });

    // Load persisted state (will override default states if available)
    // Note: This is intentionally not awaited to avoid blocking the constructor
    // The state will be loaded asynchronously in the background
    void this.loadPersistedState().catch((error) => {
      console.error(
        chalk.red(`[ProcessManager]`),
        `Error during state load: ${(error as Error).message}`
      );
    });

    // Handle graceful shutdown
    process.on("SIGINT", () => {
      this.cleanup()
        .then(() => {
          console.log(
            chalk.green(`[ProcessManager]`),
            "Graceful shutdown complete"
          );
          process.exit(0);
        })
        .catch((error) => {
          console.error(
            chalk.red(`[ProcessManager]`),
            `Cleanup error: ${(error as Error).message}`
          );
          process.exit(1);
        });
    });

    process.on("SIGTERM", () => {
      this.cleanup()
        .then(() => {
          console.log(
            chalk.green(`[ProcessManager]`),
            "Graceful shutdown complete"
          );
          process.exit(0);
        })
        .catch((error) => {
          console.error(
            chalk.red(`[ProcessManager]`),
            `Cleanup error: ${(error as Error).message}`
          );
          process.exit(1);
        });
    });
  }

  /**
   * Start a service by name in iTerm2
   */
  async startService(serviceName: string): Promise<{
    success: boolean;
    message: string;
    pid?: number;
  }> {
    const config = this.configs.find((c) => c.name === serviceName);
    if (!config) {
      return {
        success: false,
        message: `Service '${serviceName}' not found. Available services: ${this.configs
          .map((c) => c.name)
          .join(", ")}`,
      };
    }

    const state = this.services.get(serviceName)!;

    // Check if already running
    if (state.status === "running") {
      return {
        success: false,
        message: `Service '${serviceName}' is already running`,
      };
    }

    // Check if currently starting
    if (state.status === "starting") {
      return {
        success: false,
        message: `Service '${serviceName}' is already starting...`,
      };
    }

    try {
      console.log(
        chalk.blue(`[ProcessManager]`),
        `Starting ${serviceName} service in iTerm2...`
      );

      // Update state to starting
      state.status = "starting";
      state.lastError = undefined;
      state.startTime = new Date();

      // Resolve the directory path using workspace root
      const workingDirectory = resolve(this.workspaceRoot, config.directory);

      console.log(
        chalk.blue(`[ProcessManager]`),
        `Workspace root: ${this.workspaceRoot}`
      );
      console.log(
        chalk.blue(`[ProcessManager]`),
        `Config directory: ${config.directory}`
      );
      console.log(
        chalk.blue(`[ProcessManager]`),
        `Working directory: ${workingDirectory}`
      );
      console.log(
        chalk.blue(`[ProcessManager]`),
        `Directory exists: ${fs.existsSync(workingDirectory)}`
      );

      // Validate working directory exists
      if (!fs.existsSync(workingDirectory)) {
        state.status = "error";
        state.lastError = `Working directory does not exist: ${workingDirectory}`;
        return {
          success: false,
          message: `Failed to start ${serviceName}: Working directory does not exist: ${workingDirectory}`,
        };
      }

      // Detect display configuration for window positioning
      const displayConfig = await this.detectDisplayConfiguration();
      const windowLayout = this.calculateWindowLayout(
        serviceName,
        displayConfig.bounds,
        displayConfig.alignment,
        displayConfig.unifiedMaxY
      );

      console.log(
        chalk.blue(`[ProcessManager]`),
        `Using screen ${displayConfig.screenIndex} for ${serviceName}`
      );

      // Start the service in iTerm2
      const result = await execa("osascript", [
        "-e",
        `tell application "iTerm2"
          create window with default profile
          set newWindow to current window
          set windowId to id of newWindow

          tell current session of newWindow
            set name to "Libra ${serviceName} (${config.port})"

            write text "cd ${workingDirectory}"
            delay 0.5
            write text "echo 'Starting ${serviceName} service...'"
            delay 0.5
            write text "${config.command} ${config.args.join(" ")}"
          end tell

          -- Set window position and size using window ID for precision
          tell window id windowId
            set bounds to {${windowLayout.left}, ${windowLayout.top}, ${windowLayout.right}, ${windowLayout.bottom}}
          end tell

          return windowId
        end tell`,
      ]);

      // Store the window ID for future control
      state.itermWindowId = result.stdout.trim();
      state.status = "running";

      console.log(
        chalk.green(`[ProcessManager]`),
        `${serviceName} started successfully in iTerm2 window ${state.itermWindowId}`
      );

      // Persist the updated state
      this.savePersistedState();

      return {
        success: true,
        message: `${serviceName} service started successfully in iTerm2`,
      };
    } catch (error) {
      state.status = "error";
      state.lastError = (error as Error).message;
      state.itermWindowId = null;
      state.itermTabId = null;

      console.error(
        chalk.red(`[ProcessManager]`),
        `Failed to start ${serviceName}:`,
        (error as Error).message
      );

      // Persist the error state
      this.savePersistedState();

      return {
        success: false,
        message: `Failed to start ${serviceName}: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Stop a service by closing its iTerm2 window
   */
  async stopService(serviceName: string): Promise<{
    success: boolean;
    message: string;
  }> {
    const state = this.services.get(serviceName);
    if (!state) {
      return {
        success: false,
        message: `Service '${serviceName}' not found`,
      };
    }

    if (state.status === "stopped") {
      return {
        success: true,
        message: `Service '${serviceName}' is already stopped`,
      };
    }

    try {
      console.log(
        chalk.blue(`[ProcessManager]`),
        `Stopping ${serviceName} service...`
      );

      state.status = "stopping";

      if (state.itermWindowId) {
        // SAFETY CHECK: Verify this window actually belongs to the service
        const isValidWindow = await this.verifyWindowIsService(
          state.itermWindowId,
          serviceName
        );

        if (!isValidWindow) {
          console.error(
            chalk.red(`[ProcessManager]`),
            `SAFETY CHECK FAILED: Window ${state.itermWindowId} does not belong to ${serviceName}!`
          );
          console.error(
            chalk.red(`[ProcessManager]`),
            `Refusing to close window to prevent closing wrong window.`
          );

          // Mark as stopped but don't close the window
          state.status = "stopped";
          state.itermWindowId = null;
          state.itermTabId = null;
          state.startTime = null;
          this.savePersistedState();

          return {
            success: false,
            message: `Safety check failed: Window ${state.itermWindowId} does not match ${serviceName}. Service marked as stopped but window not closed.`,
          };
        }

        console.log(
          chalk.green(`[ProcessManager]`),
          `Window verified as ${serviceName} - proceeding to close`
        );

        // Close the window directly (don't send Ctrl+C, just close)
        // The process will be killed when the window closes
        await execa("osascript", [
          "-e",
          `tell application "iTerm2"
            close window id ${state.itermWindowId}
          end tell`,
        ]);

        console.log(
          chalk.green(`[ProcessManager]`),
          `Closed window ${state.itermWindowId} for ${serviceName}`
        );
      }

      // Clean up state
      state.status = "stopped";
      state.itermWindowId = null;
      state.itermTabId = null;
      state.startTime = null;

      console.log(
        chalk.green(`[ProcessManager]`),
        `${serviceName} stopped successfully`
      );

      // Persist the updated state
      this.savePersistedState();

      return {
        success: true,
        message: `${serviceName} service stopped successfully`,
      };
    } catch {
      // Even if we can't control the window, mark as stopped
      state.status = "stopped";
      state.itermWindowId = null;
      state.itermTabId = null;
      state.startTime = null;

      // Persist the stopped state
      this.savePersistedState();

      return {
        success: true,
        message: `${serviceName} service stopped (iTerm2 window may need manual closing)`,
      };
    }
  }

  /**
   * Restart a service by name
   */
  async restartService(serviceName: string): Promise<{
    success: boolean;
    message: string;
    pid?: number;
  }> {
    console.log(
      chalk.blue(`[ProcessManager]`),
      `Restarting ${serviceName} service...`
    );

    // Stop the service first
    const stopResult = await this.stopService(serviceName);
    if (!stopResult.success) {
      return {
        success: false,
        message: `Failed to restart ${serviceName}: ${stopResult.message}`,
      };
    }

    // Wait a moment before starting
    await this.sleep(2000);

    // Start the service
    const startResult = await this.startService(serviceName);
    if (!startResult.success) {
      return {
        success: false,
        message: `Failed to restart ${serviceName}: ${startResult.message}`,
      };
    }

    return {
      success: true,
      message: `${serviceName} service restarted successfully`,
    };
  }

  /**
   * Get the status of a specific service
   */
  getServiceStatus(serviceName: string): {
    success: boolean;
    status?: ServiceState;
    message?: string;
  } {
    const state = this.services.get(serviceName);
    if (!state) {
      return {
        success: false,
        message: `Service '${serviceName}' not found`,
      };
    }

    return {
      success: true,
      status: { ...state }, // Return a copy to prevent external modification
    };
  }

  /**
   * Check if a service is currently running
   */
  isServiceRunning(serviceName: string): boolean {
    const state = this.services.get(serviceName);
    return state?.status === "running" || false;
  }

  /**
   * Get status of all services
   */
  getAllServiceStatuses(): Record<string, ServiceState> {
    const statuses: Record<string, ServiceState> = {};
    this.services.forEach((state, name) => {
      statuses[name] = { ...state }; // Return copies
    });
    return statuses;
  }

  /**
   * Get list of available services
   */
  getAvailableServices(): string[] {
    return this.configs.map((config) => config.name);
  }

  /**
   * Get the current workspace root path
   */
  getWorkspaceRoot(): string {
    return this.workspaceRoot;
  }

  /**
   * Send a command to a running service in iTerm2
   */
  async sendCommandToService(
    serviceName: string,
    command: string
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    const state = this.services.get(serviceName);
    if (!state || !state.itermWindowId) {
      return {
        success: false,
        message: `Service '${serviceName}' is not running in iTerm2`,
      };
    }

    try {
      await execa("osascript", [
        "-e",
        `tell application "iTerm2"
          tell window id ${state.itermWindowId}
            tell current session
              write text "${command}"
            end tell
          end tell
        end tell`,
      ]);

      return {
        success: true,
        message: `Sent command '${command}' to ${serviceName}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to send command to ${serviceName}: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Focus on a service's iTerm2 window
   */
  async focusServiceWindow(serviceName: string): Promise<{
    success: boolean;
    message: string;
  }> {
    const state = this.services.get(serviceName);
    if (!state || !state.itermWindowId) {
      return {
        success: false,
        message: `Service '${serviceName}' is not running in iTerm2`,
      };
    }

    try {
      await execa("osascript", [
        "-e",
        `tell application "iTerm2"
          activate
          select window id ${state.itermWindowId}
        end tell`,
      ]);

      return {
        success: true,
        message: `Focused on ${serviceName} iTerm2 window`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to focus ${serviceName} window: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Get recent logs from a service's iTerm2 session
   */
  async getServiceLogs(
    serviceName: string,
    lines: number = 50
  ): Promise<{
    success: boolean;
    logs?: string[];
    message?: string;
  }> {
    const state = this.services.get(serviceName);
    if (!state || !state.itermWindowId) {
      return {
        success: false,
        message: `Service '${serviceName}' is not running in iTerm2`,
      };
    }

    try {
      const result = await execa("osascript", [
        "-e",
        `tell application "iTerm2"
          tell window id ${state.itermWindowId}
            tell current session
              return contents
            end tell
          end tell
        end tell`,
      ]);

      // Split content into lines and get the last N lines
      const allLines = result.stdout
        .split("\n")
        .filter((line) => line.trim() !== "");
      const recentLines = allLines.slice(-lines);

      return {
        success: true,
        logs: recentLines,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to get logs from ${serviceName}: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Search logs in a service's iTerm2 session
   */
  async searchServiceLogs(
    serviceName: string,
    query: string,
    caseSensitive: boolean = false
  ): Promise<{
    success: boolean;
    matches?: string[];
    message?: string;
  }> {
    const logsResult = await this.getServiceLogs(serviceName, 1000); // Get more lines for searching

    if (!logsResult.success || !logsResult.logs) {
      return {
        success: false,
        message: logsResult.message || `Failed to get logs for searching`,
      };
    }

    try {
      const searchRegex = new RegExp(query, caseSensitive ? "g" : "gi");
      const matches = logsResult.logs.filter((line) => searchRegex.test(line));

      return {
        success: true,
        matches,
      };
    } catch (error) {
      return {
        success: false,
        message: `Invalid search pattern: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Get the last few lines from a service (tail-like functionality)
   */
  async tailServiceLogs(
    serviceName: string,
    lines: number = 10
  ): Promise<{
    success: boolean;
    logs?: string[];
    message?: string;
  }> {
    return this.getServiceLogs(serviceName, lines);
  }

  /**
   * Find the workspace root by looking for frontend/backend directories
   */
  private findWorkspaceRoot(): string {
    console.log(
      chalk.blue(`[ProcessManager]`),
      `Finding workspace root from: ${process.cwd()}`
    );

    // Walk up from current directory looking for frontend + backend directories
    let currentDir = process.cwd();
    let attempts = 0;
    const maxAttempts = 10;

    while (currentDir !== path.dirname(currentDir) && attempts < maxAttempts) {
      attempts++;

      const frontendPath = path.join(currentDir, "frontend");
      const backendPath = path.join(currentDir, "backend");

      if (fs.existsSync(frontendPath) && fs.existsSync(backendPath)) {
        console.log(
          chalk.green(`[ProcessManager]`),
          `Found workspace root: ${currentDir}`
        );
        return currentDir;
      }

      currentDir = path.dirname(currentDir);
    }

    // Fallback: try relative paths from MCP server location
    const mcpServerPattern = /packages[/\\]libra-mcp-server/;
    const currentPath = process.cwd();

    if (mcpServerPattern.test(currentPath)) {
      const potentialRoot = path.resolve(currentPath, "../..");
      const frontendPath = path.join(potentialRoot, "frontend");
      const backendPath = path.join(potentialRoot, "backend");

      if (fs.existsSync(frontendPath) && fs.existsSync(backendPath)) {
        console.log(
          chalk.green(`[ProcessManager]`),
          `Found workspace root via relative path: ${potentialRoot}`
        );
        return potentialRoot;
      }
    }

    // Final fallback
    const fallbackPath = process.cwd();
    console.error(
      chalk.red(`[ProcessManager]`),
      `Could not find workspace root with frontend/backend directories!`
    );
    console.error(
      chalk.red(`[ProcessManager]`),
      `Using current directory as fallback: ${fallbackPath}`
    );

    return fallbackPath;
  }

  /**
   * Detect display configuration and return the target screen bounds with alignment info
   * Prefers external/secondary display if available
   */
  private async detectDisplayConfiguration(): Promise<{
    screenIndex: number;
    bounds: { x: number; y: number; width: number; height: number };
    alignment: "bottom" | "top" | "unknown";
    unifiedMaxY: number;
  }> {
    try {
      // Use JXA (JavaScript for Automation) for better screen API access
      const result = await execa("osascript", [
        "-l",
        "JavaScript",
        "-e",
        `
        const app = Application.currentApplication();
        app.includeStandardAdditions = true;

        // Get screen information using ObjC bridge
        ObjC.import('Cocoa');
        const screens = $.NSScreen.screens;
        const screenCount = screens.count;

        let allScreens = [];
        let targetScreen;
        let screenIndex;

        // Collect all screen info for alignment detection
        for (let i = 0; i < screenCount; i++) {
          const screen = screens.objectAtIndex(i);
          const fullFrame = screen.frame;
          const isMain = screen.isEqual($.NSScreen.mainScreen);

          allScreens.push({
            index: i,
            isMain: isMain,
            y: fullFrame.origin.y,
            height: fullFrame.size.height,
            maxY: fullFrame.origin.y + fullFrame.size.height
          });

          // Prefer external (non-main) screen
          if (!isMain && !targetScreen) {
            targetScreen = screen;
            screenIndex = i + 1;
          }
        }

        // Fallback to main screen if no external found
        if (!targetScreen) {
          targetScreen = $.NSScreen.mainScreen;
          screenIndex = 1;
        }

        // Get visible frame (excludes menu bar and dock)
        const frame = targetScreen.visibleFrame;
        const x = frame.origin.x;
        const y = frame.origin.y;
        const width = frame.size.width;
        const height = frame.size.height;

        // Detect alignment (bottom-aligned if all screens share similar minY)
        let alignment = "unknown";
        let unifiedMaxY = frame.origin.y + frame.size.height;

        if (screenCount > 1) {
          const minY = Math.min(...allScreens.map(s => s.y));
          const maxY = Math.max(...allScreens.map(s => s.maxY));
          const bottomAligned = allScreens.every(s => Math.abs(s.y - minY) < 10);

          alignment = bottomAligned ? "bottom" : "top";
          unifiedMaxY = maxY;
        }

        // Return as comma-separated values: x,y,width,height,screenIndex,alignment,unifiedMaxY
        \`\${x},\${y},\${width},\${height},\${screenIndex},\${alignment},\${unifiedMaxY}\`;
        `,
      ]);

      const parts = result.stdout.trim().split(",");
      const x = Math.floor(parseFloat(parts[0]));
      const y = Math.floor(parseFloat(parts[1]));
      const width = Math.floor(parseFloat(parts[2]));
      const height = Math.floor(parseFloat(parts[3]));
      const screenIndex = parseInt(parts[4]);
      const alignment = parts[5] as "bottom" | "top" | "unknown";
      const unifiedMaxY = Math.floor(parseFloat(parts[6]));

      const bounds = { x, y, width, height };

      console.log(
        chalk.blue(`[ProcessManager]`),
        `Detected display: Screen ${screenIndex}, bounds: ${JSON.stringify(bounds)}, alignment: ${alignment}, unified maxY: ${unifiedMaxY}`
      );

      return { screenIndex, bounds, alignment, unifiedMaxY };
    } catch (error) {
      console.warn(
        chalk.yellow(`[ProcessManager]`),
        `Failed to detect display configuration: ${(error as Error).message}`
      );
      console.warn(
        chalk.yellow(`[ProcessManager]`),
        `Using default bounds: 1920x1080`
      );

      // Fallback to reasonable defaults
      return {
        screenIndex: 1,
        bounds: { x: 0, y: 0, width: 1920, height: 1080 },
        alignment: "unknown",
        unifiedMaxY: 1080,
      };
    }
  }

  /**
   * Calculate window bounds for a service based on screen configuration
   * Layout: Right half of screen, stacked vertically (frontend top, backend bottom)
   *
   * This method auto-calculates positions based on:
   * - Screen alignment (bottom vs top-aligned multi-monitor setups)
   * - iTerm2's minimum Y=375 constraint on external monitors
   * - Unified coordinate space for bottom-aligned screens
   */
  private calculateWindowLayout(
    serviceName: string,
    screenBounds: { x: number; y: number; width: number; height: number },
    alignment: "bottom" | "top" | "unknown",
    unifiedMaxY: number
  ): { left: number; top: number; right: number; bottom: number } {
    const margin = 10; // Small margin for visual spacing

    // Right half of screen (X coordinates) - works for any screen width
    const windowWidth = Math.floor(screenBounds.width / 2) - margin;
    const startX = screenBounds.x + Math.floor(screenBounds.width / 2) + margin;

    // iTerm2 enforces minimum Y=375 on external monitors (menu bar + system UI)
    const iTerm2MinY = 375;

    // Calculate Y positions based on screen alignment
    let backendTop: number;
    let backendBottom: number;
    let frontendTop: number;
    let frontendBottom: number;

    if (alignment === "bottom") {
      // Bottom-aligned screens: split at external monitor's physical top edge
      // Backend window: fits entirely on external monitor
      backendTop = iTerm2MinY;
      backendBottom = screenBounds.height - 3; // Small gap before edge

      // Frontend window: starts just above backend, extends into unified space
      frontendTop = backendBottom + 1; // 1px gap above backend window
      frontendBottom = unifiedMaxY + 4; // Extend to unified coordinate space max

      console.log(
        chalk.blue(`[ProcessManager]`),
        `Bottom-aligned layout: Backend ${backendTop}-${backendBottom}, Frontend ${frontendTop}-${frontendBottom}`
      );
    } else {
      // Top-aligned or unknown: use traditional stacking within screen bounds
      const usableHeight = screenBounds.height - iTerm2MinY;
      const halfHeight = Math.floor(usableHeight / 2);

      backendTop = iTerm2MinY;
      backendBottom = iTerm2MinY + halfHeight - margin;
      frontendTop = backendBottom + margin;
      frontendBottom = screenBounds.height - margin;

      console.log(
        chalk.blue(`[ProcessManager]`),
        `Top-aligned layout: Backend ${backendTop}-${backendBottom}, Frontend ${frontendTop}-${frontendBottom}`
      );
    }

    let layout;
    if (serviceName === "frontend") {
      layout = {
        left: startX,
        top: frontendTop,
        right: startX + windowWidth,
        bottom: frontendBottom,
      };
    } else {
      layout = {
        left: startX,
        top: backendTop,
        right: startX + windowWidth,
        bottom: backendBottom,
      };
    }

    console.log(
      chalk.blue(`[ProcessManager]`),
      `Calculated layout for ${serviceName}: ${JSON.stringify(layout)}`
    );

    return layout;
  }

  /**
   * Helper method to wait for a specified amount of time
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  /**
   * Load persisted state from disk
   */
  private async loadPersistedState(): Promise<void> {
    try {
      if (!fs.existsSync(this.stateFilePath)) {
        console.log(
          chalk.blue(`[ProcessManager]`),
          `No persisted state file found at ${this.stateFilePath}`
        );
        return;
      }

      console.log(
        chalk.blue(`[ProcessManager]`),
        `Loading persisted state from ${this.stateFilePath}`
      );

      const stateContent = fs.readFileSync(this.stateFilePath, "utf8");
      const persistedState: PersistedState = JSON.parse(stateContent);

      console.log(
        chalk.blue(`[ProcessManager]`),
        `Loaded state version ${persistedState.version}, last updated: ${persistedState.lastUpdated}`
      );

      // Restore service states and validate them
      for (const [serviceName, serviceState] of Object.entries(
        persistedState.services
      )) {
        if (this.services.has(serviceName)) {
          // Convert startTime string back to Date
          const restoredState: ServiceState = {
            ...serviceState,
            startTime: serviceState.startTime
              ? new Date(serviceState.startTime)
              : null,
          };

          // Validate that the iTerm2 window still exists
          if (restoredState.itermWindowId && restoredState.status === "running") {
            const windowExists = await this.validateWindowExists(
              restoredState.itermWindowId
            );

            if (windowExists) {
              this.services.set(serviceName, restoredState);
              console.log(
                chalk.green(`[ProcessManager]`),
                `Restored ${serviceName} service state (window ${restoredState.itermWindowId} is still running)`
              );
            } else {
              // Window no longer exists, mark as stopped
              restoredState.status = "stopped";
              restoredState.itermWindowId = null;
              restoredState.itermTabId = null;
              this.services.set(serviceName, restoredState);
              console.log(
                chalk.yellow(`[ProcessManager]`),
                `${serviceName} service was running but iTerm2 window is gone, marking as stopped`
              );
            }
          } else if (restoredState.status === "stopped") {
            this.services.set(serviceName, restoredState);
            console.log(
              chalk.blue(`[ProcessManager]`),
              `Restored ${serviceName} service state (stopped)`
            );
          }
        }
      }

      console.log(
        chalk.green(`[ProcessManager]`),
        `Successfully loaded persisted state`
      );
    } catch (error) {
      console.error(
        chalk.red(`[ProcessManager]`),
        `Failed to load persisted state: ${(error as Error).message}`
      );
      console.error(
        chalk.red(`[ProcessManager]`),
        `Starting with fresh state instead`
      );
    }
  }

  /**
   * Save current state to disk
   */
  private savePersistedState(): void {
    try {
      const stateToSave: PersistedState = {
        version: "1.0",
        lastUpdated: new Date().toISOString(),
        services: {},
      };

      // Convert Map to plain object
      this.services.forEach((state, name) => {
        stateToSave.services[name] = {
          ...state,
          startTime: state.startTime ? state.startTime.toISOString() : null,
        } as ServiceState;
      });

      fs.writeFileSync(
        this.stateFilePath,
        JSON.stringify(stateToSave, null, 2),
        "utf8"
      );

      console.log(
        chalk.green(`[ProcessManager]`),
        `State persisted to ${this.stateFilePath}`
      );
    } catch (error) {
      console.error(
        chalk.yellow(`[ProcessManager]`),
        `Failed to persist state: ${(error as Error).message}`
      );
      // Don't throw - persistence failure shouldn't break functionality
    }
  }

  /**
   * Validate that an iTerm2 window still exists
   */
  private async validateWindowExists(windowId: string): Promise<boolean> {
    try {
      await execa("osascript", [
        "-e",
        `tell application "iTerm2"
          return exists window id ${windowId}
        end tell`,
      ]);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the title/name of an iTerm2 window by its ID
   */
  private async getWindowTitle(windowId: string): Promise<string | null> {
    try {
      const result = await execa("osascript", [
        "-e",
        `tell application "iTerm2"
          tell window id ${windowId}
            tell current session
              return name
            end tell
          end tell
        end tell`,
      ]);
      return result.stdout.trim();
    } catch (error) {
      console.error(
        chalk.yellow(`[ProcessManager]`),
        `Failed to get window title for ID ${windowId}: ${(error as Error).message}`
      );
      return null;
    }
  }

  /**
   * Verify that a window belongs to a specific service before closing it
   */
  private async verifyWindowIsService(
    windowId: string,
    serviceName: string
  ): Promise<boolean> {
    const title = await this.getWindowTitle(windowId);

    if (!title) {
      console.warn(
        chalk.yellow(`[ProcessManager]`),
        `Could not verify window ${windowId} - title unavailable`
      );
      return false;
    }

    // iTerm2 overrides custom titles with the running command name
    // So we match against the actual command patterns
    let expectedPatterns: string[];

    if (serviceName === "backend") {
      // Backend uses: uv run fastapi dev
      expectedPatterns = ["uv run fastapi dev", "uv (python", "fastapi"];
    } else if (serviceName === "frontend") {
      // Frontend uses: pnpm dev
      expectedPatterns = ["pnpm dev", "pnpm"];
    } else {
      console.warn(
        chalk.yellow(`[ProcessManager]`),
        `Unknown service ${serviceName} - cannot verify`
      );
      return false;
    }

    const matches = expectedPatterns.some(pattern =>
      title.toLowerCase().includes(pattern.toLowerCase())
    );

    console.log(
      chalk.blue(`[ProcessManager]`),
      `Window verification: "${title}" ${matches ? "matches" : "does NOT match"} patterns [${expectedPatterns.join(", ")}]`
    );

    return matches;
  }

  /**
   * Clean up all running services
   */
  public async cleanup(): Promise<void> {
    console.log(
      chalk.yellow(`[ProcessManager]`),
      "Cleaning up running services..."
    );

    const runningServices = Array.from(this.services.entries()).filter(
      ([, state]) => state.status === "running"
    );

    const stopPromises = runningServices.map(([serviceName]) =>
      this.stopService(serviceName)
    );

    await Promise.all(stopPromises);

    // Final state save to ensure all changes are persisted
    this.savePersistedState();

    console.log(
      chalk.green(`[ProcessManager]`),
      "All services cleaned up successfully"
    );
  }
}
