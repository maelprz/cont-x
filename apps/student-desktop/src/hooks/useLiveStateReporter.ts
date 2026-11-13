import { useCallback, useEffect, useRef } from "react"; 
import { reportLiveState } from "../services/liveStateService"; 

const HEARTBEAT_MS = 20000; 
const JITTER_MS = 5000; 
const CHANGE_DEBOUNCE_MS = 1000; 
const FOCUS_DEBOUNCE_MS = 300; 

interface Options {
  sessionId: string | null; 
  enabled: boolean; 
  questionId: string | null; 
  position: number | null; 
  total: number | null; 
  answeredCount: number; 
}

// Tells the teacher's Student Monitoring screen where this student is (WBS 7.3).
// It sends on a steady heartbeat, and right after the student moves, answers, or loses window focus.
// It is "last write wins" state, so a dropped network needs no queue: the next send carries the newest values.
export function useLiveStateReporter({
  sessionId,
  enabled,
  questionId,
  position,
  total,
  answeredCount,
}: Options) {
  const latestRef = useRef({ questionId, position, total, answeredCount }); 
  const inFlightRef = useRef(false);
  const pendingRef = useRef(false); 

  // Keeps the ref current. Declared first so it runs before the send effects below.
  useEffect(() => {
    latestRef.current = { questionId, position, total, answeredCount };
  }, [questionId, position, total, answeredCount]);

  // Sends the newest state once. If a send is already running, it asks for one more send afterwards.
  const send = useCallback(async () => {
    if (!sessionId || !enabled) return; 
    if (inFlightRef.current) {
      pendingRef.current = true; 
      return;
    }
    inFlightRef.current = true; 
    try {
      const latest = latestRef.current; 
      await reportLiveState(sessionId, {
        currentQuestionId: latest.questionId,
        currentPosition: latest.position,
        totalQuestions: latest.total,
        answeredCount: latest.answeredCount,
        isFocused: document.visibilityState === "visible" && document.hasFocus(), // checked at send time
      });
    } finally {
      inFlightRef.current = false; 
    }
    if (pendingRef.current) {
      pendingRef.current = false; 
      void send(); 
    }
  }, [sessionId, enabled]);

  // 1. Heartbeat: a repeating timer that runs whether or not the student is typing.
  useEffect(() => {
    if (!sessionId || !enabled) return; 
    let stopped = false; 
    let timerId: ReturnType<typeof setTimeout> | undefined; 
    const scheduleNext = () => {
      const delay = HEARTBEAT_MS + Math.floor(Math.random() * JITTER_MS);
      timerId = setTimeout(async () => {
        await send(); 
        if (!stopped) scheduleNext(); 
      }, delay);
    };
    scheduleNext(); 
    return () => {
      stopped = true; 
      if (timerId) clearTimeout(timerId); 
    };
  }, [sessionId, enabled, send]);

  // 2. Changes: report soon after the question, position, or answered count changes. Also covers the very first report.
  useEffect(() => {
    if (!sessionId || !enabled) return;
    const timerId = setTimeout(() => void send(), CHANGE_DEBOUNCE_MS); 
    return () => clearTimeout(timerId); 
  }, [sessionId, enabled, questionId, position, total, answeredCount, send]);

  // 3. Focus: report quickly when the exam window goes behind or comes back to the front.
  useEffect(() => {
    if (!sessionId || !enabled) return;
    let timerId: ReturnType<typeof setTimeout> | undefined;
    const onFocusChange = () => {
      if (timerId) clearTimeout(timerId); 
      timerId = setTimeout(() => void send(), FOCUS_DEBOUNCE_MS); 
    };
    window.addEventListener("blur", onFocusChange); 
    window.addEventListener("focus", onFocusChange); 
    document.addEventListener("visibilitychange", onFocusChange);
    return () => {
      if (timerId) clearTimeout(timerId);
      window.removeEventListener("blur", onFocusChange); 
      window.removeEventListener("focus", onFocusChange);
      document.removeEventListener("visibilitychange", onFocusChange);
    };
  }, [sessionId, enabled, send]);
}