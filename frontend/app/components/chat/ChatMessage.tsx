import { cn } from "@/lib/utils";
import { ReactMarkdown, markdownProseClasses } from "@/lib/markdown";
import type { ExecutionEvent, MessageRole } from "@/types/api";
import {
  Play,
  Wrench,
  CheckCircle2,
  XCircle,
  MessageSquare,
  AlertCircle,
  Zap,
} from "lucide-react";

type ExecutionEventWithTitle = ExecutionEvent & { taskTitle?: string };

interface ChatMessageProps {
  messageRole: MessageRole;
  content: string;
  isStreaming?: boolean;
  executionEvent?: ExecutionEventWithTitle;
  compact?: boolean;
}

function ExecutionEventMessage({ event, compact = false }: { event: ExecutionEventWithTitle; compact?: boolean }) {
  const getEventConfig = () => {
    switch (event.type) {
      case "task_selected":
        return {
          icon: Play,
          bgColor: "bg-blue-50 dark:bg-blue-950",
          iconColor: "text-blue-600",
          label: "Starting task",
          content: event.taskTitle || event.taskId,
        };
      case "tool_call":
        return {
          icon: Wrench,
          bgColor: "bg-yellow-50 dark:bg-yellow-950",
          iconColor: "text-yellow-600",
          label: `Using ${event.tool}`,
          content: typeof event.input === "object"
            ? JSON.stringify(event.input, null, 2)
            : String(event.input),
        };
      case "tool_result":
        return {
          icon: Zap,
          bgColor: "bg-green-50 dark:bg-green-950",
          iconColor: "text-green-600",
          label: `Result from ${event.tool}`,
          content: event.output,
        };
      case "task_completed":
        return event.status === "done"
          ? {
              icon: CheckCircle2,
              bgColor: "bg-green-50 dark:bg-green-950",
              iconColor: "text-green-600",
              label: "Task completed",
              content: event.result || event.taskTitle,
            }
          : {
              icon: XCircle,
              bgColor: "bg-red-50 dark:bg-red-950",
              iconColor: "text-red-600",
              label: "Task failed",
              content: event.result || event.taskTitle,
            };
      case "reflection":
        return {
          icon: MessageSquare,
          bgColor: "bg-purple-50 dark:bg-purple-950",
          iconColor: "text-purple-600",
          label: "Reflection",
          content: event.text,
        };
      case "error":
        return {
          icon: AlertCircle,
          bgColor: "bg-red-50 dark:bg-red-950",
          iconColor: "text-red-600",
          label: "Error",
          content: event.error,
        };
      case "done":
        return {
          icon: CheckCircle2,
          bgColor: "bg-green-50 dark:bg-green-950",
          iconColor: "text-green-600",
          label: "Execution complete",
          content: `${event.summary?.completed}/${event.summary?.total} tasks completed${event.summary?.failed ? `, ${event.summary.failed} failed` : ""}`,
        };
      default:
        return {
          icon: Zap,
          bgColor: "bg-gray-50 dark:bg-gray-900",
          iconColor: "text-gray-600",
          label: "Event",
          content: JSON.stringify(event),
        };
    }
  };

  const config = getEventConfig();
  const Icon = config.icon;

  // Compact mode: smaller padding, single line
  if (compact) {
    return (
      <div className={cn("flex items-center gap-2 px-3 py-1.5 mx-2 my-0.5 rounded", config.bgColor)}>
        <Icon className={cn("h-4 w-4 flex-shrink-0", config.iconColor)} />
        <span className="text-xs font-medium text-muted-foreground">
          {config.label}:
        </span>
        <span className="text-xs truncate flex-1 min-w-0">
          {config.content && config.content.length > 100
            ? `${config.content.slice(0, 100)}...`
            : config.content}
        </span>
      </div>
    );
  }

  return (
    <div className={cn("flex gap-3 p-3 rounded-lg mx-4 my-2", config.bgColor)}>
      <Icon className={cn("h-5 w-5 flex-shrink-0 mt-0.5", config.iconColor)} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-muted-foreground mb-1">
          {config.label}
        </p>
        <p className="text-sm whitespace-pre-wrap break-words">
          {config.content && config.content.length > 500
            ? `${config.content.slice(0, 500)}...`
            : config.content}
        </p>
      </div>
    </div>
  );
}

export function ChatMessage({
  messageRole,
  content,
  isStreaming = false,
  executionEvent,
  compact = false,
}: ChatMessageProps) {
  // If this is an execution event, render it differently
  if (executionEvent) {
    return <ExecutionEventMessage event={executionEvent} compact={compact} />;
  }

  // System messages without execution events (like "Starting execution...")
  if (messageRole === "system") {
    return (
      <div className="flex justify-center py-2">
        <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
          {content}
        </span>
      </div>
    );
  }

  const isAssistant = messageRole === "assistant";

  return (
    <div className={cn("flex p-4", isAssistant ? "justify-start" : "justify-end")}>
      <div
        className={cn(
          "max-w-[80%]",
          !isAssistant && "bg-muted/50 rounded-2xl px-4 py-2"
        )}
      >
        <div className={cn("text-sm", markdownProseClasses)}>
          <ReactMarkdown>{content}</ReactMarkdown>
          {isStreaming && (
            <span className="inline-block w-2 h-4 ml-1 bg-primary animate-pulse" />
          )}
        </div>
      </div>
    </div>
  );
}
