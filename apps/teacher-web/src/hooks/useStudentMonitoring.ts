import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { getStudentMonitoringRoster } from "../services/studentMonitoringService"; // the roster call
import { getClassExamHeader } from "../services/violationService"; // reused: exam title and class name
import type { ClassExamHeader } from "../services/violationService";
import type { StudentMonitoringRow } from "../screens/studentMonitoring/studentMonitoringScreen.types";

// holds all state needed by the Student Monitoring screen
export function useStudentMonitoring(classExamId: string | null) {
  const [rows, setRows] = useState<StudentMonitoringRow[]>([]); // one row per enrolled student
  const [header, setHeader] = useState<ClassExamHeader | null>(null); // exam title and class name for the heading
  const [isLoading, setIsLoading] = useState(true); // true while a load is running
  const [error, setError] = useState<string | null>(null); // message shown above the table
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null); // so the teacher can see how fresh the table is
  const requestCounterRef = useRef(0); // numbers each load so an older, slower one cannot overwrite a newer one

  // loads the roster and the heading together
  const refetch = useCallback(async () => {
    if (classExamId === null) {
      setRows([]); // nothing selected, clear stale rows
      setHeader(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    const requestId = ++requestCounterRef.current; // this load's number
    setIsLoading(true);
    setError(null);
    try {
      const [rosterRows, headerInfo] = await Promise.all([
        getStudentMonitoringRoster(classExamId),
        getClassExamHeader(classExamId),
      ]);
      if (requestId !== requestCounterRef.current) return; // a newer load started, drop this result
      setRows(rosterRows);
      setHeader(headerInfo);
      setLastRefreshedAt(new Date()); // shown as "Updated 10:32:05"
    } catch (err) {
      if (requestId !== requestCounterRef.current) return; // ignore errors from an outdated load
      setError(err instanceof Error ? err.message : "Failed to load students."); // keep old rows visible, show the reason
    } finally {
      if (requestId === requestCounterRef.current) setIsLoading(false); // only the newest load turns the spinner off
    }
  }, [classExamId]);

  useEffect(() => {
    void refetch(); // load once when the screen opens or the class exam changes
  }, [refetch]);

  // quick counts for the line under the title
  const summary = useMemo(
    () => ({
      total: rows.length,
      inProgress: rows.filter((r) => r.status === "in_progress").length,
      offline: rows.filter((r) => r.status === "offline").length,
      notJoined: rows.filter((r) => r.status === "not_joined").length,
      finished: rows.filter((r) => r.status === "submitted" || r.status === "timed_out").length,
    }),
    [rows],
  );

  return { rows, header, isLoading, error, refetch, lastRefreshedAt, summary };
}