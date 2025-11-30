import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";

export type MobilePanel = "sessions" | "tasks" | "artifacts" | null;

const MOBILE_BREAKPOINT = 640; // sm breakpoint

interface MobileNavContextValue {
  // Panel state
  activePanel: MobilePanel;
  openPanel: (panel: MobilePanel) => void;
  closePanel: () => void;
  isMobile: boolean;

  // Header data (for MobileHeader to display)
  taskCount: number;
  artifactCount: number;
  isExtractingTasks: boolean;
  sessionTitle: string;

  // Setters for header data (called by SessionPage)
  setTaskCount: (count: number) => void;
  setArtifactCount: (count: number) => void;
  setIsExtractingTasks: (value: boolean) => void;
  setSessionTitle: (title: string) => void;
}

const MobileNavContext = createContext<MobileNavContextValue | null>(null);

export function MobileNavProvider({ children }: { children: ReactNode }) {
  // Panel state
  const [activePanel, setActivePanel] = useState<MobilePanel>(null);
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < MOBILE_BREAKPOINT;
  });

  // Header data
  const [taskCount, setTaskCount] = useState(0);
  const [artifactCount, setArtifactCount] = useState(0);
  const [isExtractingTasks, setIsExtractingTasks] = useState(false);
  const [sessionTitle, setSessionTitle] = useState("");

  // Handle responsive changes
  useEffect(() => {
    const mediaQuery = window.matchMedia(
      `(max-width: ${MOBILE_BREAKPOINT - 1}px)`
    );

    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsMobile(e.matches);
      // Close any open panels when switching to desktop
      if (!e.matches) {
        setActivePanel(null);
      }
    };

    handleChange(mediaQuery);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const openPanel = useCallback((panel: MobilePanel) => {
    setActivePanel(panel);
  }, []);

  const closePanel = useCallback(() => {
    setActivePanel(null);
  }, []);

  return (
    <MobileNavContext.Provider
      value={{
        activePanel,
        openPanel,
        closePanel,
        isMobile,
        taskCount,
        artifactCount,
        isExtractingTasks,
        sessionTitle,
        setTaskCount,
        setArtifactCount,
        setIsExtractingTasks,
        setSessionTitle,
      }}
    >
      {children}
    </MobileNavContext.Provider>
  );
}

export function useMobileNavContext() {
  const context = useContext(MobileNavContext);
  if (!context) {
    throw new Error(
      "useMobileNavContext must be used within a MobileNavProvider"
    );
  }
  return context;
}
