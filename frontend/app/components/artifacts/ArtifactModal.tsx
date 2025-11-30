import { useEffect, useState } from "react";
import { X, Download, FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/services/api";
import type { Artifact, ArtifactType } from "@/types/api";
import { Button } from "@/components/ui/button";
import { ReactMarkdown, markdownProseClasses } from "@/lib/markdown";

interface ArtifactModalProps {
  sessionId: string;
  artifactId: string;
  onClose: () => void;
}

const typeColors: Record<ArtifactType, string> = {
  document: "bg-blue-100 text-blue-800",
  note: "bg-yellow-100 text-yellow-800",
  summary: "bg-green-100 text-green-800",
  plan: "bg-purple-100 text-purple-800",
  other: "bg-gray-100 text-gray-800",
};

export function ArtifactModal({ sessionId, artifactId, onClose }: ArtifactModalProps) {
  const [artifact, setArtifact] = useState<Artifact | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadArtifact() {
      try {
        setIsLoading(true);
        setError(null);
        const data = await api.getArtifact(sessionId, artifactId);
        setArtifact(data);
      } catch (err) {
        setError("Failed to load artifact");
        console.error("Error loading artifact:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadArtifact();
  }, [sessionId, artifactId]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handleDownload = () => {
    if (!artifact) return;
    const downloadUrl = api.getArtifactDownloadUrl(sessionId, artifactId);
    window.open(downloadUrl, "_blank");
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="relative flex h-[90vh] w-[90vw] max-w-4xl flex-col rounded-lg bg-background shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4">
          {isLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading...</span>
            </div>
          ) : artifact ? (
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold">{artifact.name}</h2>
              <span
                className={cn(
                  "rounded px-2 py-0.5 text-xs font-medium",
                  typeColors[artifact.type]
                )}
              >
                {artifact.type}
              </span>
            </div>
          ) : (
            <span>Artifact</span>
          )}

          <div className="flex items-center gap-2">
            {artifact && (
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex h-full items-center justify-center text-destructive">
              {error}
            </div>
          ) : artifact ? (
            <div className={markdownProseClasses}>
              <ReactMarkdown>{artifact.content}</ReactMarkdown>
            </div>
          ) : null}
        </div>

        {/* Footer with metadata */}
        {artifact && (
          <div className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
            Created: {new Date(artifact.createdAt).toLocaleString()}
            {artifact.taskId && <span className="ml-4">Task ID: {artifact.taskId}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
