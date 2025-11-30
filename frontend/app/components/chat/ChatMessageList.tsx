import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import type { ExecutionEvent, MessageRole } from "@/types/api";
import { ChatMessage } from "./ChatMessage";
import { ExecutionLogBlock } from "./ExecutionLogBlock";

// Message item that can include execution events
export interface ChatMessageItem {
  role: MessageRole;
  content: string;
  executionEvent?: ExecutionEvent & { taskTitle?: string };
}

interface ChatMessageListProps {
  messages: ChatMessageItem[];
  streamingContent?: string;
  isExtractingTasks?: boolean;
  isExecutionLogsExpanded: boolean;
  onToggleExecutionLogsExpanded: () => void;
  isDebugMode: boolean;
  onToggleDebugMode: () => void;
}

// Group messages into regular messages and execution event blocks
type MessageGroup =
  | { type: "regular"; messages: ChatMessageItem[] }
  | { type: "execution"; messages: ChatMessageItem[] };

function groupMessages(messages: ChatMessageItem[]): MessageGroup[] {
  const groups: MessageGroup[] = [];

  for (const message of messages) {
    const isExecution = !!message.executionEvent;
    const groupType = isExecution ? "execution" : "regular";
    const lastGroup = groups[groups.length - 1];

    if (!lastGroup || lastGroup.type !== groupType) {
      // Start a new group
      groups.push({ type: groupType, messages: [message] });
    } else {
      // Add to current group
      lastGroup.messages.push(message);
    }
  }

  return groups;
}

export function ChatMessageList({
  messages,
  streamingContent,
  isExtractingTasks = false,
  isExecutionLogsExpanded,
  onToggleExecutionLogsExpanded,
  isDebugMode,
  onToggleDebugMode,
}: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent, isExtractingTasks]);

  const messageGroups = groupMessages(messages);

  return (
    <div className="pb-8">
      {messageGroups.map((group, groupIndex) => {
        if (group.type === "execution") {
          return (
            <ExecutionLogBlock
              key={`execution-${groupIndex}`}
              executionMessages={group.messages}
              isExpanded={isExecutionLogsExpanded}
              onToggleExpanded={onToggleExecutionLogsExpanded}
              isDebugMode={isDebugMode}
              onToggleDebugMode={onToggleDebugMode}
            />
          );
        }

        // Regular messages
        return group.messages.map((message, msgIndex) => (
          <ChatMessage
            key={`regular-${groupIndex}-${msgIndex}`}
            messageRole={message.role}
            content={message.content}
            executionEvent={message.executionEvent}
          />
        ));
      })}
      {streamingContent && (
        <ChatMessage
          messageRole="assistant"
          content={streamingContent}
          isStreaming
        />
      )}
      {isExtractingTasks && (
        <div className="px-6 py-4">
          <div className="flex items-center gap-3 bg-primary/10 border border-primary/20 rounded-lg px-4 py-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="font-medium text-primary">Generating Tasks...</span>
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
