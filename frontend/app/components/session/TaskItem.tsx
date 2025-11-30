import { cn } from "@/lib/utils";
import type { Task, TaskStatus } from "@/types/api";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  CheckCircle2,
  Circle,
  Loader2,
  XCircle,
} from "lucide-react";

interface TaskItemProps {
  task: Task;
}

const statusConfig: Record<
  TaskStatus,
  { icon: typeof Circle; color: string; label: string }
> = {
  pending: {
    icon: Circle,
    color: "text-muted-foreground",
    label: "Pending",
  },
  in_progress: {
    icon: Loader2,
    color: "text-blue-500",
    label: "In Progress",
  },
  done: {
    icon: CheckCircle2,
    color: "text-green-500",
    label: "Done",
  },
  failed: {
    icon: XCircle,
    color: "text-destructive",
    label: "Failed",
  },
};

export function TaskItem({ task }: TaskItemProps) {
  const config = statusConfig[task.status];
  const Icon = config.icon;

  return (
    <Card className="p-3">
      <div className="flex items-start gap-3">
        <Icon
          className={cn(
            "h-5 w-5 mt-0.5 flex-shrink-0",
            config.color,
            task.status === "in_progress" && "animate-spin"
          )}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              #{task.order + 1}
            </span>
            <Badge variant="outline" className="text-xs">
              {config.label}
            </Badge>
          </div>
          <p className="text-sm font-medium mt-1">{task.title}</p>
          {task.description && (
            <p className="text-xs text-muted-foreground mt-1">
              {task.description}
            </p>
          )}
          {task.result && (
            <p className="text-xs text-green-600 mt-2 bg-green-50 p-2 rounded">
              {task.result}
            </p>
          )}
          {task.reflection && (
            <p className="text-xs text-blue-600 mt-1 italic">
              {task.reflection}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
