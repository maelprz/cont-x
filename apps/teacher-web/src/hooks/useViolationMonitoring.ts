import { useState, useEffect, useCallback } from "react";
import {
  getClassExamHeader,
  getSessionsForClassExam,
  getViolationsForSession,
  removeStudentFromExam,
} from "../services/violationService";
import type { ClassExamHeader } from "../services/violationService";
import type {
  ViolationSessionRow,
  ViolationDetailRow,
} from "../screens/violationLogs/violationMonitoringScreen.types";
import { useToast } from "./useToast";

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

  const { showToast } = useToast();
  const [sessionToRemove, setSessionToRemove] =
    useState<ViolationSessionRow | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  // opens the confirm dialog for one row
  const requestRemove = useCallback((session: ViolationSessionRow) => {
    setRemoveError(null);
    setSessionToRemove(session);
  }, []);

  // closes the dialog, unless a removal is already in flight
  const cancelRemove = useCallback(() => {
    if (isRemoving) return; // don't let the dialog vanish mid-request
    setSessionToRemove(null); // forget the row
    setRemoveError(null); // and any error
  }, [isRemoving]);

  const confirmRemove = useCallback(async () => {
    if (!sessionToRemove || isRemoving) return; // nothing selected, or already running (double-click guard)
    setIsRemoving(true); // disable the confirm button
    setRemoveError(null); // start clean
    try {
      const result = await removeStudentFromExam(sessionToRemove.id); // the real call
      if (result === "removed") {
        showToast(`${sessionToRemove.studentName} was removed from the exam.`); // success message
      } else {
        showToast(
          "That attempt had already finished, so nothing was changed.",
          "error",
        ); // the race case
      }
      setSessionToRemove(null); // close the dialog
      await fetchSessions(); // reload so the row shows its real status
    } catch (err) {
      setRemoveError(
        err instanceof Error ? err.message : "Failed to remove the student.",
      ); // keep the dialog open with the reason
    } finally {
      setIsRemoving(false); // always re-enable the button
    }
  }, [sessionToRemove, isRemoving, showToast, fetchSessions]);

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
    sessionToRemove,
    isRemoving,
    removeError,
    requestRemove,
    cancelRemove,
    confirmRemove,
  };
}
