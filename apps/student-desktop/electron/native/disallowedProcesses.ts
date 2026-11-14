import { execFile } from "node:child_process";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// Match main executable names from the Windows process list, including .exe.
// Shared runtimes and helper processes do not identify a specific app.
const disallowedExecutables = new Map([
  ["chrome.exe", "Chrome"],
  ["msedge.exe", "Edge"],
  ["opera.exe", "Opera"],
  ["discord.exe", "Discord"],
  ["ms-teams.exe", "Teams"],
  ["teams.exe", "Teams"],
  ["chatgpt.exe", "ChatGPT"],
  ["copilot.exe", "Copilot"],
  ["copilotapp.exe", "Copilot"],
  ["claude.exe", "Claude"],
  ["code.exe", "VS Code"],
  ["notepad.exe", "Notepad"],
  ["notepad++.exe", "Notepad++"],
  ["obs64.exe", "OBS Studio"],
  ["obs32.exe", "OBS Studio"],
]);

export function matchDisallowedExecutable(executableName: string): string | undefined {
  return disallowedExecutables.get(executableName.toLowerCase());
}

export interface DisallowedProcess {
  appName: string;
  executableName: string;
}

export async function scanDisallowedProcesses(signal?: AbortSignal): Promise<DisallowedProcess[]> {
  if (process.platform !== "win32") return [];

  const systemRoot = process.env.SystemRoot;
  if (!systemRoot) throw new Error("Windows system directory is unavailable.");

  const { stdout } = await execFileAsync(
    join(systemRoot, "System32", "tasklist.exe"),
    ["/FO", "CSV", "/NH"],
    { windowsHide: true, timeout: 5_000, signal },
  );

  // Tasklist CSV starts with image name, PID, session name, and session number.
  const processes = Array.from(
    stdout.matchAll(/^"([^"]+)","(\d+)","[^"]*","(\d+)",/gm),
    ([, executableName, pid, sessionId]) => ({
      executableName: executableName.toLowerCase(),
      pid: Number(pid),
      sessionId,
    }),
  );
  const currentSession = processes.find(({ pid }) => pid === process.pid)?.sessionId;
  if (currentSession === undefined) {
    throw new Error("Could not identify the current Windows session.");
  }

  const matches = new Map<string, DisallowedProcess>();
  for (const { executableName, sessionId } of processes) {
    if (sessionId !== currentSession) continue;
    const appName = matchDisallowedExecutable(executableName);
    if (appName && !matches.has(appName)) {
      matches.set(appName, { appName, executableName });
    }
  }
  return [...matches.values()];
}
