import { useCallback, useEffect, useRef, useState } from "react";
import type { RunOutcome } from "../services/codeExecutionService";
import { syncOfflineAttempt, type OfflineSyncOutcome } from "../services/offlineSyncService";
import type { OfflineEnqueue, OfflineExamSnapshot, OfflineOperation } from "../types/offlineExam";

export function useOfflineSync(
  exam: OfflineExamSnapshot | null,
  onOutcome: (outcome: OfflineSyncOutcome) => void,
  onGraded: (id: string, result: RunOutcome) => void,
  onSubmissionStored: () => void,
) {
  const [error, setError] = useState<string | null>(null);
  const writes = useRef(new Map<string, OfflineOperation>());
  const saving = useRef<Promise<void> | null>(null);
  const syncing = useRef(false);
  const callbacks = useRef({ onOutcome, onGraded, onSubmissionStored });
  callbacks.current = { onOutcome, onGraded, onSubmissionStored };

  const flush = useCallback(async () => {
    if (!exam) return;
    const key = { studentId: exam.studentId, sessionId: exam.sessionId };
    while (writes.current.size) {
      if (!saving.current) {
        saving.current = (async () => {
          for (const [id, operation] of writes.current) {
            await window.ipcRenderer.enqueueOfflineOperation(key, operation);
            writes.current.delete(id);
            if (operation.kind === "submit") callbacks.current.onSubmissionStored();
          }
        })().finally(() => { saving.current = null; });
      }
      await saving.current;
    }
  }, [exam]);

  const enqueue = useCallback<OfflineEnqueue>(async (payload, occurredAt = new Date().toISOString(), id = crypto.randomUUID()) => {
    if (!exam) throw new Error("Offline exam is unavailable.");
    if (payload.kind === "live") {
      // A failed local write can leave unsaved heartbeats in memory. Keep the newest.
      for (const [pendingId, pending] of writes.current) {
        if (pending.kind === "live") writes.current.delete(pendingId);
      }
    }
    writes.current.set(id, { ...payload, id, occurredAt });
    try {
      await flush();
    } catch (cause) {
      setError("Could not save exam activity to local MySQL. Retrying.");
      throw cause;
    }
  }, [exam, flush]);

  const retry = useCallback(async () => {
    if (!exam || syncing.current) return;
    syncing.current = true;
    try {
      await flush();
      setError(null);
      if (!navigator.onLine) return;
      const operations = await window.ipcRenderer.listOfflineOperations({
        studentId: exam.studentId, sessionId: exam.sessionId,
      });
      if (!operations.length) return;
      const outcome = await syncOfflineAttempt(exam, operations, callbacks.current.onGraded);
      if (outcome) callbacks.current.onOutcome(outcome);
    } catch {
      setError("Exam sync will retry. Check the connection and local MySQL.");
    } finally {
      syncing.current = false;
    }
  }, [exam, flush]);

  useEffect(() => {
    if (!exam) return;
    const run = () => void retry();
    const interval = setInterval(run, 2500);
    window.addEventListener("online", run);
    run();
    return () => {
      clearInterval(interval);
      window.removeEventListener("online", run);
    };
  }, [exam, retry]);

  return { enqueue, retry, error };
}
