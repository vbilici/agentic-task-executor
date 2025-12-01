import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/services/api";
import type { Session } from "@/types/api";

interface SessionContextValue {
  sessions: Session[];
  isLoading: boolean;
  isCreating: boolean;
  refreshSessions: () => Promise<void>;
  createSession: () => Promise<Session | null>;
  deleteSession: (id: string) => Promise<void>;
  updateSession: (id: string, updates: Partial<Session>) => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  const refreshSessions = useCallback(async () => {
    try {
      const response = await api.listSessions({ limit: 50 });
      setSessions(response.sessions);
    } catch (error) {
      console.error("Failed to load sessions:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createSession = useCallback(async (): Promise<Session | null> => {
    setIsCreating(true);
    try {
      const session = await api.createSession();
      setSessions((prev) => [session, ...prev]);
      navigate(`/sessions/${session.id}`);
      return session;
    } catch (error) {
      console.error("Failed to create session:", error);
      return null;
    } finally {
      setIsCreating(false);
    }
  }, [navigate]);

  const deleteSession = useCallback(async (id: string) => {
    try {
      await api.deleteSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch (error) {
      console.error("Failed to delete session:", error);
    }
  }, []);

  const updateSession = useCallback((id: string, updates: Partial<Session>) => {
    setSessions((prev) =>
      prev.map((session) =>
        session.id === id ? { ...session, ...updates } : session
      )
    );
  }, []);

  // Load sessions on mount
  useEffect(() => {
    refreshSessions();
  }, [refreshSessions]);

  return (
    <SessionContext.Provider
      value={{
        sessions,
        isLoading,
        isCreating,
        refreshSessions,
        createSession,
        deleteSession,
        updateSession,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSessionContext() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSessionContext must be used within a SessionProvider");
  }
  return context;
}
