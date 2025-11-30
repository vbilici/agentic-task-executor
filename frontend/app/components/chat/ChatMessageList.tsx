import { useEffect, useRef } from "react";
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
      <div ref={bottomRef} />
    </div>
  );
}
