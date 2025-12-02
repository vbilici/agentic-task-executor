import { Play, Pause, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ExecuteButtonProps {
  onClick: () => void;
  disabled?: boolean;
  isExecuting?: boolean;
  isPausing?: boolean;
  pendingTaskCount?: number;
  isResume?: boolean;
}

export function ExecuteButton({
  onClick,
  disabled = false,
  isExecuting = false,
  isPausing = false,
  pendingTaskCount = 0,
  isResume = false,
}: ExecuteButtonProps) {
  // When executing, show pause button
  if (isExecuting) {
    return (
      <Button
        onClick={onClick}
        disabled={isPausing}
        variant="destructive"
        className="w-full"
        size="lg"
      >
        {isPausing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Pausing...
          </>
        ) : (
          <>
            <Pause className="mr-2 h-4 w-4" />
            Pause Execution
          </>
        )}
      </Button>
    );
  }

  // Not executing - show execute/resume button
  const isDisabled = disabled || pendingTaskCount === 0;

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
      <Play className="mr-2 h-4 w-4" />
      {buttonText}
    </Button>
  );
}
