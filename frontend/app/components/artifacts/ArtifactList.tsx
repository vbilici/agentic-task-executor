import { FileText } from "lucide-react";
import type { ArtifactSummary } from "@/types/api";
import { ArtifactListItem } from "./ArtifactListItem";

interface ArtifactListProps {
  artifacts: ArtifactSummary[];
  onSelectArtifact: (artifactId: string) => void;
}

export function ArtifactList({ artifacts, onSelectArtifact }: ArtifactListProps) {
  if (artifacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <FileText className="h-8 w-8 mb-2" />
        <p className="text-sm">No artifacts yet</p>
        <p className="text-xs mt-1">Artifacts created during execution will appear here</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {artifacts.map((artifact) => (
        <ArtifactListItem
          key={artifact.id}
          artifact={artifact}
          onClick={() => onSelectArtifact(artifact.id)}
        />
      ))}
    </div>
  );
}
