import { useState } from "react";
import { ChevronDown, ChevronRight, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface ToolCallDisplayProps {
  tool: string;
  input: Record<string, unknown>;
  output?: string;
}

function formatToolName(name: string): string {
  // Convert snake_case or camelCase to Title Case
  return name
    .replace(/_/g, " ")
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

function formatJson(obj: Record<string, unknown>): string {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}

export function ToolCallDisplay({ tool, input, output }: ToolCallDisplayProps) {
  const [isOpen, setIsOpen] = useState(false);

  const inputPreview = Object.entries(input)
    .slice(0, 2)
    .map(([key, value]) => {
      const strValue = typeof value === "string" ? value : JSON.stringify(value);
      const truncatedValue =
        strValue.length > 50 ? `${strValue.slice(0, 50)}...` : strValue;
      return `${key}: ${truncatedValue}`;
    })
    .join(", ");

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full text-left hover:bg-muted/50 rounded p-1 -m-1 transition-colors">
        {isOpen ? (
          <ChevronDown className="h-3 w-3 flex-shrink-0" />
        ) : (
          <ChevronRight className="h-3 w-3 flex-shrink-0" />
        )}
        <Wrench className="h-3 w-3 flex-shrink-0" />
        <span className="text-sm font-medium">{formatToolName(tool)}</span>
        {!isOpen && inputPreview && (
          <span className="text-xs text-muted-foreground truncate">
            ({inputPreview})
          </span>
        )}
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-2 space-y-2">
        <div>
          <p className="text-xs text-muted-foreground mb-1 font-medium">
            Input:
          </p>
          <pre
            className={cn(
              "text-xs bg-muted/50 p-2 rounded overflow-x-auto",
              "max-h-48 overflow-y-auto"
            )}
          >
            {formatJson(input)}
          </pre>
        </div>

        {output && (
          <div>
            <p className="text-xs text-muted-foreground mb-1 font-medium">
              Output:
            </p>
            <pre
              className={cn(
                "text-xs bg-muted/50 p-2 rounded overflow-x-auto whitespace-pre-wrap break-words",
                "max-h-48 overflow-y-auto"
              )}
            >
              {output}
            </pre>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
