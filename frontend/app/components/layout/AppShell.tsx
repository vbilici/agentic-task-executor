import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: ReactNode;
  leftSidebar?: ReactNode;
  rightSidebar?: ReactNode;
  isLeftCollapsed?: boolean;
  isRightCollapsed?: boolean;
}

export function AppShell({
  children,
  leftSidebar,
  rightSidebar,
  isLeftCollapsed = false,
  isRightCollapsed = true,
}: AppShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Left Sidebar */}
      {leftSidebar && (
        <aside
          className={cn(
            "flex-shrink-0 border-r border-border bg-card transition-all duration-300",
            isLeftCollapsed ? "w-12" : "w-64"
          )}
        >
          {leftSidebar}
        </aside>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-auto">{children}</main>

      {/* Right Sidebar */}
      {rightSidebar && (
        <aside
          className={cn(
            "flex-shrink-0 border-l border-border bg-card transition-all duration-300",
            isRightCollapsed ? "w-0 overflow-hidden" : "w-80"
          )}
        >
          {rightSidebar}
        </aside>
      )}
    </div>
  );
}
