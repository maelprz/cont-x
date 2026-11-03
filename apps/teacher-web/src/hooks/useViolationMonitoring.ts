import { useState, useEffect, useCallback } from "react";
import {
  getClassExamHeader,
  getSessionsForClassExam,
  getViolationsForSession,
} from "../services/violationService";
import type { ClassExamHeader } from "../services/violationService";
import type {
  ViolationSessionRow,
  ViolationDetailRow,
} from "../screens/violationLogs/violationMonitoringScreen.types";

// holds all state needed by the Violation Monitoring screen
export function useViolationMonitoring(classExamId: string | null) {
  const [sessions, setSessions] = useState<ViolationSessionRow[]>([]);
  const [isLoading, setIsLoading] = useState(true); // true while the session list loads
  const [error, setError] = useState<string | null>(null);
  const [header, setHeader] = useState<ClassExamHeader | null>(null); // exam title and class name for the page heading

  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null,
  ); // which session's modal is currently open
  const [violations, setViolations] = useState<ViolationDetailRow[]>([]);
  const [isViolationsLoading, setIsViolationsLoading] = useState(false); // true while modal data loads
  const [violationsError, setViolationsError] = useState<string | null>(null);

  // loads every session of this class exam, plus its heading, from the service
  const fetchSessions = useCallback(async () => {
    // nothing selected yet — skip the query, show empty state instead
    if (classExamId === null) {
      setSessions([]); // clear out any stale rows
      setHeader(null); // and the heading
      setError(null); // this isn't an error, just nothing to show
      setIsLoading(false); // stop the loading spinner
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const [rows, headerInfo] = await Promise.all([
        getSessionsForClassExam(classExamId),
        getClassExamHeader(classExamId),
      ]);
      setSessions(rows);
      setHeader(headerInfo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sessions.");
    } finally {
      setIsLoading(false);
    }
  }, [classExamId]);

  // runs once on mount, and again if the class exam id changes
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // opens the modal and loads violations for the clicked session
  const openViolationModal = useCallback(async (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setIsViolationsLoading(true);
    setViolationsError(null);
    try {
      const rows = await getViolationsForSession(sessionId);
      setViolations(rows);
    } catch (err) {
      setViolationsError(
        err instanceof Error ? err.message : "Failed to load violations.",
      );
    } finally {
      setIsViolationsLoading(false);
    }
  }, []);

  // closes the modal and clears out its data
  const closeViolationModal = useCallback(() => {
    setSelectedSessionId(null);
    setViolations([]);
    setViolationsError(null);
  }, []);

  return {
    sessions,
    header,
    isLoading,
    error,
    refetch: fetchSessions, // wired to the manual Refresh button
    selectedSessionId,
    violations,
    isViolationsLoading,
    violationsError,
    openViolationModal,
    closeViolationModal,
  };
}