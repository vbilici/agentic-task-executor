import { useRef, useEffect } from "react";
import { ChevronDown, ChevronRight, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { ChatMessageItem } from "./ChatMessageList";
import { ChatMessage } from "./ChatMessage";
import type { ExecutionEventType } from "@/types/api";

// Main events that are always visible
const MAIN_EVENT_TYPES: ExecutionEventType[] = [
  "task_selected",
  "task_completed",
  "artifact_analysis_start",
  "artifact_created",
  "artifact_analysis_complete",
  "paused",
  "resumed",
  "error",
  "done",
];

interface ExecutionLogBlockProps {
  executionMessages: ChatMessageItem[];
  isExpanded: boolean;
  onToggleExpanded: () => void;
  isDebugMode: boolean;
  onToggleDebugMode: () => void;
}

export function ExecutionLogBlock({
  executionMessages,
  isExpanded,
  onToggleExpanded,
  isDebugMode,
  onToggleDebugMode,
}: ExecutionLogBlockProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Filter messages based on debug mode
  const filteredMessages = isDebugMode
    ? executionMessages
    : executionMessages.filter(
        (msg) =>
          msg.executionEvent &&
          MAIN_EVENT_TYPES.includes(msg.executionEvent.type)
      );

  // In collapsed mode, only show the last message
  const displayedMessages = isExpanded
    ? filteredMessages
    : filteredMessages.slice(-1);

  // Auto-scroll to bottom when expanded and new messages arrive
  useEffect(() => {
    if (isExpanded && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [isExpanded, filteredMessages.length]);

  // If no messages to display, don't render
  if (filteredMessages.length === 0) {
    return null;
  }

  const totalCount = executionMessages.length;
  const filteredCount = filteredMessages.length;
  const hiddenCount = totalCount - filteredCount;

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggleExpanded}>
      <div className="mx-4 my-2 border border-border rounded-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b border-border">
          <CollapsibleTrigger className="flex items-center gap-2 flex-1 text-left hover:bg-muted rounded p-1 -m-1 transition-colors">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            )}
            <Terminal className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            <span className="text-sm font-medium">
              Execution
              <span className="text-muted-foreground font-normal ml-1">
                ({filteredCount} event{filteredCount !== 1 ? "s" : ""})
              </span>
            </span>
          </CollapsibleTrigger>

          {/* Debug checkbox */}
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
            <input
              type="checkbox"
              checked={isDebugMode}
              onChange={(e) => {
                e.stopPropagation();
                onToggleDebugMode();
              }}
              className="h-3 w-3 rounded border-border"
            />
            Debug
            {hiddenCount > 0 && !isDebugMode && (
              <span className="text-muted-foreground">
                (+{hiddenCount})
              </span>
            )}
          </label>

          {/* Expand/Collapse text button */}
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className={cn(
                "text-xs px-2 py-0.5 rounded",
                "text-muted-foreground hover:text-foreground hover:bg-muted",
                "transition-colors"
              )}
            >
              {isExpanded ? "Collapse" : "Expand"}
            </button>
          </CollapsibleTrigger>
        </div>

        {/* Collapsed: show only last message */}
        {!isExpanded && displayedMessages.length > 0 && (
          <div className="py-1">
            {displayedMessages.map((message, index) =>
              message.executionEvent?.type === "resumed" ? (
                <div
                  key={index}
                  className="flex items-center gap-2 py-2 px-3 text-muted-foreground text-xs"
                >
                  <div className="flex-1 border-t border-dashed border-muted-foreground/30" />
                  <span>Resumed</span>
                  <div className="flex-1 border-t border-dashed border-muted-foreground/30" />
                </div>
              ) : (
                <ChatMessage
                  key={index}
                  messageRole={message.role}
                  content={message.content}
                  executionEvent={message.executionEvent}
                  compact
                />
              )
            )}
          </div>
        )}

        {/* Expanded: show all filtered messages */}
        <CollapsibleContent>
          <div ref={scrollRef} className="py-1 max-h-96 overflow-y-auto">
            {filteredMessages.map((message, index) =>
              message.executionEvent?.type === "resumed" ? (
                <div
                  key={index}
                  className="flex items-center gap-2 py-2 px-3 text-muted-foreground text-xs"
                >
                  <div className="flex-1 border-t border-dashed border-muted-foreground/30" />
                  <span>Resumed</span>
                  <div className="flex-1 border-t border-dashed border-muted-foreground/30" />
                </div>
              ) : (
                <ChatMessage
                  key={index}
                  messageRole={message.role}
                  content={message.content}
                  executionEvent={message.executionEvent}
                  compact
                />
              )
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
