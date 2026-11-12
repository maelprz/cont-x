import { useEffect, useRef, useState } from "react";
import { getSessionTiming, subscribeSessionTiming, type SessionTiming } from "../services/examService";

export interface ExamTimerOptions {
  rulesReady: boolean;
  allowOvertime?: boolean;
  onTimeRestored?: () => boolean | void;
}

export function useExamTimer(sessionId: string | null, onExpire: () => void,
  options: ExamTimerOptions = { rulesReady: true }) {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [timing, setTiming] = useState<SessionTiming | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const callbacks = useRef({ onExpire, options });
  useEffect(() => { callbacks.current = { onExpire, options }; }, [onExpire, options]);

  useEffect(() => {
    let active = true, fetching = false, expired = false;
    let snapshot: SessionTiming | null = null;
    let receivedAt = 0;
    let unsubscribe: (() => void) | undefined;
    setTiming(null); setSecondsLeft(null); setError(null);
    if (!sessionId) return;
    function tick() {
      if (!active || !snapshot) return;
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
      if (fetching || !active) return;
      fetching = true;
      try {
        const next = await getSessionTiming(sessionId!);
        if (!active) return;
        snapshot = next; receivedAt = Date.now();
        setTiming(next); setError(null);
        if (!unsubscribe) unsubscribe = subscribeSessionTiming(next.classExamId, () => { void refresh(); });
        tick();
      } catch {
        if (active) setError("Could not refresh the exam timer. Reconnect and retry.");
      } finally { fetching = false; }
    }
    void refresh();
    const clock = setInterval(tick, 1000);
    const polling = setInterval(refresh, 2500);
    return () => { active = false; clearInterval(clock); clearInterval(polling); unsubscribe?.(); };
  }, [sessionId, reload]);
  return { secondsLeft, timing, error, retry: () => setReload(value => value + 1) };
}
