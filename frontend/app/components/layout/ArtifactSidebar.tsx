import { X, ChevronRight, FileText } from "lucide-react";
import type { ArtifactSummary } from "@/types/api";
import { ArtifactList } from "@/components/artifacts/ArtifactList";
import { Badge } from "@/components/ui/badge";

interface ArtifactSidebarProps {
  artifacts: ArtifactSummary[];
  isCollapsed: boolean;
  onToggle: () => void;
  onSelectArtifact: (artifactId: string) => void;
}

export function ArtifactSidebar({
  artifacts,
  isCollapsed,
  onToggle,
  onSelectArtifact,
}: ArtifactSidebarProps) {
  // Collapsed state - show just an expand button with artifact count
  if (isCollapsed) {
    return (
      <div className="flex h-full flex-col items-center border-l border-border bg-card py-3">
        <button
          onClick={onToggle}
          className="flex flex-col items-center gap-2 rounded p-2 hover:bg-accent"
          aria-label="Open artifacts sidebar"
        >
          <ChevronRight className="h-4 w-4" />
          <FileText className="h-5 w-5 text-muted-foreground" />
          {artifacts.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {artifacts.length}
            </Badge>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border p-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">Artifacts</span>
          {artifacts.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {artifacts.length}
            </Badge>
          )}
        </div>
        <button
          onClick={onToggle}
          className="rounded p-1 hover:bg-accent"
          aria-label="Close sidebar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Artifact List */}
      <div className="flex-1 overflow-y-auto p-2">
        <ArtifactList artifacts={artifacts} onSelectArtifact={onSelectArtifact} />
      </div>
    </div>
  );
}
