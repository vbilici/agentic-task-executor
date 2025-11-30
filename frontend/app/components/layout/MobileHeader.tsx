import { Menu, ListTodo, FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useMobileNavContext } from "@/contexts/MobileNavContext";

export function MobileHeader() {
  const {
    openPanel,
    activePanel,
    taskCount,
    artifactCount,
    isExtractingTasks,
  } = useMobileNavContext();

  const hasTasks = taskCount > 0 || isExtractingTasks;
  const hasArtifacts = artifactCount > 0;

  return (
    <header className="sm:hidden fixed top-0 left-0 right-0 h-14 z-40 flex items-center justify-between px-3 border-b border-border bg-card">
      {/* Left: Hamburger Menu */}
      <button
        onClick={() => openPanel("sessions")}
        className={cn(
          "flex items-center justify-center h-10 w-10 rounded-md transition-colors",
          activePanel === "sessions"
            ? "bg-accent text-accent-foreground"
            : "hover:bg-accent/50 text-foreground"
        )}
        aria-label="Open sessions menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Center: App Title */}
      <div className="flex-1 text-center">
        <h1 className="text-lg font-bold">Libra</h1>
      </div>

      {/* Right: Tasks & Artifacts Icons */}
      <div className="flex items-center gap-1">
        {/* Tasks Icon */}
        {hasTasks && (
          <button
            onClick={() => openPanel("tasks")}
            className={cn(
              "relative flex items-center justify-center h-10 w-10 rounded-md transition-colors",
              activePanel === "tasks"
                ? "bg-accent text-accent-foreground"
                : "hover:bg-accent/50 text-muted-foreground"
            )}
            aria-label="Open tasks panel"
          >
            {isExtractingTasks ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <ListTodo className="h-5 w-5" />
            )}
            <Badge
              variant={activePanel === "tasks" ? "default" : "secondary"}
              className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-xs"
            >
              {isExtractingTasks && taskCount === 0 ? "..." : taskCount}
            </Badge>
          </button>
        )}

        {/* Artifacts Icon */}
        {hasArtifacts && (
          <button
            onClick={() => openPanel("artifacts")}
            className={cn(
              "relative flex items-center justify-center h-10 w-10 rounded-md transition-colors",
              activePanel === "artifacts"
                ? "bg-accent text-accent-foreground"
                : "hover:bg-accent/50 text-muted-foreground"
            )}
            aria-label="Open artifacts panel"
          >
            <FileText className="h-5 w-5" />
            <Badge
              variant={activePanel === "artifacts" ? "default" : "secondary"}
              className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-xs"
            >
              {artifactCount}
            </Badge>
          </button>
        )}
      </div>
    </header>
  );
}
