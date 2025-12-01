import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { useSessionContext } from "./SessionContext";

interface ExecutionContextValue {
  /** The ID of the session currently busy (executing or chatting), or null */
  busySessionId: string | null;
  /** Whether any session is currently busy */
  isBusy: boolean;
  /** Set the busy session ID (call with sessionId to start, null to clear) */
  setBusySession: (sessionId: string | null) => void;
}

const ExecutionContext = createContext<ExecutionContextValue | null>(null);

export function ExecutionProvider({ children }: { children: ReactNode }) {
  const { sessions } = useSessionContext();
  const [busySessionId, setBusySessionId] = useState<string | null>(null);

  // On mount/sessions change, derive busy state from executing sessions
  // This handles page refresh during execution
  const derivedBusySessionId = useMemo(() => {
    const executingSession = sessions.find((s) => s.status === "executing");
    return executingSession?.id || null;
  }, [sessions]);

  // Use explicit state if set, otherwise fall back to derived state
  const effectiveBusySessionId = busySessionId ?? derivedBusySessionId;

  const setBusySession = useCallback((sessionId: string | null) => {
    setBusySessionId(sessionId);
  }, []);

  const isBusy = effectiveBusySessionId !== null;

  return (
    <ExecutionContext.Provider
      value={{
        busySessionId: effectiveBusySessionId,
        isBusy,
        setBusySession,
      }}
    >
      {children}
    </ExecutionContext.Provider>
  );
}

export function useExecutionContext() {
  const context = useContext(ExecutionContext);
  if (!context) {
    throw new Error(
      "useExecutionContext must be used within an ExecutionProvider"
    );
  }
  return context;
}
