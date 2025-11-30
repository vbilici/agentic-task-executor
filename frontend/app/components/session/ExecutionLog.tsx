import { useEffect, useRef } from "react";
import type { ExecutionEvent, Task } from "@/types/api";
import { ExecutionLogEntry } from "./ExecutionLogEntry";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity } from "lucide-react";

export interface ExecutionLogItem {
  id: string;
  event: ExecutionEvent;
  timestamp: Date;
}

interface ExecutionLogProps {
  entries: ExecutionLogItem[];
  tasks: Task[];
  isExecuting?: boolean;
}

export function ExecutionLog({
  entries,
  tasks,
  isExecuting = false,
}: ExecutionLogProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new entries are added
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [entries.length]);

  // Create a map of task IDs to titles for display
  const taskTitleMap = new Map(tasks.map((task) => [task.id, task.title]));

  const getTaskTitle = (event: ExecutionEvent): string | undefined => {
    if ("taskId" in event && event.taskId) {
      return taskTitleMap.get(event.taskId);
    }
    return undefined;
  };

  if (entries.length === 0 && !isExecuting) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Activity className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-sm">No execution activity yet</p>
        <p className="text-xs mt-1">Click Execute to start running tasks</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="text-sm font-semibold">Execution Log</h2>
        {isExecuting && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            Running
          </span>
        )}
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {entries.map((entry) => (
            <ExecutionLogEntry
              key={entry.id}
              event={entry.event}
              timestamp={entry.timestamp}
              taskTitle={getTaskTitle(entry.event)}
            />
          ))}
          {isExecuting && entries.length === 0 && (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <span className="text-sm">Waiting for execution events...</span>
            </div>
          )}
          {/* Scroll anchor for auto-scrolling */}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
    </div>
  );
}
