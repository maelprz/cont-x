import { useState, useEffect, useCallback, useRef } from "react";
import { getMovementHistory } from "../services/movementHistoryService";
import type {
  MovementHistoryEntry,
  MovementHistorySummary,
} from "../screens/studentMonitoring/studentMonitoringScreen.types";

const EMPTY_SUMMARY: MovementHistorySummary = { windowLeftCount: 0, totalAwaySeconds: 0, questionChanges: 0 };

// loads the movement history of ONE attempt, only while a session is selected
export function useMovementHistory(sessionId: string | null) {
  const [entries, setEntries] = useState<MovementHistoryEntry[]>([]); // timeline lines, newest first
  const [summary, setSummary] = useState<MovementHistorySummary>(EMPTY_SUMMARY); // counts above the timeline
  const [isTruncated, setIsTruncated] = useState(false); // true when older events were left out
  const [isLoading, setIsLoading] = useState(false); // true while a load is running
  const [error, setError] = useState<string | null>(null); // message shown in the modal
  const requestCounterRef = useRef(0); // numbers each load so an older one cannot overwrite a newer one

  const refetch = useCallback(async () => {
    if (sessionId === null) {
      setEntries([]); // nothing selected, clear old data so the next student does not flash the previous one
      setSummary(EMPTY_SUMMARY);
      setIsTruncated(false);
      setError(null);
      setIsLoading(false);
      return;
    }
    const requestId = ++requestCounterRef.current; // this load's number
    setIsLoading(true);
    setError(null);
    try {
      const result = await getMovementHistory(sessionId);
      if (requestId !== requestCounterRef.current) return; // a newer load started, drop this result
      setEntries(result.entries);
      setSummary(result.summary);
      setIsTruncated(result.isTruncated);
    } catch (err) {
      if (requestId !== requestCounterRef.current) return; // ignore errors from an outdated load
      setError(err instanceof Error ? err.message : "Failed to load movement history.");
    } finally {
      if (requestId === requestCounterRef.current) setIsLoading(false); // only the newest load turns the spinner off
    }
  }, [sessionId]);

  useEffect(() => {
    void refetch(); // load when a student is opened, clear when the modal closes
  }, [refetch]);

  return { entries, summary, isTruncated, isLoading, error, refetch };
}