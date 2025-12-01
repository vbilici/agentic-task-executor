import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/services/api";
import { useSSE } from "@/hooks/useSSE";
import { useMobileNavContext } from "@/contexts/MobileNavContext";
import { useSessionContext } from "@/contexts/SessionContext";
import { useExecutionContext } from "@/contexts/ExecutionContext";
import type {
  Task,
  ChatEvent,
  ExecutionEvent,
  SessionDetail,
  TaskStatus,
  ArtifactSummary,
  ArtifactType,
  ExecutionLog,
} from "@/types/api";
import { ChatInput } from "@/components/chat/ChatInput";
import { ChatMessageList, type ChatMessageItem } from "@/components/chat/ChatMessageList";
import { SuggestionChips } from "@/components/chat/SuggestionChips";
import { getRandomSuggestions } from "@/data/suggestions";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
import { RightSidebar } from "@/components/layout/RightSidebar";
import { TasksPanelContent } from "@/components/layout/TasksPanelContent";
import { ArtifactsPanelContent } from "@/components/layout/ArtifactsPanelContent";
import { ArtifactModal } from "@/components/artifacts/ArtifactModal";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export function SessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const {
    activePanel,
    closePanel,
    setTaskCount,
    setArtifactCount,
    setIsExtractingTasks: setMobileIsExtractingTasks,
    setSessionTitle,
  } = useMobileNavContext();
  const { updateSession } = useSessionContext();
  const { setBusySession } = useExecutionContext();

  // Session state
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [artifacts, setArtifacts] = useState<ArtifactSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Chat streaming state
  const [streamingContent, setStreamingContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isExtractingTasks, setIsExtractingTasks] = useState(false);

  // Execution state
  const [isExecuting, setIsExecuting] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);

  // Execution log display state
  const [isExecutionLogsExpanded, setIsExecutionLogsExpanded] = useState(false);
  const [isDebugMode, setIsDebugMode] = useState(false);

  // Artifact modal state
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);

  // Ref for chat input to auto-focus after response
  const chatInputRef = useRef<HTMLInputElement>(null);
  const [shouldFocusInput, setShouldFocusInput] = useState(false);

  // Effect to focus input after state updates complete
  useEffect(() => {
    if (shouldFocusInput && !isSending && !isSummarizing) {
      chatInputRef.current?.focus();
      setShouldFocusInput(false);
    }
  }, [shouldFocusInput, isSending, isSummarizing]);

  // Suggestions for pristine state (regenerated when session changes)
  // eslint-disable-next-line react-hooks/exhaustive-deps -- sessionId triggers regeneration intentionally
  const suggestions = useMemo(() => getRandomSuggestions(4), [sessionId]);

  // Sync mobile nav context with task/artifact counts
  useEffect(() => {
    setTaskCount(tasks.length);
  }, [tasks.length, setTaskCount]);

  useEffect(() => {
    setArtifactCount(artifacts.length);
  }, [artifacts.length, setArtifactCount]);

  useEffect(() => {
    setMobileIsExtractingTasks(isExtractingTasks);
  }, [isExtractingTasks, setMobileIsExtractingTasks]);

  useEffect(() => {
    setSessionTitle(session?.title || "New Session");
    // Also sync to SessionContext for sidebar
    if (session?.id && session?.title) {
      updateSession(session.id, { title: session.title });
    }
  }, [session?.id, session?.title, setSessionTitle, updateSession]);

  // Reference to tasks for execution event handler
  const tasksRef = useRef<Task[]>([]);
  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  // Ref to sessionId for use in SSE handlers
  const sessionIdRef = useRef<string | undefined>(sessionId);
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  // Ref to setBusySession for use in SSE handlers
  const setBusySessionRef = useRef(setBusySession);
  useEffect(() => {
    setBusySessionRef.current = setBusySession;
  }, [setBusySession]);

  // Function to refresh session title after chat completes
  const refreshSessionTitle = useCallback(async () => {
    const currentSessionId = sessionIdRef.current;
    if (!currentSessionId) return;
    try {
      const sessionData = await api.getSession(currentSessionId);
      setSession((prev) =>
        prev ? { ...prev, title: sessionData.title } : prev
      );
    } catch (error) {
      console.error("Failed to refresh session title:", error);
    }
  }, []);

  // Ref for refreshSessionTitle to use in SSE handlers
  const refreshSessionTitleRef = useRef(refreshSessionTitle);
  useEffect(() => {
    refreshSessionTitleRef.current = refreshSessionTitle;
  }, [refreshSessionTitle]);

  // Helper to convert ExecutionLog to ChatMessageItem
  const convertExecutionLogToMessage = useCallback(
    (log: ExecutionLog, taskList: Task[]): ChatMessageItem => {
      const taskTitle = log.taskId
        ? taskList.find((t) => t.id === log.taskId)?.title
        : undefined;
      return {
        role: "system" as const,
        content: "",
        executionEvent: {
          ...(log.eventData as ExecutionEvent),
          taskTitle,
        },
      };
    },
    []
  );

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
        case "tasks_extracting":
          setIsExtractingTasks(true);
          break;
        case "tasks_updated":
          setIsExtractingTasks(false);
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
          setIsExtractingTasks(false);
          // Clear global busy state
          setBusySessionRef.current(null);
          // Refresh session title (may have been updated on first message)
          refreshSessionTitleRef.current();
          // Auto-focus chat input after response completes
          setShouldFocusInput(true);
          break;
        }
        case "error":
          console.error("Chat error:", event.error);
          setStreamingContent("");
          setIsSending(false);
          setIsExtractingTasks(false);
          // Clear global busy state
          setBusySessionRef.current(null);
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

  // Summarize SSE handler - handles streaming summary after execution
  // Uses union type to handle both ChatEvent and artifact_created from ExecutionEvent
  const { connect: connectSummarize } = useSSE<ChatEvent | ExecutionEvent>({
    onMessage: useCallback((event: ChatEvent | ExecutionEvent) => {
      switch (event.type) {
        case "content":
          setStreamingContent((prev) => prev + (event as { type: "content"; content: string }).content);
          break;
        case "artifact_created": {
          // Add new artifact to the list
          const artifactEvent = event as ExecutionEvent & { type: "artifact_created" };
          const newArtifact: ArtifactSummary = {
            id: artifactEvent.artifactId,
            sessionId: sessionId || "",
            taskId: artifactEvent.taskId,
            name: artifactEvent.name,
            type: artifactEvent.artifactType as ArtifactType,
            createdAt: new Date().toISOString(),
          };
          setArtifacts((prev) => [...prev, newArtifact]);
          break;
        }
        case "done": {
          // Add the streamed summary to the messages list
          const finalContent = streamingContentRef.current;
          if (finalContent) {
            setMessages((prev) => [
              ...prev,
              { role: "assistant", content: finalContent },
            ]);
          }
          setStreamingContent("");
          setIsSummarizing(false);
          // Clear global busy state (execution + summarization complete)
          setBusySessionRef.current(null);
          // Auto-focus chat input after summarization completes
          setShouldFocusInput(true);
          break;
        }
        case "error":
          console.error("Summarize error:", (event as { type: "error"; error: string }).error);
          setStreamingContent("");
          setIsSummarizing(false);
          // Clear global busy state
          setBusySessionRef.current(null);
          break;
      }
    }, [sessionId]),
  });

  // Trigger summarize after execution completes
  const triggerSummarize = useCallback(() => {
    if (!sessionId) return;
    setIsSummarizing(true);
    setStreamingContent("");
    // Add a system message indicating summarization started
    setMessages((prev) => [
      ...prev,
      { role: "system" as const, content: "Generating execution summary..." },
    ]);
    const summarizeUrl = api.getSummarizeSSEUrl(sessionId);
    connectSummarize(summarizeUrl, {});
  }, [sessionId, connectSummarize]);

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
        case "artifact_created": {
          // Add new artifact to the list
          const newArtifact: ArtifactSummary = {
            id: event.artifactId,
            sessionId: sessionId || "",
            taskId: event.taskId,
            name: event.name,
            type: event.artifactType as ArtifactType,
            createdAt: new Date().toISOString(),
          };
          setArtifacts((prev) => [...prev, newArtifact]);
          break;
        }
        case "done":
          setIsExecuting(false);
          // Update session status
          setSession((prev) =>
            prev ? { ...prev, status: "completed" } : prev
          );
          // Trigger summarize after execution completes
          triggerSummarize();
          break;
        case "paused":
          setIsExecuting(false);
          // Update session status to paused
          setSession((prev) =>
            prev ? { ...prev, status: "paused" } : prev
          );
          // Clear global busy state
          setBusySessionRef.current(null);
          break;
        case "error":
          if (event.taskId) {
            // Task-specific error - update task status to failed
            setTasks((prev) =>
              prev.map((task) =>
                task.id === event.taskId
                  ? { ...task, status: "failed" as TaskStatus }
                  : task
              )
            );
          } else {
            // Global error - stop execution
            setIsExecuting(false);
            // Clear global busy state
            setBusySessionRef.current(null);
          }
          break;
      }
    }, [getTaskTitle, sessionId, triggerSummarize]),
  });

  const loadSession = useCallback(async () => {
    if (!sessionId) return;

    try {
      const sessionData = await api.getSession(sessionId);
      setSession(sessionData);
      setTasks(sessionData.tasks);
      setArtifacts(sessionData.artifacts);

      // Start with chat messages
      let allMessages: ChatMessageItem[] = [...sessionData.messages];

      // Load execution logs for executed or paused sessions
      if (
        sessionData.status === "completed" ||
        sessionData.status === "executing" ||
        sessionData.status === "paused"
      ) {
        try {
          const logsResponse = await api.getExecutionLogs(sessionId);
          if (logsResponse.logs.length > 0) {
            // Add "Starting task execution..." marker before execution logs
            allMessages.push({
              role: "system" as const,
              content: "Starting task execution...",
            });

            // Convert execution logs to messages (filter out streaming content tokens)
            const executionMessages = logsResponse.logs
              .filter((log) => log.eventType !== "content")
              .map((log) => convertExecutionLogToMessage(log, sessionData.tasks));
            allMessages = [...allMessages, ...executionMessages];

            // For completed sessions, check if summary exists in messages
            // (the summary message is already included in sessionData.messages from checkpoint)
          }
        } catch (logError) {
          console.error("Failed to load execution logs:", logError);
          // Continue without execution logs - they're not critical for basic functionality
        }
      }

      setMessages(allMessages);
    } catch (error) {
      console.error("Failed to load session:", error);
      navigate("/");
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, navigate, convertExecutionLogToMessage]);

  useEffect(() => {
    if (sessionId) {
      loadSession();
    }
  }, [sessionId, loadSession]);

  const handleSendMessage = async (message: string) => {
    if (!sessionId || isSending) return;

    // Set global busy state
    setBusySession(sessionId);

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

    // Set global busy state
    setBusySession(sessionId);

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

  const handleSelectArtifact = (artifactId: string) => {
    setSelectedArtifactId(artifactId);
    // Close mobile sheet when selecting an artifact
    closePanel();
  };

  const handleCloseArtifactModal = () => {
    setSelectedArtifactId(null);
  };

  // Count pending and in_progress tasks (resumable tasks)
  const pendingTaskCount = tasks.filter(
    (task) => task.status === "pending"
  ).length;
  const resumableTaskCount = tasks.filter(
    (task) => task.status === "pending" || task.status === "in_progress"
  ).length;

  // Determine if we can execute (has tasks to run and not already executing)
  // For paused sessions, we check resumableTaskCount (in_progress + pending)
  // For planning sessions, we check pendingTaskCount
  const canExecute =
    (session?.status === "paused" ? resumableTaskCount > 0 : pendingTaskCount > 0) &&
    !isExecuting &&
    !isSending &&
    session?.status !== "executing" &&
    session?.status !== "completed";

  // Is this a resume operation?
  const isResume = session?.status === "paused";

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingIndicator size="lg" text="Loading session..." />
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Chat Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Header - Hidden on mobile (MobileHeader handles it) */}
        <header className="hidden sm:flex items-center gap-4 p-4 border-b border-border bg-card">
          <div className="flex-1">
            <h1 className="text-lg font-semibold truncate">
              {session?.title || "New Session"}
            </h1>
            <p className="text-xs text-muted-foreground">{session?.status}</p>
          </div>
        </header>

        {/* Pristine mode: center the input when no messages */}
        {messages.length === 0 && !streamingContent ? (
          <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4">
            <div className="text-center mb-2">
              <h2 className="text-2xl font-semibold mb-2">What can I help you with?</h2>
              <p className="text-muted-foreground">
                Describe your goal or choose a suggestion below
              </p>
            </div>
            <ChatInput
              ref={chatInputRef}
              onSend={handleSendMessage}
              disabled={isSending || isExecuting || isSummarizing || session?.status === "completed"}
              placeholder="Describe your goal..."
              className="w-full max-w-2xl border-t-0 rounded-lg border border-border"
            />
            <SuggestionChips
              suggestions={suggestions}
              onSelect={handleSendMessage}
              disabled={isSending || isExecuting || isSummarizing || session?.status === "completed"}
            />
          </div>
        ) : (
          <div className="flex-1 relative min-h-0">
            {/* Messages - scrollable area with padding for fixed input */}
            <div className="absolute inset-0 overflow-y-auto pb-16">
              <ChatMessageList
                messages={messages}
                streamingContent={streamingContent}
                isExtractingTasks={isExtractingTasks}
                isExecutionLogsExpanded={isExecutionLogsExpanded}
                onToggleExecutionLogsExpanded={() => setIsExecutionLogsExpanded((prev) => !prev)}
                isDebugMode={isDebugMode}
                onToggleDebugMode={() => setIsDebugMode((prev) => !prev)}
              />
            </div>

            {/* Input - fixed at bottom */}
            <div className="absolute bottom-0 left-0 right-0">
              <ChatInput
                ref={chatInputRef}
                onSend={handleSendMessage}
                disabled={isSending || isExecuting || isSummarizing || session?.status === "completed"}
                placeholder={
                  session?.status === "completed"
                    ? "Session completed"
                    : isExecuting
                    ? "Execution in progress..."
                    : isSummarizing
                    ? "Generating summary..."
                    : "Ask a follow-up question..."
                }
              />
            </div>
          </div>
        )}
      </div>

      {/* Desktop Right Sidebar - Tasks & Artifacts (hidden on mobile) */}
      <RightSidebar
        tasks={tasks}
        artifacts={artifacts}
        onSelectArtifact={handleSelectArtifact}
        canExecute={canExecute}
        isExecuting={isExecuting}
        pendingTaskCount={isResume ? resumableTaskCount : pendingTaskCount}
        onExecute={handleExecute}
        showExecuteButton={session?.status !== "completed"}
        isExtractingTasks={isExtractingTasks}
        isResume={isResume}
      />

      {/* Mobile Tasks Sheet */}
      <Sheet
        open={activePanel === "tasks"}
        onOpenChange={(open) => !open && closePanel()}
      >
        <SheetContent side="right" className="w-[320px] p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Tasks</SheetTitle>
            <SheetDescription>View and manage session tasks</SheetDescription>
          </SheetHeader>
          <TasksPanelContent
            tasks={tasks}
            isExtractingTasks={isExtractingTasks}
            canExecute={canExecute}
            isExecuting={isExecuting}
            pendingTaskCount={isResume ? resumableTaskCount : pendingTaskCount}
            onExecute={handleExecute}
            showExecuteButton={session?.status !== "completed"}
            isResume={isResume}
          />
        </SheetContent>
      </Sheet>

      {/* Mobile Artifacts Sheet */}
      <Sheet
        open={activePanel === "artifacts"}
        onOpenChange={(open) => !open && closePanel()}
      >
        <SheetContent side="right" className="w-[320px] p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Artifacts</SheetTitle>
            <SheetDescription>View session artifacts</SheetDescription>
          </SheetHeader>
          <ArtifactsPanelContent
            artifacts={artifacts}
            onSelectArtifact={handleSelectArtifact}
          />
        </SheetContent>
      </Sheet>

      {/* Artifact Modal */}
      {selectedArtifactId && sessionId && (
        <ArtifactModal
          sessionId={sessionId}
          artifactId={selectedArtifactId}
          onClose={handleCloseArtifactModal}
        />
      )}
    </div>
  );
}
