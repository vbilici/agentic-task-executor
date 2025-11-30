import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Session } from "@/types/api";

interface SessionSidebarProps {
  sessions: Session[];
  currentSessionId?: string;
  isCollapsed: boolean;
  onToggle: () => void;
  onNewSession: () => void;
  onSelectSession: (sessionId: string) => void;
}

export function SessionSidebar({
  sessions,
  currentSessionId,
  isCollapsed,
  onToggle,
  onNewSession,
  onSelectSession,
}: SessionSidebarProps) {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border p-3">
        {!isCollapsed && (
          <span className="text-sm font-semibold text-foreground">Sessions</span>
        )}
        <button
          onClick={onToggle}
          className="rounded p-1 hover:bg-accent"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* New Session Button */}
      <div className="p-2">
        <button
          onClick={onNewSession}
          className={cn(
            "flex w-full items-center gap-2 rounded-md p-2 text-sm hover:bg-accent",
            isCollapsed && "justify-center"
          )}
        >
          <Plus className="h-4 w-4" />
          {!isCollapsed && <span>New Session</span>}
        </button>
      </div>

      {/* Session List */}
      <div className="flex-1 overflow-y-auto p-2">
        {sessions.map((session) => (
          <button
            key={session.id}
            onClick={() => onSelectSession(session.id)}
            className={cn(
              "flex w-full items-center gap-2 rounded-md p-2 text-sm transition-colors",
              session.id === currentSessionId
                ? "bg-accent text-accent-foreground"
                : "hover:bg-accent/50",
              isCollapsed && "justify-center"
            )}
          >
            <span
              className={cn(
                "h-2 w-2 rounded-full flex-shrink-0",
                session.id === currentSessionId ? "bg-primary" : "bg-muted-foreground/30"
              )}
            />
            {!isCollapsed && (
              <span className="truncate">{session.title || "New Session"}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
