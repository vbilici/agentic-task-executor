import { cn } from "@/lib/utils";
import type { MessageRole } from "@/types/api";
import { Bot, User } from "lucide-react";

interface ChatMessageProps {
  role: MessageRole;
  content: string;
  isStreaming?: boolean;
}

export function ChatMessage({
  role,
  content,
  isStreaming = false,
}: ChatMessageProps) {
  const isAssistant = role === "assistant";

  return (
    <div
      className={cn(
        "flex gap-3 p-4",
        isAssistant ? "bg-muted/50" : "bg-background"
      )}
    >
      <div
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0",
          isAssistant ? "bg-primary text-primary-foreground" : "bg-secondary"
        )}
      >
        {isAssistant ? (
          <Bot className="h-4 w-4" />
        ) : (
          <User className="h-4 w-4" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium mb-1">
          {isAssistant ? "Assistant" : "You"}
        </p>
        <div className="text-sm text-foreground whitespace-pre-wrap">
          {content}
          {isStreaming && (
            <span className="inline-block w-2 h-4 ml-1 bg-primary animate-pulse" />
          )}
        </div>
      </div>
    </div>
  );
}
