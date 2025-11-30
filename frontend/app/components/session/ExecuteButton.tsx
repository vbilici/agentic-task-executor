import { Play, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ExecuteButtonProps {
  onClick: () => void;
  disabled?: boolean;
  isExecuting?: boolean;
  pendingTaskCount?: number;
}

export function ExecuteButton({
  onClick,
  disabled = false,
  isExecuting = false,
  pendingTaskCount = 0,
}: ExecuteButtonProps) {
  const isDisabled = disabled || isExecuting || pendingTaskCount === 0;

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
          Executing...
        </>
      ) : (
        <>
          <Play className="mr-2 h-4 w-4" />
          Execute {pendingTaskCount > 0 ? `(${pendingTaskCount} tasks)` : ""}
        </>
      )}
    </Button>
  );
}
