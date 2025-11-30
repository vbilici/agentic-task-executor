import type { Session } from "@/types/api";
import { SessionListItem } from "./SessionListItem";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SessionListProps {
  sessions: Session[];
  currentSessionId?: string;
  onSelect: (sessionId: string) => void;
  onDelete: (sessionId: string) => void;
}

export function SessionList({
  sessions,
  currentSessionId,
  onSelect,
  onDelete,
}: SessionListProps) {
  if (sessions.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        No sessions yet
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="space-y-1 p-2">
        {sessions.map((session) => (
          <SessionListItem
            key={session.id}
            session={session}
            isActive={session.id === currentSessionId}
            onSelect={() => onSelect(session.id)}
            onDelete={() => onDelete(session.id)}
          />
        ))}
      </div>
    </ScrollArea>
  );
}
