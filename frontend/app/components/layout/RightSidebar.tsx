import { useState, useEffect } from "react";
import { ListTodo, FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task, ArtifactSummary } from "@/types/api";
import { TaskItem } from "@/components/session/TaskItem";
import { ExecuteButton } from "@/components/session/ExecuteButton";
import { ArtifactList } from "@/components/artifacts/ArtifactList";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

type TabType = "tasks" | "artifacts" | null;

interface RightSidebarProps {
  tasks: Task[];
  artifacts: ArtifactSummary[];
  onSelectArtifact: (artifactId: string) => void;
  // Execute button props
  canExecute: boolean;
  isExecuting: boolean;
  pendingTaskCount: number;
  onExecute: () => void;
  showExecuteButton: boolean;
  // Task extraction indicator
  isExtractingTasks?: boolean;
  // Optional: control which tab is initially open
  defaultTab?: TabType;
}

export function RightSidebar({
  tasks,
  artifacts,
  onSelectArtifact,
  canExecute,
  isExecuting,
  pendingTaskCount,
  onExecute,
  showExecuteButton,
  isExtractingTasks = false,
  defaultTab = null,
}: RightSidebarProps) {
  const [activeTab, setActiveTab] = useState<TabType>(defaultTab);

  const handleTabClick = (tab: TabType) => {
    // Toggle: if already active, close it; otherwise open it
    setActiveTab(activeTab === tab ? null : tab);
  };

  // Auto-open tasks tab when tasks are updated or extraction starts
  useEffect(() => {
    if (isExtractingTasks || tasks.length > 0) {
      setActiveTab("tasks");
    }
  }, [isExtractingTasks, tasks.length]);

  const hasTasks = tasks.length > 0;
  const hasArtifacts = artifacts.length > 0;
  const hasContent = hasTasks || hasArtifacts || isExtractingTasks;

  // Don't render anything if there's no content
  if (!hasContent) {
    return null;
  }

  return (
    <div className="flex h-screen sticky top-0 border-l border-border">
      {/* Content Panel */}
      {activeTab && (
        <div className="w-72 flex flex-col bg-card">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border p-3">
            <div className="flex items-center gap-2">
              {activeTab === "tasks" ? (
                <ListTodo className="h-4 w-4 text-muted-foreground" />
              ) : (
                <FileText className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-sm font-semibold">
                {activeTab === "tasks" ? "Tasks" : "Artifacts"}
              </span>
              <Badge variant="secondary" className="text-xs">
                {activeTab === "tasks" ? tasks.length : artifacts.length}
              </Badge>
            </div>
          </div>

          {/* Content */}
          <ScrollArea className="flex-1">
            {activeTab === "tasks" && (
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
                      <TaskItem key={task.id} task={task} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "artifacts" && (
              <div className="p-3">
                {artifacts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <FileText className="h-8 w-8 mb-2 opacity-50" />
                    <p className="text-xs">No artifacts yet</p>
                  </div>
                ) : (
                  <ArtifactList
                    artifacts={artifacts}
                    onSelectArtifact={onSelectArtifact}
                  />
                )}
              </div>
            )}
          </ScrollArea>

          {/* Execute Button (only in tasks tab) */}
          {activeTab === "tasks" && showExecuteButton && tasks.length > 0 && (
            <div className="p-3 border-t border-border">
              <ExecuteButton
                onClick={onExecute}
                disabled={!canExecute}
                isExecuting={isExecuting}
                pendingTaskCount={pendingTaskCount}
              />
            </div>
          )}
        </div>
      )}

      {/* Icon Strip - Always visible */}
      <div className="w-12 flex flex-col items-center bg-card py-3 gap-1">
        {/* Tasks Icon */}
        {(hasTasks || isExtractingTasks) && (
          <button
            onClick={() => handleTabClick("tasks")}
            className={cn(
              "flex flex-col items-center gap-1 rounded p-2 transition-colors",
              activeTab === "tasks"
                ? "bg-accent text-accent-foreground"
                : "hover:bg-accent/50 text-muted-foreground"
            )}
            aria-label="Toggle tasks panel"
          >
            {isExtractingTasks ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <ListTodo className="h-5 w-5" />
            )}
            <Badge
              variant={activeTab === "tasks" ? "default" : "secondary"}
              className="text-xs px-1.5"
            >
              {isExtractingTasks && tasks.length === 0 ? "..." : tasks.length}
            </Badge>
          </button>
        )}

        {/* Artifacts Icon */}
        {hasArtifacts && (
          <button
            onClick={() => handleTabClick("artifacts")}
            className={cn(
              "flex flex-col items-center gap-1 rounded p-2 transition-colors",
              activeTab === "artifacts"
                ? "bg-accent text-accent-foreground"
                : "hover:bg-accent/50 text-muted-foreground"
            )}
            aria-label="Toggle artifacts panel"
          >
            <FileText className="h-5 w-5" />
            <Badge
              variant={activeTab === "artifacts" ? "default" : "secondary"}
              className="text-xs px-1.5"
            >
              {artifacts.length}
            </Badge>
          </button>
        )}
      </div>
    </div>
  );
}
