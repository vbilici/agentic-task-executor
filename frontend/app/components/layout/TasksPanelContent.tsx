import { ListTodo, Loader2 } from "lucide-react";
import type { Task } from "@/types/api";
import { TaskItem } from "@/components/session/TaskItem";
import { ExecuteButton } from "@/components/session/ExecuteButton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface TasksPanelContentProps {
  tasks: Task[];
  isExtractingTasks?: boolean;
  // Execute button props
  canExecute: boolean;
  isExecuting: boolean;
  isPausing?: boolean;
  pendingTaskCount: number;
  onExecute: () => void;
  showExecuteButton: boolean;
  isResume?: boolean;
}

export function TasksPanelContent({
  tasks,
  isExtractingTasks = false,
  canExecute,
  isExecuting,
  isPausing = false,
  pendingTaskCount,
  onExecute,
  showExecuteButton,
  isResume = false,
}: TasksPanelContentProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border p-3">
        <div className="flex items-center gap-2">
          <ListTodo className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Tasks</span>
          <Badge variant="secondary" className="text-xs">
            {tasks.length}
          </Badge>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-3">
          {isExtractingTasks ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-8 w-8 mb-2 animate-spin" />
              <p className="text-sm font-medium">Generating tasks...</p>
              <p className="text-xs mt-1">Analyzing your goal</p>
            </div>
          ) : tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <ListTodo className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-xs">No tasks yet</p>
              <p className="text-xs mt-1">Describe your goal to generate tasks</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => (
                <TaskItem key={task.id} task={task} isPaused={isResume} />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Execute Button */}
      {showExecuteButton && tasks.length > 0 && (
        <div className="p-3 border-t border-border">
          <ExecuteButton
            onClick={onExecute}
            disabled={!canExecute}
            isExecuting={isExecuting}
            isPausing={isPausing}
            pendingTaskCount={pendingTaskCount}
            isResume={isResume}
          />
        </div>
      )}
    </div>
  );
}
