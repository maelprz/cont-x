import { useCallback, useEffect, useRef } from "react"; // refs keep the running totals without re-rendering every second

// Tracks how many seconds the student spends on each question (WBS 6.7).
// Time only counts while that question is on screen AND the window is focused and visible.
// Going back to a question adds to the same total. Nothing re-renders: the totals live in refs.
export function useQuestionTimeTracker(currentQuestionId: string | null) {
  const totalsMsRef = useRef<Record<string, number>>({}); // finished time per question id, in milliseconds
  const activeIdRef = useRef<string | null>(null); // the question currently being timed
  const segmentStartRef = useRef<number | null>(null); // when the running stretch began, null while paused

  // Stops the clock and adds the running stretch to that question's total.
  const pause = useCallback(() => {
    const id = activeIdRef.current;
    const start = segmentStartRef.current;
    if (id && start !== null) {
      totalsMsRef.current[id] = (totalsMsRef.current[id] ?? 0) + (Date.now() - start); // add the stretch that just ended
    }
    segmentStartRef.current = null; // clock is now stopped
  }, []);

  // Starts the clock, but only if a question is active and the window is in front.
  const resume = useCallback(() => {
    if (!activeIdRef.current || segmentStartRef.current !== null) return; // nothing to time, or already running
    if (document.visibilityState !== "visible" || !document.hasFocus()) return; // window not in front, stay paused
    segmentStartRef.current = Date.now(); // remember when this stretch began
  }, []);

  // When the student moves to another question, close out the old one and start timing the new one.
  useEffect(() => {
    pause(); // bank the time of the question we just left
    activeIdRef.current = currentQuestionId; // switch to the new question
    resume(); // start its clock if the window is focused
  }, [currentQuestionId, pause, resume]);

  // Pause when the window loses focus or is hidden, resume when it comes back.
  useEffect(() => {
    const onBlur = () => pause(); // window lost focus
    const onFocus = () => resume(); // window got focus back
    const onVisibility = () =>
      document.visibilityState === "visible" ? resume() : pause(); // hidden window stops the clock
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("blur", onBlur); // clean up listeners
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      pause(); // bank any running time when the screen goes away
    };
  }, [pause, resume]);

  // Returns whole seconds per question id, including the stretch that is running right now.
  const getTimes = useCallback((): Record<string, number> => {
    const result: Record<string, number> = { ...totalsMsRef.current }; // start from the banked totals
    const id = activeIdRef.current;
    const start = segmentStartRef.current;
    if (id && start !== null) {
      result[id] = (result[id] ?? 0) + (Date.now() - start); // include the running stretch
    }
    for (const key of Object.keys(result)) {
      result[key] = Math.round(result[key] / 1000); // milliseconds to whole seconds
    }
    return result;
  }, []);

  return { getTimes };
}