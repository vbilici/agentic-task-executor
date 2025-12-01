import { useParams, useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSessionContext } from "@/contexts/SessionContext";
import { SessionListItem } from "@/components/session/SessionListItem";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";

interface SessionListContentProps {
  isCollapsed?: boolean;
  onSessionSelect?: () => void; // Called after selecting a session (for mobile auto-close)
}

export function SessionListContent({
  isCollapsed = false,
  onSessionSelect,
}: SessionListContentProps) {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId?: string }>();
  const { sessions, isLoading, isCreating, createSession, deleteSession } =
    useSessionContext();

  const handleSelectSession = (id: string) => {
    navigate(`/sessions/${id}`);
    onSessionSelect?.();
  };

  const handleCreateSession = async () => {
    await createSession();
    onSessionSelect?.();
  };

  const handleDeleteSession = async (id: string) => {
    await deleteSession(id);
    // If we deleted the current session, navigate home
    if (id === sessionId) {
      navigate("/");
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* New Session Button */}
      <div className="p-2">
        <Button
          onClick={handleCreateSession}
          disabled={isCreating}
          variant="outline"
          className={cn(
            "w-full justify-start gap-2",
            isCollapsed && "justify-center px-2"
          )}
        >
          {isCreating ? (
            <LoadingIndicator size="sm" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          {!isCollapsed && <span>New Session</span>}
        </Button>
      </div>

      {/* Session List */}
      <div className="flex-1 min-h-0 overflow-y-auto p-2">
        <TooltipProvider delayDuration={300}>
          {isLoading ? (
            <div className="flex justify-center py-4">
              <LoadingIndicator size="sm" />
            </div>
          ) : sessions.length === 0 ? (
            !isCollapsed && (
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
                isCollapsed={isCollapsed}
                onSelect={() => handleSelectSession(session.id)}
                onDelete={() => handleDeleteSession(session.id)}
              />
            ))
          )}
        </TooltipProvider>
      </div>
    </div>
  );
}
