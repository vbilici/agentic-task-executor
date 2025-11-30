import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Task, TaskStatus } from "@/types/api";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CheckCircle2,
  Circle,
  Loader2,
  XCircle,
} from "lucide-react";

interface TaskItemProps {
  task: Task;
}

interface StatusConfig {
  icon: typeof Circle;
  iconColor: string;
  badgeVariant: "outline" | "default" | "secondary" | "destructive";
  badgeClassName?: string;
  cardClassName?: string;
  label: string;
}

const statusConfig: Record<TaskStatus, StatusConfig> = {
  pending: {
    icon: Circle,
    iconColor: "text-muted-foreground",
    badgeVariant: "outline",
    label: "Pending",
  },
  in_progress: {
    icon: Loader2,
    iconColor: "text-blue-500",
    badgeVariant: "secondary",
    badgeClassName: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    cardClassName: "border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30",
    label: "In Progress",
  },
  done: {
    icon: CheckCircle2,
    iconColor: "text-green-500",
    badgeVariant: "secondary",
    badgeClassName: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    cardClassName: "border-green-200 dark:border-green-800",
    label: "Done",
  },
  failed: {
    icon: XCircle,
    iconColor: "text-destructive",
    badgeVariant: "destructive",
    cardClassName: "border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/30",
    label: "Failed",
  },
};

export function TaskItem({ task }: TaskItemProps) {
  const [open, setOpen] = useState(false);
  const config = statusConfig[task.status];
  const Icon = config.icon;

  const showResult = task.status === "done" && task.result;
  const showError = task.status === "failed" && task.result;

  return (
    <>
      <Card
        className={cn(
          "p-3 cursor-pointer transition-colors hover:bg-accent/50",
          config.cardClassName
        )}
        onClick={() => setOpen(true)}
      >
        <div className="flex items-start gap-3">
          <Icon
            className={cn(
              "h-5 w-5 mt-0.5 flex-shrink-0",
              config.iconColor,
              task.status === "in_progress" && "animate-spin"
            )}
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{task.title}</p>
            {task.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {task.description}
              </p>
            )}
          </div>
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Icon
                className={cn(
                  "h-5 w-5 flex-shrink-0",
                  config.iconColor,
                  task.status === "in_progress" && "animate-spin"
                )}
              />
              <span className="text-muted-foreground font-normal">#{task.order + 1}</span>
              {task.title}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Task details for {task.title}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Status Badge */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Status:</span>
              <Badge variant={config.badgeVariant} className={cn("text-xs", config.badgeClassName)}>
                {config.label}
              </Badge>
            </div>

            {/* Description */}
            {task.description && (
              <div>
                <p className="text-sm font-medium mb-1">Description</p>
                <p className="text-sm text-muted-foreground">{task.description}</p>
              </div>
            )}

            {/* Result/Error */}
            {(showResult || showError) && (
              <div
                className={cn(
                  "p-3 rounded-md",
                  showResult && "bg-green-50 dark:bg-green-950/50",
                  showError && "bg-red-50 dark:bg-red-950/50"
                )}
              >
                <p
                  className={cn(
                    "text-sm font-medium mb-1",
                    showResult && "text-green-700 dark:text-green-300",
                    showError && "text-red-700 dark:text-red-300"
                  )}
                >
                  {showResult ? "Result" : "Error"}
                </p>
                <p
                  className={cn(
                    "text-sm whitespace-pre-wrap break-words",
                    showResult && "text-green-600 dark:text-green-400",
                    showError && "text-red-600 dark:text-red-400"
                  )}
                >
                  {task.result}
                </p>
              </div>
            )}

            {/* Reflection */}
            {task.reflection && (
              <div className="p-3 rounded-md bg-blue-50 dark:bg-blue-950/50">
                <p className="text-sm font-medium mb-1 text-blue-700 dark:text-blue-300">
                  Reflection
                </p>
                <p className="text-sm text-blue-600 dark:text-blue-400 italic">
                  {task.reflection}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
