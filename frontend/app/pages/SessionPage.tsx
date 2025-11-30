import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { api } from "@/services/api";
import { useSSE } from "@/hooks/useSSE";
import type { Message, Task, ChatEvent, SessionDetail } from "@/types/api";
import { Button } from "@/components/ui/button";
import { ChatInput } from "@/components/chat/ChatInput";
import { ChatMessageList } from "@/components/chat/ChatMessageList";
import { TaskList } from "@/components/session/TaskList";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";

export function SessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<SessionDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [streamingContent, setStreamingContent] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Use a ref to track streaming content for the done handler
  const streamingContentRef = useRef("");

  // Update ref whenever streamingContent changes
  useEffect(() => {
    streamingContentRef.current = streamingContent;
  }, [streamingContent]);

  const { connect } = useSSE<ChatEvent>({
    onMessage: useCallback((event: ChatEvent) => {
      switch (event.type) {
        case "content":
          setStreamingContent((prev) => prev + event.content);
          break;
        case "tasks_updated":
          setTasks(event.tasks);
          break;
        case "done":
          // Add the streamed message to the messages list
          // Use clean content from server (without JSON blocks) if available
          const finalContent = event.content || streamingContentRef.current;
          if (finalContent) {
            setMessages((prev) => [
              ...prev,
              {
                id: crypto.randomUUID(),
                sessionId: sessionId!,
                role: "assistant",
                content: finalContent,
                createdAt: new Date().toISOString(),
              },
            ]);
          }
          setStreamingContent("");
          setIsSending(false);
          break;
        case "error":
          console.error("Chat error:", event.error);
          setStreamingContent("");
          setIsSending(false);
          break;
      }
    }, [sessionId]),  // Removed streamingContent dependency
  });

  useEffect(() => {
    if (sessionId) {
      loadSession();
    }
  }, [sessionId]);

  const loadSession = async () => {
    if (!sessionId) return;

    try {
      const sessionData = await api.getSession(sessionId);
      setSession(sessionData);
      setMessages(sessionData.messages);
      setTasks(sessionData.tasks);
    } catch (error) {
      console.error("Failed to load session:", error);
      navigate("/");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!sessionId || isSending) return;

    // Add user message immediately
    const userMessage: Message = {
      id: crypto.randomUUID(),
      sessionId,
      role: "user",
      content: message,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsSending(true);
    setStreamingContent("");

    // Connect to SSE endpoint
    const chatUrl = api.getChatSSEUrl(sessionId);
    connect(chatUrl, { message });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingIndicator size="lg" text="Loading session..." />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="flex items-center gap-4 p-4 border-b border-border bg-card">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold truncate">
              {session?.title || "New Session"}
            </h1>
            <p className="text-xs text-muted-foreground">
              {session?.status}
            </p>
          </div>
        </header>

        {/* Messages */}
        <ChatMessageList
          messages={messages}
          streamingContent={streamingContent}
        />

        {/* Input */}
        <ChatInput
          onSend={handleSendMessage}
          disabled={isSending}
          placeholder={
            messages.length === 0
              ? "Describe your goal..."
              : "Ask a follow-up question..."
          }
        />
      </div>

      {/* Task Panel */}
      <aside className="w-80 border-l border-border bg-card">
        <TaskList tasks={tasks} />
      </aside>
    </div>
  );
}
