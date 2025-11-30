import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Task, TaskStatus } from "@/types/api";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  CheckCircle2,
  Circle,
  Loader2,
  XCircle,
  ChevronDown,
  ChevronRight,
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

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

export function TaskItem({ task }: TaskItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const config = statusConfig[task.status];
  const Icon = config.icon;

  const hasExpandableContent =
    (task.result && task.result.length > 150) ||
    (task.reflection && task.reflection.length > 100);

  const showResult = task.status === "done" && task.result;
  const showError = task.status === "failed" && task.result;

  return (
    <Card className={cn("p-3", config.cardClassName)}>
      <div className="flex items-start gap-3">
        <Icon
          className={cn(
            "h-5 w-5 mt-0.5 flex-shrink-0",
            config.iconColor,
            task.status === "in_progress" && "animate-spin"
          )}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              #{task.order + 1}
            </span>
            <Badge variant={config.badgeVariant} className={cn("text-xs", config.badgeClassName)}>
              {config.label}
            </Badge>
          </div>
          <p className="text-sm font-medium mt-1">{task.title}</p>
          {task.description && (
            <p className="text-xs text-muted-foreground mt-1">
              {task.description}
            </p>
          )}

          {/* Result/Error display with optional expansion */}
          {(showResult || showError) && (
            <>
              {hasExpandableContent ? (
                <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
                  <div
                    className={cn(
                      "mt-2 p-2 rounded text-xs",
                      showResult && "bg-green-50 dark:bg-green-950/50",
                      showError && "bg-red-50 dark:bg-red-950/50"
                    )}
                  >
                    <CollapsibleTrigger className="flex items-center gap-1 w-full text-left hover:underline">
                      {isExpanded ? (
                        <ChevronDown className="h-3 w-3 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="h-3 w-3 flex-shrink-0" />
                      )}
                      <span
                        className={cn(
                          "font-medium",
                          showResult && "text-green-700 dark:text-green-300",
                          showError && "text-red-700 dark:text-red-300"
                        )}
                      >
                        {showResult ? "Result" : "Error"}
                      </span>
                      {!isExpanded && (
                        <span
                          className={cn(
                            "truncate ml-1",
                            showResult && "text-green-600 dark:text-green-400",
                            showError && "text-red-600 dark:text-red-400"
                          )}
                        >
                          - {truncateText(task.result || "", 80)}
                        </span>
                      )}
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-1">
                      <p
                        className={cn(
                          "whitespace-pre-wrap break-words",
                          showResult && "text-green-600 dark:text-green-400",
                          showError && "text-red-600 dark:text-red-400"
                        )}
                      >
                        {task.result}
                      </p>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ) : (
                <p
                  className={cn(
                    "text-xs mt-2 p-2 rounded",
                    showResult && "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/50",
                    showError && "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50"
                  )}
                >
                  {task.result}
                </p>
              )}
            </>
          )}

          {/* Reflection display */}
          {task.reflection && (
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 italic">
              {hasExpandableContent && !isExpanded
                ? truncateText(task.reflection, 100)
                : task.reflection}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
