import { useEffect, useRef } from "react";
import type { Message } from "@/types/api";
import { ChatMessage } from "./ChatMessage";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ChatMessageListProps {
  messages: Message[];
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
      <div className="divide-y divide-border">
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            role={message.role}
            content={message.content}
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
