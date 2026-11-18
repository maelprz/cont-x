import { useCallback, useEffect, useRef, useState } from "react";
import { prepareLocalSync, syncOfflineAttempt, type OfflineSyncOutcome } from "../services/offlineSyncService";
import type { LocalSubmission } from "../types/localGrading";
import type { OfflineEnqueue, OfflineExamSnapshot, OfflineOperation } from "../types/offlineExam";

export function useOfflineSync(
  exam: OfflineExamSnapshot | null,
  onOutcome: (outcome: OfflineSyncOutcome) => void,
  onSubmissionStored: () => void,
) {
  const [error, setError] = useState<string | null>(null);
  const [submission, setSubmission] = useState<LocalSubmission | null>(exam?.gradingState?.submission ?? null);
  const [showLocalResult, setShowLocalResult] = useState(!navigator.onLine);
  const pending = useRef(exam?.pendingSubmission);
  const receipt = useRef<LocalSubmission | null>(exam?.gradingState?.submission ?? null);
  const writes = useRef(new Map<string, OfflineOperation>());
  const saving = useRef<Promise<void> | null>(null);
  const syncing = useRef(false);
  const callbacks = useRef({ onOutcome, onSubmissionStored });
  callbacks.current = { onOutcome, onSubmissionStored };

  const flush = useCallback(async () => {
    if (!exam) return;
    const key = { studentId: exam.studentId, sessionId: exam.sessionId };
    while (writes.current.size) {
      if (!saving.current) {
        saving.current = (async () => {
          for (const [id, operation] of writes.current) {
            await window.ipcRenderer.enqueueOfflineOperation(key, operation);
            writes.current.delete(id);
            if (operation.kind === "submit") {
              pending.current = { ...operation.submission, requestedAt: operation.occurredAt };
              callbacks.current.onSubmissionStored();
            }
          }
        })().finally(() => { saving.current = null; });
      }
      await saving.current;
    }
  }, [exam]);

  const enqueue = useCallback<OfflineEnqueue>(async (payload, occurredAt = new Date().toISOString(), id = crypto.randomUUID()) => {
    if (!exam) throw new Error("Offline exam is unavailable.");
    if (payload.kind === 'submit') setShowLocalResult(!navigator.onLine);
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
      setError("Could not save exam activity to local storage. Retrying.");
      throw cause;
    }
  }, [exam, flush]);

  const retry = useCallback(async () => {
    if (!exam || syncing.current) return;
    syncing.current = true;
    try {
      await flush();
      setError(null);
      if (!navigator.onLine && (!pending.current || receipt.current)) return;
      const local = await prepareLocalSync(exam, pending.current, receipt.current);
      receipt.current = local.receipt;
      setSubmission(local.receipt);
      if (!navigator.onLine) { setShowLocalResult(true); return; }
      const operations = local.operations;
      if (!operations.length) return;
      const outcome = await syncOfflineAttempt(exam, operations, receipt.current);
      if (outcome === "extended") {
        pending.current = undefined;
        receipt.current = null;
        setSubmission(null);
        setShowLocalResult(!navigator.onLine);
      }
      if (outcome) callbacks.current.onOutcome(outcome);
    } catch {
      if (pending.current) setShowLocalResult(true);
      setError(pending.current && !receipt.current
        ? "Local grading could not finish. Your submission is saved and grading will retry."
        : "Exam sync will retry. Check the connection and local storage.");
    } finally {
      syncing.current = false;
    }
  }, [exam, flush]);

  useEffect(() => {
    if (!exam) return;
    const run = () => void retry();
    const offline = () => setShowLocalResult(true);
    const interval = setInterval(run, 2500);
    window.addEventListener("online", run);
    window.addEventListener("offline", offline);
    run();
    return () => {
      clearInterval(interval);
      window.removeEventListener("online", run);
      window.removeEventListener("offline", offline);
    };
  }, [exam, retry]);

  return { enqueue, retry, error, gradeSaved: Boolean(submission), submission, showLocalResult };
}
