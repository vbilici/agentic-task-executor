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
  return (
    <div
      className={cn(
        "group flex items-center gap-2 rounded-md p-2 cursor-pointer transition-colors",
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
              onDelete();
            }}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
