import { cn } from "@/lib/utils";
import type { ExecutionEvent } from "@/types/api";
import {
  CheckCircle2,
  XCircle,
  Wrench,
  ArrowRight,
  MessageSquare,
  AlertCircle,
  ListTodo,
  FileSearch,
  FileX,
  FileText,
} from "lucide-react";
import { ToolCallDisplay } from "./ToolCallDisplay";

interface ExecutionLogEntryProps {
  event: ExecutionEvent;
  timestamp: Date;
  taskTitle?: string;
}

interface EventConfig {
  icon: typeof CheckCircle2;
  bgColor: string;
  borderColor: string;
  textColor: string;
  label: string;
}

function getEventConfig(event: ExecutionEvent): EventConfig {
  switch (event.type) {
    case "task_selected":
      return {
        icon: ListTodo,
        bgColor: "bg-blue-50 dark:bg-blue-950",
        borderColor: "border-blue-200 dark:border-blue-800",
        textColor: "text-blue-700 dark:text-blue-300",
        label: "Task Selected",
      };
    case "tool_call":
      return {
        icon: Wrench,
        bgColor: "bg-yellow-50 dark:bg-yellow-950",
        borderColor: "border-yellow-200 dark:border-yellow-800",
        textColor: "text-yellow-700 dark:text-yellow-300",
        label: "Tool Call",
      };
    case "tool_result":
      return {
        icon: ArrowRight,
        bgColor: "bg-green-50 dark:bg-green-950",
        borderColor: "border-green-200 dark:border-green-800",
        textColor: "text-green-700 dark:text-green-300",
        label: "Tool Result",
      };
    case "task_completed":
      return event.status === "done"
        ? {
            icon: CheckCircle2,
            bgColor: "bg-green-50 dark:bg-green-950",
            borderColor: "border-green-200 dark:border-green-800",
            textColor: "text-green-700 dark:text-green-300",
            label: "Task Completed",
          }
        : {
            icon: XCircle,
            bgColor: "bg-red-50 dark:bg-red-950",
            borderColor: "border-red-200 dark:border-red-800",
            textColor: "text-red-700 dark:text-red-300",
            label: "Task Failed",
          };
    case "reflection":
      return {
        icon: MessageSquare,
        bgColor: "bg-gray-50 dark:bg-gray-900",
        borderColor: "border-gray-200 dark:border-gray-700",
        textColor: "text-gray-700 dark:text-gray-300",
        label: "Reflection",
      };
    case "error":
      return {
        icon: AlertCircle,
        bgColor: "bg-red-50 dark:bg-red-950",
        borderColor: "border-red-200 dark:border-red-800",
        textColor: "text-red-700 dark:text-red-300",
        label: "Error",
      };
    case "artifact_analysis_start":
      return {
        icon: FileSearch,
        bgColor: "bg-purple-50 dark:bg-purple-950",
        borderColor: "border-purple-200 dark:border-purple-800",
        textColor: "text-purple-700 dark:text-purple-300",
        label: "Analyzing for Artifacts",
      };
    case "artifact_analysis_complete":
      return {
        icon: FileX,
        bgColor: "bg-gray-50 dark:bg-gray-900",
        borderColor: "border-gray-200 dark:border-gray-700",
        textColor: "text-gray-700 dark:text-gray-300",
        label: "No Artifact Needed",
      };
    case "artifact_created":
      return {
        icon: CheckCircle2,
        bgColor: "bg-purple-50 dark:bg-purple-950",
        borderColor: "border-purple-200 dark:border-purple-800",
        textColor: "text-purple-700 dark:text-purple-300",
        label: "Artifact Created",
      };
    case "summary_creating":
      return {
        icon: FileText,
        bgColor: "bg-blue-50 dark:bg-blue-950",
        borderColor: "border-blue-200 dark:border-blue-800",
        textColor: "text-blue-700 dark:text-blue-300",
        label: "Creating Summary",
      };
    case "execution_summary":
      return {
        icon: FileText,
        bgColor: "bg-green-50 dark:bg-green-950",
        borderColor: "border-green-200 dark:border-green-800",
        textColor: "text-green-700 dark:text-green-300",
        label: "Execution Summary",
      };
    case "done":
      return {
        icon: CheckCircle2,
        bgColor: "bg-green-50 dark:bg-green-950",
        borderColor: "border-green-200 dark:border-green-800",
        textColor: "text-green-700 dark:text-green-300",
        label: "Execution Complete",
      };
    default:
      return {
        icon: ArrowRight,
        bgColor: "bg-gray-50 dark:bg-gray-900",
        borderColor: "border-gray-200 dark:border-gray-700",
        textColor: "text-gray-700 dark:text-gray-300",
        label: "Event",
      };
  }
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function renderEventContent(
  event: ExecutionEvent,
  taskTitle?: string
): React.ReactNode {
  switch (event.type) {
    case "task_selected":
      return (
        <p className="text-sm">
          Working on: <span className="font-medium">{taskTitle || event.taskId}</span>
        </p>
      );
    case "tool_call":
      return <ToolCallDisplay tool={event.tool} input={event.input} />;
    case "tool_result":
      return (
        <div className="text-sm">
          <p className="text-xs text-muted-foreground mb-1">
            Result from {event.tool}:
          </p>
          <p className="whitespace-pre-wrap break-words text-xs bg-muted/50 p-2 rounded">
            {event.output.length > 500
              ? `${event.output.slice(0, 500)}...`
              : event.output}
          </p>
        </div>
      );
    case "task_completed":
      return (
        <div className="text-sm">
          <p className="font-medium">
            {event.status === "done" ? "Completed" : "Failed"}:{" "}
            {taskTitle || event.taskId}
          </p>
          {event.result && (
            <p className="text-xs mt-1 text-muted-foreground">{event.result}</p>
          )}
        </div>
      );
    case "reflection":
      return (
        <p className="text-sm italic text-muted-foreground">{event.text}</p>
      );
    case "error":
      return <p className="text-sm font-medium">{event.error}</p>;
    case "artifact_analysis_start":
      return (
        <p className="text-sm text-muted-foreground">
          Analyzing task result to determine if an artifact should be created...
        </p>
      );
    case "artifact_analysis_complete":
      return (
        <p className="text-sm text-muted-foreground">
          Task result does not require an artifact.
        </p>
      );
    case "artifact_created":
      return (
        <p className="text-sm">
          Created artifact: <span className="font-medium">{event.name}</span> (
          {event.artifactType})
        </p>
      );
    case "summary_creating":
      return (
        <p className="text-sm text-muted-foreground">
          Generating execution summary...
        </p>
      );
    case "execution_summary":
      return (
        <p className="text-sm">{event.summary}</p>
      );
    case "done":
      return (
        <div className="text-sm">
          <p className="font-medium">Execution completed</p>
          <p className="text-xs text-muted-foreground mt-1">
            {event.summary.completed} of {event.summary.total} tasks completed
            {event.summary.failed > 0 && `, ${event.summary.failed} failed`}
          </p>
        </div>
      );
    default:
      return null;
  }
}

export function ExecutionLogEntry({
  event,
  timestamp,
  taskTitle,
}: ExecutionLogEntryProps) {
  const config = getEventConfig(event);
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "p-3 rounded-lg border",
        config.bgColor,
        config.borderColor
      )}
    >
      <div className="flex items-start gap-3">
        <Icon className={cn("h-4 w-4 mt-0.5 flex-shrink-0", config.textColor)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className={cn("text-xs font-medium", config.textColor)}>
              {config.label}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatTime(timestamp)}
            </span>
          </div>
          {renderEventContent(event, taskTitle)}
        </div>
      </div>
    </div>
  );
}
