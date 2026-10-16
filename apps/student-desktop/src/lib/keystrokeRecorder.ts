const MODIFIER_CODES = new Set([
  "ControlLeft",
  "ControlRight",
  "ShiftLeft",
  "ShiftRight",
  "AltLeft",
  "AltRight",
  "MetaLeft", //Windows key
  "MetaRight", //Windows key
]);

export function createKeystrokeRecorder(startedAt: number) {
  let tokens: string[] = []; //encoded events waiting to be sent.
  let lastAt = startedAt; //exam start time

  return {
    record(code: string, isDown: boolean, isRepeat: boolean): void {
      if (isRepeat) return; //ignore repeated events
      if (!isDown && !MODIFIER_CODES.has(code)) return; //ignore keyup events for non-modifiers
      const now = performance.now();
      const gap = Math.round(now - lastAt); //milliseconds since last event
      lastAt = now;
      tokens.push(`${gap}:${code}`);
      lastAt = now;
    },

    drain(): string | null {
      if (tokens.length === 0) return null;
      const batch = tokens.join(","); //whole batch of events, comma-separated
      tokens = []; //clear the queue
      lastAt = startedAt; //reset the last event time to the exam start time
      return batch;
    },
  };
}
