import { Outlet, useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSessionContext } from "@/contexts/SessionContext";
import { useSidebarState } from "@/hooks/useSidebarState";
import { SessionListItem } from "@/components/session/SessionListItem";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";

export function AppLayout() {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId?: string }>();
  const { sessions, isLoading, isCreating, createSession, deleteSession } =
    useSessionContext();
  const { isLeftCollapsed, toggleLeft } = useSidebarState();

  const handleSelectSession = (id: string) => {
    navigate(`/sessions/${id}`);
  };

  const handleDeleteSession = async (id: string) => {
    await deleteSession(id);
    // If we deleted the current session, navigate home
    if (id === sessionId) {
      navigate("/");
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left Sidebar - Sessions */}
      <aside
        className={cn(
          "h-screen sticky top-0 border-r border-border bg-card transition-all duration-200",
          isLeftCollapsed ? "w-14" : "w-64"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border p-3">
            {!isLeftCollapsed && (
              <div>
                <h1 className="text-lg font-bold">Libra</h1>
                <p className="text-xs text-muted-foreground">
                  Agent-Driven TODO Executor
                </p>
              </div>
            )}
            <button
              onClick={toggleLeft}
              className="rounded p-1 hover:bg-accent"
              aria-label={isLeftCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isLeftCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* New Session Button */}
          <div className="p-2">
            <Button
              onClick={createSession}
              disabled={isCreating}
              variant="outline"
              className={cn(
                "w-full justify-start gap-2",
                isLeftCollapsed && "justify-center px-2"
              )}
            >
              {isCreating ? (
                <LoadingIndicator size="sm" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {!isLeftCollapsed && <span>New Session</span>}
            </Button>
          </div>

          {/* Session List */}
          <div className="flex-1 overflow-y-auto p-2">
            <TooltipProvider delayDuration={300}>
              {isLoading ? (
                <div className="flex justify-center py-4">
                  <LoadingIndicator size="sm" />
                </div>
              ) : sessions.length === 0 ? (
                !isLeftCollapsed && (
                  <p className="text-center text-sm text-muted-foreground py-4">
                    No sessions yet
                  </p>
                )
              ) : (
                sessions.map((session) => (
                  <SessionListItem
                    key={session.id}
                    session={session}
                    isActive={session.id === sessionId}
                    isCollapsed={isLeftCollapsed}
                    onSelect={() => handleSelectSession(session.id)}
                    onDelete={() => handleDeleteSession(session.id)}
                  />
                ))
              )}
            </TooltipProvider>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
