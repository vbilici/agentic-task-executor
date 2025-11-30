import { FileText, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ArtifactSummary, ArtifactType } from "@/types/api";

interface ArtifactSidebarProps {
  artifacts: ArtifactSummary[];
  isCollapsed: boolean;
  onToggle: () => void;
  onSelectArtifact: (artifactId: string) => void;
}

const typeColors: Record<ArtifactType, string> = {
  document: "bg-blue-100 text-blue-800",
  note: "bg-yellow-100 text-yellow-800",
  summary: "bg-green-100 text-green-800",
  plan: "bg-purple-100 text-purple-800",
  other: "bg-gray-100 text-gray-800",
};

export function ArtifactSidebar({
  artifacts,
  isCollapsed,
  onToggle,
  onSelectArtifact,
}: ArtifactSidebarProps) {
  if (isCollapsed) {
    return null;
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border p-3">
        <span className="text-sm font-semibold text-foreground">Artifacts</span>
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
        {artifacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <FileText className="h-8 w-8 mb-2" />
            <p className="text-sm">No artifacts yet</p>
          </div>
        ) : (
          artifacts.map((artifact) => (
            <button
              key={artifact.id}
              onClick={() => onSelectArtifact(artifact.id)}
              className="flex w-full flex-col gap-1 rounded-md p-3 text-left hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium truncate flex-1">
                  {artifact.name}
                </span>
              </div>
              <span
                className={cn(
                  "inline-flex self-start rounded px-1.5 py-0.5 text-xs font-medium",
                  typeColors[artifact.type]
                )}
              >
                {artifact.type}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
