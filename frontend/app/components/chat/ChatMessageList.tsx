import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import type { ExecutionEvent, MessageRole } from "@/types/api";
import { ChatMessage } from "./ChatMessage";

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
}

export function ChatMessageList({
  messages,
  streamingContent,
  isExtractingTasks = false,
}: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent, isExtractingTasks]);

  return (
    <div className="pb-8">
      {messages.map((message, index) => (
        <ChatMessage
          key={index}
          messageRole={message.role}
          content={message.content}
          executionEvent={message.executionEvent}
        />
      ))}
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
