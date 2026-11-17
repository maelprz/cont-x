import { useEffect, useRef, useState } from "react";
import { getSessionTiming, subscribeSessionTiming, type SessionTiming } from "../services/examService";
import type { OfflineExamSnapshot } from "../types/offlineExam";

export interface ExamTimerOptions {
  rulesReady: boolean;
  allowOvertime?: boolean;
  onTimeRestored?: () => boolean | void;
  onServerTiming?: (timing: SessionTiming, receivedAt: number) => void;
  savedExam?: Pick<OfflineExamSnapshot, "timing" | "timingReceivedAt">;
}

export function useExamTimer(sessionId: string | null, onExpire: () => void,
  options: ExamTimerOptions = { rulesReady: true }) {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [timing, setTiming] = useState<SessionTiming | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const savedExam = options.savedExam;
  const callbacks = useRef({ onExpire, options });
  useEffect(() => { callbacks.current = { onExpire, options }; }, [onExpire, options]);

  useEffect(() => {
    let active = true, fetching = false, expired = false;
    let snapshot = savedExam?.timing ?? null;
    let receivedAt = savedExam?.timingReceivedAt ?? 0;
    let unsubscribe: (() => void) | undefined;
    setTiming(snapshot); setSecondsLeft(null); setError(null);
    if (!sessionId) return;
    function tick() {
      if (!active || !snapshot) return;
      if (savedExam && snapshot.sessionStatus !== "in_progress") return;
      const now = Date.parse(snapshot.serverNow) + Date.now() - receivedAt;
      const normalLeft = Math.ceil((Date.parse(snapshot.normalDeadline) - now) / 1000);
      const mustFinish = snapshot.forceSubmit || now >= Date.parse(snapshot.hardDeadline);
      if (mustFinish && callbacks.current.options.rulesReady) {
        setSecondsLeft(snapshot.allowOvertime ? Math.min(normalLeft, 0) : 0);
        if (!expired) { expired = true; callbacks.current.onExpire(); }
        return;
      }
      if (expired && !mustFinish && snapshot.sessionStatus === "in_progress") {
        if (callbacks.current.options.onTimeRestored?.() === false) return;
        expired = false;
      }
      if (!expired) setSecondsLeft(normalLeft);
    }
    async function refresh() {
      if (fetching || !active || (savedExam && !navigator.onLine)) return;
      fetching = true;
      try {
        const next = await getSessionTiming(sessionId!, savedExam ? AbortSignal.timeout(8_000) : undefined);
        if (!active) return;
        snapshot = next; receivedAt = Date.now();
        setTiming(next); setError(null);
        callbacks.current.options.onServerTiming?.(next, receivedAt);
        if (!unsubscribe) unsubscribe = subscribeSessionTiming(next.classExamId, () => { void refresh(); });
        tick();
      } catch {
        if (active && !snapshot) setError("Could not refresh the exam timer. Reconnect and retry.");
      } finally { fetching = false; }
    }
    tick();
    void refresh();
    const clock = setInterval(tick, 1000);
    const polling = setInterval(refresh, 2500);
    const onOnline = () => void refresh();
    window.addEventListener("online", onOnline);
    return () => {
      active = false;
      clearInterval(clock);
      clearInterval(polling);
      window.removeEventListener("online", onOnline);
      unsubscribe?.();
    };
  }, [sessionId, savedExam, reload]);
  return { secondsLeft, timing, error, retry: () => setReload(value => value + 1) };
}
