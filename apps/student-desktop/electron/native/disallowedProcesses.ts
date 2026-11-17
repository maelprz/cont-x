import { execFile } from "node:child_process";
import { join } from "node:path";
import { promisify } from "node:util";
import { autoCloseDisallowedApps, temporarilyExemptApps } from "../../shared/examAppPolicy";

const execFileAsync = promisify(execFile);

// Match main executable names from the Windows process list, including .exe.
// Shared runtimes and helper processes do not identify a specific app.
const disallowedExecutables = new Map<string, string>(([
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
] as const).filter(([, appName]) => !temporarilyExemptApps.has(appName)));

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

// Preflight needs Windows process handles so it can ask windows to close
// normally and distinguish products that share the ChatGPT.exe filename.
export async function checkExamApps(
  signal: AbortSignal,
  approvedApps: readonly string[] = [],
  protectDevLauncher = false,
): Promise<string[]> {
  if (process.platform !== "win32") return [];

  const systemRoot = process.env.SystemRoot;
  if (!systemRoot) throw new Error("Windows system directory is unavailable.");

  const executableNames = [...disallowedExecutables.keys()];
  const approvedExecutables = autoCloseDisallowedApps ? [...disallowedExecutables]
    .filter(([, appName]) => approvedApps.includes(appName))
    .map(([name]) => name) : [];
  // Both lists contain only literals from the executable map.
  const quoteNames = (names: string[]) => names.map((name) => `'${name}'`).join(", ");
  const script = `
    $ErrorActionPreference = 'Stop'
    $examProcess = Get-Process -Id ${process.pid}
    $session = $examProcess.SessionId
    $disallowed = @(${quoteNames(executableNames)})
    $approved = @(${quoteNames(approvedExecutables)})
    $protectedIds = [System.Collections.Generic.HashSet[int]]::new()
    $null = $protectedIds.Add($examProcess.Id)

    # Closing an IDE or terminal that launched Vite can stop the exam app too.
    if (${protectDevLauncher ? "$true" : "$false"}) {
      $processesById = @{}
      foreach ($entry in (Get-CimInstance -ClassName Win32_Process)) {
        $processesById[[int]$entry.ProcessId] = $entry
      }
      $child = $processesById[$examProcess.Id]
      while ($null -ne $child) {
        $parent = $processesById[[int]$child.ParentProcessId]
        # A newer process with the same PID is unrelated to this launch.
        if ($null -eq $parent -or $parent.CreationDate -gt $child.CreationDate) { break }
        if (-not $protectedIds.Add([int]$parent.ProcessId)) { break }
        $child = $parent
      }
    }

    function Get-ExamProcesses {
      foreach ($candidate in (Get-Process)) {
        try {
          $name = $candidate.ProcessName + '.exe'
          if ($disallowed -notcontains $name) { continue }
          if ($protectedIds.Contains($candidate.Id) -or $candidate.SessionId -ne $session) { continue }
          # Electron helpers share the executable of the main process.
          if ($candidate.ProcessName -eq $examProcess.ProcessName) {
            $candidatePath = $candidate.Path
            if (-not $candidatePath -or $candidatePath -eq $examProcess.Path) { continue }
          }
        } catch [System.InvalidOperationException] {
          continue
        }
        if ($name -eq 'chatgpt.exe') {
          try {
            $productName = $candidate.MainModule.FileVersionInfo.ProductName
            if ($productName -eq 'Codex') { continue }
          } catch {
            $productName = $null
          }
          # Keep the match visible when we can't verify the shared executable name.
          [pscustomobject]@{ Name = $name; CanClose = ($productName -eq 'ChatGPT'); Process = $candidate }
          continue
        }
        [pscustomobject]@{ Name = $name; CanClose = $true; Process = $candidate }
      }
    }

    if ($approved.Count -gt 0) {
      foreach ($match in (Get-ExamProcesses)) {
        if ($match.CanClose -and $approved -contains $match.Name) {
          try {
            if (-not $match.Process.HasExited) { $null = $match.Process.CloseMainWindow() }
          } catch {
            # A vanished or inaccessible process is handled by the fresh scan.
          }
        }
      }
      Start-Sleep -Milliseconds 800

      # Rescan before force-quitting so tray apps get the same protections.
      $requestedTermination = $false
      foreach ($match in (Get-ExamProcesses)) {
        if ($match.CanClose -and $approved -contains $match.Name) {
          try {
            if (-not $match.Process.HasExited) {
              $match.Process.Kill()
              $requestedTermination = $true
            }
          } catch {
            # Apps that cannot be terminated stay listed in the final scan.
          }
        }
      }
      if ($requestedTermination) { Start-Sleep -Milliseconds 300 }
    }

    $remaining = @(Get-ExamProcesses | ForEach-Object { $_.Name } | Sort-Object -Unique)
    ConvertTo-Json -InputObject $remaining -Compress
  `;
  const { stdout } = await execFileAsync(
    join(systemRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe"),
    ["-NoProfile", "-NonInteractive", "-EncodedCommand", Buffer.from(script, "utf16le").toString("base64")],
    { windowsHide: true, timeout: 8_000, signal },
  );
  const apps = new Set<string>();
  for (const name of JSON.parse(stdout) as string[]) {
    const appName = matchDisallowedExecutable(name);
    if (appName) apps.add(appName);
  }
  return [...apps].sort();
}
