import { useState } from "react";
import { MoreVertical, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Session } from "@/types/api";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

interface SessionListItemProps {
  session: Session;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

const statusColors = {
  planning: "bg-yellow-100 text-yellow-800",
  executing: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
};

export function SessionListItem({
  session,
  isActive,
  onSelect,
  onDelete,
}: SessionListItemProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <>
    <button
      type="button"
      className={cn(
        "group flex w-full items-center gap-2 rounded-md p-2 text-left transition-colors",
        isActive
          ? "bg-accent text-accent-foreground"
          : "hover:bg-accent/50"
      )}
      onClick={onSelect}
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
      <DropdownMenu>
        <DropdownMenuTrigger
          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-background"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            className="text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              setShowDeleteConfirm(true);
            }}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </button>

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
