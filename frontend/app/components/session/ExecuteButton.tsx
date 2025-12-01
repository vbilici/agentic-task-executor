import { Play, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ExecuteButtonProps {
  onClick: () => void;
  disabled?: boolean;
  isExecuting?: boolean;
  pendingTaskCount?: number;
  isResume?: boolean;
}

export function ExecuteButton({
  onClick,
  disabled = false,
  isExecuting = false,
  pendingTaskCount = 0,
  isResume = false,
}: ExecuteButtonProps) {
  const isDisabled = disabled || isExecuting || pendingTaskCount === 0;

  const buttonText = isResume
    ? `Continue (${pendingTaskCount} task${pendingTaskCount !== 1 ? "s" : ""} remaining)`
    : `Execute${pendingTaskCount > 0 ? ` (${pendingTaskCount} tasks)` : ""}`;

  return (
    <Button
      onClick={onClick}
      disabled={isDisabled}
      className="w-full"
      size="lg"
    >
      {isExecuting ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {isResume ? "Resuming..." : "Executing..."}
        </>
      ) : (
        <>
          <Play className="mr-2 h-4 w-4" />
          {buttonText}
        </>
      )}
    </Button>
  );
}
