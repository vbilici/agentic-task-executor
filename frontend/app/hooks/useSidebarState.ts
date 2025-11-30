import { useCallback, useState } from "react";

const STORAGE_KEY_LEFT = "libra-left-sidebar-collapsed";
const STORAGE_KEY_RIGHT = "libra-right-sidebar-collapsed";

export interface UseSidebarStateResult {
  isLeftCollapsed: boolean;
  isRightCollapsed: boolean;
  toggleLeft: () => void;
  toggleRight: () => void;
  setLeftCollapsed: (collapsed: boolean) => void;
  setRightCollapsed: (collapsed: boolean) => void;
}

function getStoredValue(key: string, defaultValue: boolean): boolean {
  if (typeof window === "undefined") return defaultValue;
  const stored = localStorage.getItem(key);
  return stored !== null ? stored === "true" : defaultValue;
}

export function useSidebarState(): UseSidebarStateResult {
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(() =>
    getStoredValue(STORAGE_KEY_LEFT, false)
  );
  const [isRightCollapsed, setIsRightCollapsed] = useState(() =>
    getStoredValue(STORAGE_KEY_RIGHT, true)
  );

  const setLeftCollapsed = useCallback((collapsed: boolean) => {
    setIsLeftCollapsed(collapsed);
    localStorage.setItem(STORAGE_KEY_LEFT, String(collapsed));
  }, []);

  const setRightCollapsed = useCallback((collapsed: boolean) => {
    setIsRightCollapsed(collapsed);
    localStorage.setItem(STORAGE_KEY_RIGHT, String(collapsed));
  }, []);

  const toggleLeft = useCallback(() => {
    setLeftCollapsed(!isLeftCollapsed);
  }, [isLeftCollapsed, setLeftCollapsed]);

  const toggleRight = useCallback(() => {
    setRightCollapsed(!isRightCollapsed);
  }, [isRightCollapsed, setRightCollapsed]);

  return {
    isLeftCollapsed,
    isRightCollapsed,
    toggleLeft,
    toggleRight,
    setLeftCollapsed,
    setRightCollapsed,
  };
}
