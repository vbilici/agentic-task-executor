import { useState } from "react";
import { Trash2, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Session } from "@/types/api";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SessionListItemProps {
  session: Session;
  isActive: boolean;
  isCollapsed?: boolean;
  isDisabled?: boolean;
  disabledReason?: string;
  onSelect: () => void;
  onDelete: () => void;
}

const statusColors = {
  planning: "bg-yellow-100 text-yellow-800",
  executing: "bg-blue-100 text-blue-800",
  paused: "bg-amber-100 text-amber-800",
  completed: "bg-green-100 text-green-800",
};

const statusDotColors = {
  planning: "bg-yellow-500",
  executing: "bg-blue-500",
  paused: "bg-amber-500",
  completed: "bg-green-500",
};

export function SessionListItem({
  session,
  isActive,
  isCollapsed = false,
  isDisabled = false,
  disabledReason,
  onSelect,
  onDelete,
}: SessionListItemProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Collapsed view: icon with tooltip
  if (isCollapsed) {
    return (
      <>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={isDisabled ? undefined : onSelect}
              disabled={isDisabled}
              className={cn(
                "relative flex w-full items-center justify-center rounded-md p-2 transition-colors",
                isDisabled && "opacity-50 cursor-not-allowed",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : !isDisabled && "hover:bg-accent/50 text-muted-foreground"
              )}
              aria-label={session.title || "New Session"}
            >
              <MessageSquare className="h-5 w-5" />
              <span
                className={cn(
                  "absolute bottom-1 right-1 h-2 w-2 rounded-full",
                  statusDotColors[session.status]
                )}
              />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {isDisabled && disabledReason ? (
              <p className="text-xs">{disabledReason}</p>
            ) : (
              <>
                <p className="font-medium">{session.title || "New Session"}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {session.status}
                </p>
              </>
            )}
          </TooltipContent>
        </Tooltip>

        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Session?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the session and all its tasks, messages, and artifacts.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={onDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  // Expanded view: full item with title and badge
  const buttonContent = (
    <button
      type="button"
      disabled={isDisabled}
      className={cn(
        "group flex w-full items-center gap-2 rounded-md p-2 text-left transition-colors",
        isDisabled && "opacity-50 cursor-not-allowed",
        !isDisabled && "cursor-pointer",
        isActive
          ? "bg-accent text-accent-foreground"
          : !isDisabled && "hover:bg-accent/50"
      )}
      onClick={isDisabled ? undefined : onSelect}
    >
      <div
        className={cn(
          "h-2 w-2 rounded-full flex-shrink-0",
          isActive ? "bg-primary" : "bg-muted-foreground/30"
        )}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {session.title || "New Session"}
        </p>
        <Badge
          variant="secondary"
          className={cn("text-xs mt-1", statusColors[session.status])}
        >
          {session.status}
        </Badge>
      </div>
      {!isDisabled && (
        <button
          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            setShowDeleteConfirm(true);
          }}
          aria-label="Delete session"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </button>
  );

  return (
    <>
    {isDisabled && disabledReason ? (
      <Tooltip>
        <TooltipTrigger asChild>
          {buttonContent}
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{disabledReason}</p>
        </TooltipContent>
      </Tooltip>
    ) : (
      buttonContent
    )}

    <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Session?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete the session and all its tasks, messages, and artifacts.
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
