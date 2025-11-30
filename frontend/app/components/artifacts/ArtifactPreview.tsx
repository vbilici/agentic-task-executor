import { cn } from "@/lib/utils";
import type { ArtifactType } from "@/types/api";

interface ArtifactPreviewProps {
  content: string;
  type: ArtifactType;
  maxLines?: number;
}

export function ArtifactPreview({ content, maxLines = 3 }: ArtifactPreviewProps) {
  // Truncate content to show a preview
  const lines = content.split("\n").slice(0, maxLines);
  const truncatedContent = lines.join("\n");
  const isTruncated = content.split("\n").length > maxLines || content.length > 200;

  // Simple text preview - strip markdown formatting for preview
  const previewText = truncatedContent
    .replace(/#{1,6}\s/g, "") // Remove headers
    .replace(/\*\*(.+?)\*\*/g, "$1") // Remove bold
    .replace(/\*(.+?)\*/g, "$1") // Remove italic
    .replace(/`(.+?)`/g, "$1") // Remove inline code
    .replace(/\[(.+?)\]\(.+?\)/g, "$1") // Remove links
    .replace(/^\s*[-*]\s/gm, "") // Remove list markers
    .substring(0, 200);

  return (
    <div className={cn("text-xs text-muted-foreground leading-relaxed")}>
      <p className="line-clamp-3 whitespace-pre-wrap">{previewText}</p>
      {isTruncated && (
        <span className="text-primary/60 ml-1">...</span>
      )}
    </div>
  );
}
