import { useCallback, useEffect, useRef } from "react"; // refs keep the buffer without re-rendering
import {
  insertMovementEvents,
  type BufferedMovementEvent,
} from "../services/movementEventService"; // does the actual database write

const MAX_BUFFER = 200; // never hold more than this many events in memory
const BATCH_SIZE = 50; // events sent per request
const FLUSH_DELAY_MS = 1500; // wait a moment after an event so quick actions travel together
const RETRY_INTERVAL_MS = 10000; // while events are waiting, try again this often

interface Options {
  sessionId: string | null; // the running attempt
  enabled: boolean; // false while loading, after removal, or when there is nothing to report
  questionId: string | null; // real question id, null for pooled questions
  position: number | null; // 1-based place in this student's own order
}

// true when the exam window is in front of everything else
function isWindowFocused(): boolean {
  return document.visibilityState === "visible" && document.hasFocus();
}

// Records what the student does (WBS 7.7): moving between questions, and the window losing or regaining focus.
// Events wait in a small in-memory buffer and are sent in batches. If the network drops they stay in the buffer
// and are sent when it returns, so the history has no holes. The exam itself is never blocked by any of this.
export function useMovementEvents({ sessionId, enabled, questionId, position }: Options) {
  const bufferRef = useRef<BufferedMovementEvent[]>([]); // events waiting to be sent, oldest first
  const flushPromiseRef = useRef<Promise<void> | null>(null); // the send that is running right now, if any
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined); // pending "send soon" timer
  const latestRef = useRef({ questionId, position }); // newest question info, read when an event happens
  const previousRef = useRef<{ questionId: string | null; position: number | null } | null>(null); // where the student was before
  const focusedRef = useRef<boolean>(true); // last known focus state, so only real changes become events

  // keeps the newest question info available to the listeners below
  useEffect(() => {
    latestRef.current = { questionId, position };
  }, [questionId, position]);

  // Sends everything in the buffer, batch by batch. Joins the running send instead of starting a second one.
  const flush = useCallback((): Promise<void> => {
    if (flushPromiseRef.current) return flushPromiseRef.current; // already sending, share that promise
    if (!sessionId || !enabled) return Promise.resolve(); // nothing to do
    const run = (async () => {
      while (bufferRef.current.length > 0) {
        const batch = bufferRef.current.slice(0, BATCH_SIZE); // oldest events first
        const result = await insertMovementEvents(sessionId, batch);
        if (result === "retry") break; // keep them, the retry timer or the next event will try again
        bufferRef.current = bufferRef.current.filter((e) => !batch.includes(e)); // saved or refused: remove exactly these
      }
    })().finally(() => {
      flushPromiseRef.current = null; // allow the next send
    });
    flushPromiseRef.current = run;
    return run;
  }, [sessionId, enabled]);

  // Adds one event to the buffer and schedules a send shortly after.
  const enqueue = useCallback(
    (event: Omit<BufferedMovementEvent, "at">) => {
      bufferRef.current.push({ ...event, at: Date.now() }); // remember when it happened here
      if (bufferRef.current.length > MAX_BUFFER) bufferRef.current.shift(); // a very long outage drops the oldest event
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current); // restart the short wait
      flushTimerRef.current = setTimeout(() => void flush(), FLUSH_DELAY_MS);
    },
    [flush],
  );

  // 1. Question navigation: an event whenever the student's position changes.
  useEffect(() => {
    if (!enabled || position === null) return; // not ready, or nothing loaded
    const previous = previousRef.current;
    previousRef.current = { questionId, position }; // remember this spot for next time
    if (previous === null) return; // the very first question is not a move
    if (previous.position === position) return; // same question, nothing to record
    enqueue({
      eventType: "question_navigated",
      fromQuestionId: previous.questionId, // null for pooled questions
      toQuestionId: questionId, // null for pooled questions
      meta: { from_position: previous.position, to_position: position }, // positions work for every question type
    });
  }, [enabled, questionId, position, enqueue]);

  // 2. Window focus: an event only when the state really changes (blur and visibilitychange often fire together).
  useEffect(() => {
    if (!enabled) return;
    focusedRef.current = isWindowFocused(); // starting state, not an event
    const onChange = () => {
      const nowFocused = isWindowFocused();
      if (nowFocused === focusedRef.current) return; // nothing actually changed
      focusedRef.current = nowFocused;
      enqueue({
        eventType: nowFocused ? "focus_gained" : "focus_lost",
        fromQuestionId: latestRef.current.questionId, // the question that was on screen
        toQuestionId: null,
        meta: { position: latestRef.current.position },
      });
    };
    window.addEventListener("blur", onChange); // window lost focus
    window.addEventListener("focus", onChange); // window got focus back
    document.addEventListener("visibilitychange", onChange); // window hidden or shown
    return () => {
      window.removeEventListener("blur", onChange); // clean up listeners
      window.removeEventListener("focus", onChange);
      document.removeEventListener("visibilitychange", onChange);
    };
  }, [enabled, enqueue]);

  // 3. Retry: while events are waiting, try again on a timer and the moment the network returns.
  useEffect(() => {
    if (!sessionId || !enabled) return;
    const intervalId = setInterval(() => {
      if (bufferRef.current.length > 0) void flush(); // only bother when something is waiting
    }, RETRY_INTERVAL_MS);
    const onOnline = () => void flush(); // the browser says the network is back
    window.addEventListener("online", onOnline);
    return () => {
      clearInterval(intervalId);
      window.removeEventListener("online", onOnline);
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current); // cancel any pending send
    };
  }, [sessionId, enabled, flush]);

  // Sends what is waiting and returns, but never waits longer than timeoutMs. Call this just before submitting,
  // because the database only accepts events while the attempt is still in progress.
  const flushNow = useCallback(
    async (timeoutMs = 1500): Promise<void> => {
      await Promise.race([flush(), new Promise<void>((resolve) => setTimeout(resolve, timeoutMs))]);
    },
    [flush],
  );

  return { flushNow };
}