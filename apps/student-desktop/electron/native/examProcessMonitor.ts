import { scanDisallowedProcesses } from "./disallowedProcesses";
import type { DisallowedProcess } from "./disallowedProcesses";

const scanIntervalMs = 3_000;

export function startExamProcessMonitor(
  onDetection: (match: DisallowedProcess) => void,
): () => void {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let previousApps = new Set<string>();
  let scanFailed = false;

  async function poll() {
    try {
      const matches = await scanDisallowedProcesses(controller.signal);
      if (controller.signal.aborted) return;

      for (const match of matches) {
        if (!previousApps.has(match.appName)) onDetection(match);
      }
      previousApps = new Set(matches.map(({ appName }) => appName));
      scanFailed = false;
    } catch (error) {
      // Preserve the last successful snapshot so a failed scan doesn't
      // count as every app closing.
      if (!controller.signal.aborted && !scanFailed) {
        console.warn("[exam process monitor] Scan failed:", error);
        scanFailed = true;
      }
    } finally {
      if (!controller.signal.aborted) timer = setTimeout(poll, scanIntervalMs);
    }
  }

  void poll();
  return () => {
    controller.abort();
    clearTimeout(timer);
  };
}
