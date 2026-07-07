import { useState, useEffect, useCallback } from "react";
import { getAuditLogs } from "../services/auditLogService";
import type { AuditLogEntry } from "../screens/auditLogs/auditLogsScreen.types";

interface UseAuditLogsReturn {
  logs: AuditLogEntry[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useAuditLogs(): UseAuditLogsReturn {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // fetches the full audit log list and stores it in state
  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getAuditLogs();
      setLogs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load audit logs.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // runs once when the screen first mounts
  useEffect(() => {
    refetch();
  }, [refetch]);

  return { logs, isLoading, error, refetch };
}