import { useCallback, useEffect, useRef, useState } from "react";

export interface SSEOptions<T> {
  onMessage?: (event: T) => void;
  onError?: (error: Error) => void;
  onOpen?: () => void;
  onClose?: () => void;
}

export interface UseSSEResult<T> {
  data: T | null;
  error: Error | null;
  isConnected: boolean;
  connect: (url: string, body?: Record<string, unknown>) => void;
  disconnect: () => void;
}

export function useSSE<T>(options: SSEOptions<T> = {}): UseSSEResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Use refs to store callbacks so they don't cause re-renders
  const optionsRef = useRef(options);

  // Update the ref when options change
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const disconnect = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsConnected(false);
    optionsRef.current.onClose?.();
  }, []);

  const connect = useCallback(
    async (url: string, body?: Record<string, unknown>) => {
      // Disconnect any existing connection
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const method = body ? "POST" : "GET";
        const response = await fetch(url, {
          method,
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        if (!response.body) {
          throw new Error("No response body");
        }

        setIsConnected(true);
        setError(null);
        optionsRef.current.onOpen?.();

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });

          // Process complete events from buffer
          const lines = buffer.split("\n");
          buffer = lines.pop() || ""; // Keep incomplete line in buffer

          let eventData = "";

          for (const line of lines) {
            if (line.startsWith("data:")) {
              eventData = line.slice(5).trim();
            } else if (line === "" && eventData) {
              // Empty line signals end of event
              try {
                const parsed = JSON.parse(eventData) as T;
                setData(parsed);
                optionsRef.current.onMessage?.(parsed);
              } catch (e) {
                console.error("Failed to parse SSE data:", e);
              }
              eventData = "";
            }
          }
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          const error = err as Error;
          setError(error);
          optionsRef.current.onError?.(error);
        }
      } finally {
        setIsConnected(false);
        optionsRef.current.onClose?.();
      }
    },
    []
  );

  // Cleanup on unmount only
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  return { data, error, isConnected, connect, disconnect };
}
