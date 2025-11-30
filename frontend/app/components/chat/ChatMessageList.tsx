import { useEffect, useRef } from "react";
import type { ExecutionEvent, MessageRole } from "@/types/api";
import { ChatMessage } from "./ChatMessage";
import { ScrollArea } from "@/components/ui/scroll-area";

// Message item that can include execution events
export interface ChatMessageItem {
  role: MessageRole;
  content: string;
  executionEvent?: ExecutionEvent & { taskTitle?: string };
}

interface ChatMessageListProps {
  messages: ChatMessageItem[];
  streamingContent?: string;
}

export function ChatMessageList({
  messages,
  streamingContent,
}: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  return (
    <ScrollArea className="flex-1">
      <div>
        {messages.map((message, index) => (
          <ChatMessage
            key={index}
            role={message.role}
            content={message.content}
            executionEvent={message.executionEvent}
          />
        ))}
        {streamingContent && (
          <ChatMessage
            role="assistant"
            content={streamingContent}
            isStreaming
          />
        )}
      </div>
      <div ref={bottomRef} />
    </ScrollArea>
  );
}
