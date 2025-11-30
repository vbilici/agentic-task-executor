import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { api } from "@/services/api";
import type { Session } from "@/types/api";
import { Button } from "@/components/ui/button";
import { SessionList } from "@/components/session/SessionList";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function HomePage() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const response = await api.listSessions({ limit: 50 });
      setSessions(response.sessions);
    } catch (error) {
      console.error("Failed to load sessions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewSession = async () => {
    setIsCreating(true);
    try {
      const session = await api.createSession();
      navigate(`/sessions/${session.id}`);
    } catch (error) {
      console.error("Failed to create session:", error);
      setIsCreating(false);
    }
  };

  const handleSelectSession = (sessionId: string) => {
    navigate(`/sessions/${sessionId}`);
  };

  const handleDeleteSession = async () => {
    if (!deleteSessionId) return;

    try {
      await api.deleteSession(deleteSessionId);
      setSessions((prev) => prev.filter((s) => s.id !== deleteSessionId));
    } catch (error) {
      console.error("Failed to delete session:", error);
    } finally {
      setDeleteSessionId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingIndicator size="lg" text="Loading sessions..." />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card">
        <div className="p-4 border-b border-border">
          <h1 className="text-lg font-bold">Libra</h1>
          <p className="text-xs text-muted-foreground">Agent-Driven TODO Executor</p>
        </div>
        <div className="p-2">
          <Button
            onClick={handleNewSession}
            disabled={isCreating}
            className="w-full justify-start gap-2"
            variant="outline"
          >
            {isCreating ? (
              <LoadingIndicator size="sm" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            New Session
          </Button>
        </div>
        <SessionList
          sessions={sessions}
          onSelect={handleSelectSession}
          onDelete={(id) => setDeleteSessionId(id)}
        />
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="text-center max-w-md">
          <h2 className="text-3xl font-bold mb-4">Welcome to Libra</h2>
          <p className="text-muted-foreground mb-6">
            Describe your goal, and I'll help you break it down into actionable tasks
            that can be executed automatically.
          </p>
          <Button onClick={handleNewSession} disabled={isCreating} size="lg">
            {isCreating ? (
              <LoadingIndicator size="sm" text="Creating..." />
            ) : (
              <>
                <Plus className="h-5 w-5 mr-2" />
                Start New Session
              </>
            )}
          </Button>
        </div>
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteSessionId} onOpenChange={() => setDeleteSessionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Session?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the session and all its tasks, messages, and artifacts.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSession} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
