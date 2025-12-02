import { useState, useEffect } from "react";
import { ListTodo, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task, ArtifactSummary } from "@/types/api";
import { TasksPanelContent } from "./TasksPanelContent";
import { ArtifactsPanelContent } from "./ArtifactsPanelContent";
import { Badge } from "@/components/ui/badge";

type TabType = "tasks" | "artifacts" | null;

interface RightSidebarProps {
  tasks: Task[];
  artifacts: ArtifactSummary[];
  onSelectArtifact: (artifactId: string) => void;
  // Execute button props
  canExecute: boolean;
  isExecuting: boolean;
  isPausing?: boolean;
  pendingTaskCount: number;
  onExecute: () => void;
  showExecuteButton: boolean;
  // Task extraction indicator
  isExtractingTasks?: boolean;
  // Optional: control which tab is initially open
  defaultTab?: TabType;
  // Resume mode (paused session)
  isResume?: boolean;
}

export function RightSidebar({
  tasks,
  artifacts,
  onSelectArtifact,
  canExecute,
  isExecuting,
  isPausing = false,
  pendingTaskCount,
  onExecute,
  showExecuteButton,
  isExtractingTasks = false,
  defaultTab = null,
  isResume = false,
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
    // Hidden on mobile (sm:flex), visible on desktop
    <div className="hidden sm:flex h-full border-l border-border">
      {/* Content Panel */}
      {activeTab && (
        <div className="w-72 h-full flex flex-col bg-card">
          {activeTab === "tasks" ? (
            <TasksPanelContent
              tasks={tasks}
              isExtractingTasks={isExtractingTasks}
              canExecute={canExecute}
              isExecuting={isExecuting}
              isPausing={isPausing}
              pendingTaskCount={pendingTaskCount}
              onExecute={onExecute}
              showExecuteButton={showExecuteButton}
              isResume={isResume}
            />
          ) : (
            <ArtifactsPanelContent
              artifacts={artifacts}
              onSelectArtifact={onSelectArtifact}
            />
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
            <ListTodo className="h-5 w-5" />
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
