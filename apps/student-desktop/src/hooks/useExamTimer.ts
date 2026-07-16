import { useEffect, useRef, useState } from "react"; // tracks countdown state and the interval handle
import { getSessionTimerInfo } from "../services/examService"; // real duration + start time fetch

// Runs a real countdown for one exam session. Computes remaining time
// from the actual start timestamp, so refreshing the page doesn't reset it.
export function useExamTimer(
  sessionId: string | null, // which session to time
  onExpire: () => void, // called once, exactly when time hits zero
): number | null {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null); // null while still loading
  const hasExpiredRef = useRef(false); // guards against calling onExpire more than once

  // FIX — always holds the *latest* onExpire, so the interval below never
  // calls a stale version closed over from the first render (which would
  // otherwise submit whatever answers existed when the timer first started,
  // i.e. none, instead of the student's real current answers).
  const onExpireRef = useRef(onExpire);
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    if (!sessionId) return; // nothing to time yet

    let isMounted = true; // guards against setting state after unmount
    let intervalId: ReturnType<typeof setInterval> | undefined;

    async function startTimer() {
      try {
        const info = await getSessionTimerInfo(sessionId!); // real duration + start time
        const totalSeconds = info.durationMinutes * 60; // convert minutes to seconds
        const joinedAtMs = new Date(info.joinedAt).getTime(); // when the session actually began
        const elapsedSeconds = Math.max(Math.floor((Date.now() - joinedAtMs) / 1000), 0); // never let clock skew make this negative
        const remaining = Math.max(totalSeconds - elapsedSeconds, 0); // never show negative time

        if (!isMounted) return;
        setSecondsLeft(remaining);

        // Ticks down every second, based on real elapsed time, not just a counter.
        intervalId = setInterval(() => {
          setSecondsLeft((prev) => {
            if (prev === null) return prev; // still loading, do nothing yet
            if (prev <= 1) {
              if (intervalId) clearInterval(intervalId); // stop ticking once we hit zero
              if (!hasExpiredRef.current) {
                hasExpiredRef.current = true; // only fire the callback once
                onExpireRef.current(); // FIX — always the latest onExpire, never stale
              }
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } catch (err) {
        console.error('useExamTimer failed to load session timer info:', err); // real error, not swallowed
        if (isMounted) setSecondsLeft(0); // fail safe: treat errors as time already up
      }
    }

    startTimer();

    return () => {
      isMounted = false; // cleanup if the screen unmounts
      if (intervalId) clearInterval(intervalId);
    };
  }, [sessionId]);

  return secondsLeft;
}