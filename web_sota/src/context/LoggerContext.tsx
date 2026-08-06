import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useState,
} from "react";

export interface LogEntry {
  id: number;
  ts: string;
  level: "info" | "warn" | "error" | "debug";
  message: string;
}

interface LoggerContextValue {
  entries: LogEntry[];
  add: (entry: Omit<LogEntry, "id" | "ts">) => void;
  clear: () => void;
}

const LoggerContext = createContext<LoggerContextValue | null>(null);

let nextId = 0;

export function LoggerProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<LogEntry[]>([]);

  const add = useCallback((entry: Omit<LogEntry, "id" | "ts">) => {
    setEntries((prev) => [
      ...prev,
      { id: ++nextId, ts: new Date().toISOString(), ...entry },
    ]);
  }, []);

  const clear = useCallback(() => {
    setEntries([]);
  }, []);

  return (
    <LoggerContext.Provider value={{ entries, add, clear }}>
      {children}
    </LoggerContext.Provider>
  );
}

export function useLogger(): LoggerContextValue {
  const ctx = useContext(LoggerContext);
  if (!ctx) throw new Error("useLogger must be used within a LoggerProvider");
  return ctx;
}
