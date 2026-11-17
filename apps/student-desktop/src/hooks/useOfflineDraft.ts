import { useEffect, useRef, useState } from "react";
import type { OfflineExamDraft, OfflineExamSnapshot } from "../types/offlineExam";

export function useOfflineDraft(
  exam: OfflineExamSnapshot | null,
  draft: Omit<OfflineExamDraft, "questionTimesMs">,
  getTimesMs: () => Record<string, number>,
  paused: boolean,
) {
  const [error, setError] = useState(false);
  const latest = useRef({ draft, getTimesMs });
  latest.current = { draft, getTimesMs };
  const saveDraft = useRef<(() => void) | null>(null);
  const revision = exam && !paused ? JSON.stringify(draft) : null;

  useEffect(() => {
    if (!exam || paused) return;
    const key = { studentId: exam.studentId, sessionId: exam.sessionId };
    let active = true;
    let saving = false;
    let queued = false;
    const save = async () => {
      if (saving) { queued = true; return; }
      saving = true;
      do {
        queued = false;
        const current = latest.current;
        try {
          await window.ipcRenderer.saveOfflineDraft(key, {
            ...current.draft, questionTimesMs: current.getTimesMs(),
          });
          if (active) setError(false);
        } catch {
          if (active) setError(true);
        }
      } while (active && queued);
      saving = false;
    };
    saveDraft.current = () => void save();
    const onVisibility = () => { if (document.visibilityState === "hidden") void save(); };
    const interval = setInterval(() => void save(), 1000);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      active = false;
      saveDraft.current = null;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [exam, paused]);
  useEffect(() => {
    if (revision !== null) saveDraft.current?.();
  }, [revision]);

  return error;
}
