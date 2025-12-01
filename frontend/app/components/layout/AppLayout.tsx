import { Outlet } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebarState } from "@/hooks/useSidebarState";
import { useMobileNavContext } from "@/contexts/MobileNavContext";
import { SessionListContent } from "./SessionListContent";
import { MobileHeader } from "./MobileHeader";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export function AppLayout() {
  const { isLeftCollapsed, toggleLeft } = useSidebarState();
  const { activePanel, closePanel, isMobile } = useMobileNavContext();

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile Header - Only visible on mobile */}
      {isMobile && <MobileHeader />}

      {/* Mobile Sessions Sheet */}
      <Sheet
        open={activePanel === "sessions"}
        onOpenChange={(open) => !open && closePanel()}
      >
        <SheetContent side="left" className="w-[280px] p-0 flex flex-col">
          <SheetHeader className="p-4 border-b border-border">
            <SheetTitle>Sessions</SheetTitle>
            <SheetDescription className="sr-only">
              Browse and manage your sessions
            </SheetDescription>
          </SheetHeader>
          <SessionListContent onSessionSelect={closePanel} />
        </SheetContent>
      </Sheet>

      {/* Desktop Left Sidebar - Hidden on mobile */}
      <aside
        className={cn(
          "hidden sm:flex h-full max-h-full overflow-hidden border-r border-border bg-card transition-all duration-200 flex-col",
          isLeftCollapsed ? "w-14" : "w-64"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-3">
          {!isLeftCollapsed && (
            <div>
              <h1 className="text-lg font-bold">Libra</h1>
              <p className="text-xs text-muted-foreground">
                Agent-Driven TODO Executor
              </p>
            </div>
          )}
          <button
            onClick={toggleLeft}
            className="rounded p-1 hover:bg-accent"
            aria-label={isLeftCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isLeftCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Session List Content */}
        <SessionListContent isCollapsed={isLeftCollapsed} />
      </aside>

      {/* Main Content */}
      <main
        className={cn(
          "flex-1 min-w-0 h-full overflow-hidden",
          isMobile && "pt-14" // Account for fixed mobile header
        )}
      >
        <Outlet />
      </main>
    </div>
  );
}
