import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { api } from "@/services/api";
import { useSSE } from "@/hooks/useSSE";
import type {
  Task,
  ChatEvent,
  ExecutionEvent,
  SessionDetail,
  TaskStatus,
} from "@/types/api";
import { Button } from "@/components/ui/button";
import { ChatInput } from "@/components/chat/ChatInput";
import { ChatMessageList, type ChatMessageItem } from "@/components/chat/ChatMessageList";
import { TaskList } from "@/components/session/TaskList";
import { ExecuteButton } from "@/components/session/ExecuteButton";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";

export function SessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  // Session state
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Chat streaming state
  const [streamingContent, setStreamingContent] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Execution state
  const [isExecuting, setIsExecuting] = useState(false);

  // Reference to tasks for execution event handler
  const tasksRef = useRef<Task[]>([]);
  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  // Use a ref to track streaming content for the done handler
  const streamingContentRef = useRef("");

  // Update ref whenever streamingContent changes
  useEffect(() => {
    streamingContentRef.current = streamingContent;
  }, [streamingContent]);

  // Chat SSE handler
  const { connect: connectChat } = useSSE<ChatEvent>({
    onMessage: useCallback((event: ChatEvent) => {
      switch (event.type) {
        case "content":
          setStreamingContent((prev) => prev + event.content);
          break;
        case "tasks_updated":
          setTasks(event.tasks);
          break;
        case "done": {
          // Add the streamed message to the messages list
          const finalContent = event.content || streamingContentRef.current;
          if (finalContent) {
            setMessages((prev) => [
              ...prev,
              { role: "assistant", content: finalContent },
            ]);
          }
          setStreamingContent("");
          setIsSending(false);
          break;
        }
        case "error":
          console.error("Chat error:", event.error);
          setStreamingContent("");
          setIsSending(false);
          break;
      }
    }, []),
  });

  // Helper to get task title from current tasks
  const getTaskTitle = useCallback((taskId: string | undefined) => {
    if (!taskId) return undefined;
    const task = tasksRef.current.find((t) => t.id === taskId);
    return task?.title;
  }, []);

  // Execution SSE handler - we use 'unknown' first to handle content events from backend
  const { connect: connectExecution } = useSSE<ExecutionEvent | { type: "content"; content: string }>({
    onMessage: useCallback((event: ExecutionEvent | { type: "content"; content: string }) => {
      // Skip content events (streaming tokens) - they shouldn't appear in the chat
      if (event.type === "content") {
        return;
      }

      // Now we know it's a proper ExecutionEvent
      const execEvent = event as ExecutionEvent;

      // Get taskId if it exists on the event
      const taskId = "taskId" in execEvent ? execEvent.taskId : undefined;

      // Add execution event as a system message in chat
      const eventWithTaskTitle = {
        ...execEvent,
        taskTitle: getTaskTitle(taskId),
      };
      setMessages((prev) => [
        ...prev,
        { role: "system" as const, content: "", executionEvent: eventWithTaskTitle },
      ]);

      // Update task status based on event
      switch (event.type) {
        case "task_selected":
          setTasks((prev) =>
            prev.map((task) =>
              task.id === event.taskId
                ? { ...task, status: "in_progress" as TaskStatus }
                : task
            )
          );
          break;
        case "task_completed":
          setTasks((prev) =>
            prev.map((task) =>
              task.id === event.taskId
                ? {
                    ...task,
                    status: event.status as TaskStatus,
                    result: event.result,
                  }
                : task
            )
          );
          break;
        case "reflection":
          setTasks((prev) =>
            prev.map((task) =>
              task.id === event.taskId
                ? { ...task, reflection: event.text }
                : task
            )
          );
          break;
        case "done":
          setIsExecuting(false);
          // Update session status
          setSession((prev) =>
            prev ? { ...prev, status: "completed" } : prev
          );
          break;
        case "error":
          if (!event.taskId) {
            // Global error - stop execution
            setIsExecuting(false);
          }
          break;
      }
    }, [getTaskTitle]),
  });

  const loadSession = useCallback(async () => {
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
  }, [sessionId, navigate]);

  useEffect(() => {
    if (sessionId) {
      loadSession();
    }
  }, [sessionId, loadSession]);

  const handleSendMessage = async (message: string) => {
    if (!sessionId || isSending) return;

    // Add user message immediately (optimistic update)
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setIsSending(true);
    setStreamingContent("");

    // Connect to SSE endpoint
    const chatUrl = api.getChatSSEUrl(sessionId);
    connectChat(chatUrl, { message });
  };

  const handleExecute = () => {
    if (!sessionId || isExecuting) return;

    setIsExecuting(true);

    // Add a system message indicating execution started
    setMessages((prev) => [
      ...prev,
      { role: "system" as const, content: "Starting task execution..." },
    ]);

    // Update session status
    setSession((prev) => (prev ? { ...prev, status: "executing" } : prev));

    // Connect to execution SSE endpoint
    const executeUrl = api.getExecuteSSEUrl(sessionId);
    connectExecution(executeUrl, {});
  };

  // Count pending tasks
  const pendingTaskCount = tasks.filter(
    (task) => task.status === "pending"
  ).length;

  // Determine if we can execute (has pending tasks and not already executing)
  const canExecute =
    pendingTaskCount > 0 &&
    !isExecuting &&
    !isSending &&
    session?.status !== "executing" &&
    session?.status !== "completed";

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
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold truncate">
              {session?.title || "New Session"}
            </h1>
            <p className="text-xs text-muted-foreground">{session?.status}</p>
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
          disabled={isSending || isExecuting}
          placeholder={
            isExecuting
              ? "Execution in progress..."
              : messages.length === 0
                ? "Describe your goal..."
                : "Ask a follow-up question..."
          }
        />
      </div>

      {/* Right Panel - Tasks */}
      <aside className="w-96 border-l border-border bg-card flex flex-col">
        {/* Task List */}
        <div className="flex-1">
          <TaskList tasks={tasks} />
        </div>

        {/* Execute Button */}
        {tasks.length > 0 && session?.status !== "completed" && (
          <div className="p-4 border-t border-border">
            <ExecuteButton
              onClick={handleExecute}
              disabled={!canExecute}
              isExecuting={isExecuting}
              pendingTaskCount={pendingTaskCount}
            />
          </div>
        )}
      </aside>
    </div>
  );
}
