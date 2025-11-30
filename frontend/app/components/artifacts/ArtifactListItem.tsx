import { FileText, FileCode, StickyNote, ClipboardList, File } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ArtifactSummary, ArtifactType } from "@/types/api";

interface ArtifactListItemProps {
  artifact: ArtifactSummary;
  onClick: () => void;
}

const typeConfig: Record<ArtifactType, { icon: typeof FileText; color: string; bgColor: string }> = {
  document: {
    icon: FileText,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
  },
  note: {
    icon: StickyNote,
    color: "text-yellow-600",
    bgColor: "bg-yellow-100",
  },
  summary: {
    icon: FileCode,
    color: "text-green-600",
    bgColor: "bg-green-100",
  },
  plan: {
    icon: ClipboardList,
    color: "text-purple-600",
    bgColor: "bg-purple-100",
  },
  other: {
    icon: File,
    color: "text-gray-600",
    bgColor: "bg-gray-100",
  },
};

export function ArtifactListItem({ artifact, onClick }: ArtifactListItemProps) {
  const config = typeConfig[artifact.type] || typeConfig.other;
  const Icon = config.icon;

  return (
    <button
      onClick={onClick}
      className="flex w-full items-start gap-3 rounded-lg p-3 text-left transition-colors hover:bg-accent/50"
    >
      <div className={cn("rounded-md p-2", config.bgColor)}>
        <Icon className={cn("h-4 w-4", config.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{artifact.name}</p>
        <div className="flex items-center gap-2 mt-1">
          <span
            className={cn(
              "inline-flex rounded px-1.5 py-0.5 text-xs font-medium",
              config.bgColor,
              config.color
            )}
          >
            {artifact.type}
          </span>
          <span className="text-xs text-muted-foreground">
            {new Date(artifact.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </div>
    </button>
  );
}
