import { FileText } from "lucide-react";
import type { ArtifactSummary } from "@/types/api";
import { ArtifactList } from "@/components/artifacts/ArtifactList";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface ArtifactsPanelContentProps {
  artifacts: ArtifactSummary[];
  onSelectArtifact: (artifactId: string) => void;
}

export function ArtifactsPanelContent({
  artifacts,
  onSelectArtifact,
}: ArtifactsPanelContentProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border p-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Artifacts</span>
          <Badge variant="secondary" className="text-xs">
            {artifacts.length}
          </Badge>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
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
      </ScrollArea>
    </div>
  );
}
