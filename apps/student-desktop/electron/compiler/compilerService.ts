import { app } from 'electron';
import { spawn, spawnSync } from 'child_process';
import { writeFileSync, mkdtempSync, rmSync } from 'fs';
import { join, dirname, delimiter } from 'path';
import { tmpdir } from 'os';
import { getRuntimePaths } from '../setup/runtimePaths';

export interface CompileResult {
  success: boolean;
  binaryPath?: string;
  stderr: string;
}

export interface RunResult {
  stdout: string;
  stderr: string;
  timedOut: boolean;
  exitCode: number | null;
}

const COMPILE_TIMEOUT_MS = 15_000;
const MAX_OUTPUT_BYTES = 1024 * 1024;

// Find the bundled compiler and expose its DLLs to child processes only.
function compilerEnvironment() {
  const { gcc } = getRuntimePaths(
    app.isPackaged,
    process.resourcesPath,
    process.env.APP_ROOT ?? app.getAppPath(),
  );

  return {
    gcc,
    env: {
      ...process.env,
      PATH: [dirname(gcc), process.env.PATH ?? ''].join(delimiter),
    },
  };
}

// Compile in a unique temporary directory without copying MinGW.
export function compileSource(sourceCode: string): CompileResult {
  const workDir = mkdtempSync(join(tmpdir(), 'contx-submission-'));
  const sourcePath = join(workDir, 'submission.c');
  const binaryPath = join(workDir, 'submission.exe');

  try {
    writeFileSync(sourcePath, sourceCode, 'utf-8');

    const { gcc, env } = compilerEnvironment();

    const proc = spawnSync(
      gcc,
      [
        '-std=c11',
        '-Wall',
        '-Werror',
        'submission.c',
        '-o',
        'submission.exe',
      ],
      {
        cwd: workDir,
        env,
        encoding: 'utf-8',
        windowsHide: true,
        timeout: COMPILE_TIMEOUT_MS,
        maxBuffer: MAX_OUTPUT_BYTES,
      },
    );

    if (proc.error || proc.status !== 0) {
      const diagnostics = [
        proc.error?.message,
        proc.stderr,
      ].filter(Boolean).join('\n');

      cleanupDir(workDir);

      return {
        success: false,
        stderr: diagnostics || 'Compilation failed.',
      };
    }

    // The caller cleans this directory after running its test cases.
    return {
      success: true,
      binaryPath,
      stderr: proc.stderr ?? '',
    };
  } catch (error) {
    cleanupDir(workDir);

    return {
      success: false,
      stderr: error instanceof Error ? error.message : String(error),
    };
  }
}

// Execute a compiled program with bounded output and a time limit.
export function runBinary(
  binaryPath: string,
  stdinInput: string,
  timeoutMs: number,
): Promise<RunResult> {
  return new Promise((resolve) => {
    const { env } = compilerEnvironment();

    const child = spawn(binaryPath, [], {
      cwd: dirname(binaryPath),
      env,
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';
    let outputBytes = 0;
    let timedOut = false;
    let outputLimited = false;
    let finished = false;

    // Use the supplied limit, or five seconds if it is invalid.
    const executionLimit =
      Number.isFinite(timeoutMs) &&
      timeoutMs > 0 &&
      timeoutMs <= 2_147_483_647
        ? Math.ceil(timeoutMs)
        : 5_000;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, executionLimit);

    const finish = (exitCode: number | null) => {
      if (finished) return;

      finished = true;
      clearTimeout(timer);

      resolve({
        stdout,
        stderr,
        timedOut,
        exitCode,
      });
    };

    const collectOutput = (chunk: Buffer, isError: boolean) => {
      if (outputLimited) return;

      outputBytes += chunk.length;

      if (outputBytes > MAX_OUTPUT_BYTES) {
        outputLimited = true;
        stderr += '\nProgram output exceeded the 1 MiB limit.';
        child.kill();
        return;
      }

      if (isError) {
        stderr += chunk.toString();
      } else {
        stdout += chunk.toString();
      }
    };

    child.stdout.on('data', (chunk: Buffer) => {
      collectOutput(chunk, false);
    });

    child.stderr.on('data', (chunk: Buffer) => {
      collectOutput(chunk, true);
    });

    // Missing executables or DLL-related launch failures must not crash Electron.
    child.once('error', (error) => {
      stderr += `\n${error.message}`;
      finish(null);
    });

    // A program may exit before it finishes reading its input.
    child.stdin.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code !== 'EPIPE') {
        stderr += `\n${error.message}`;
      }
    });

    child.once('close', (exitCode) => {
      finish(outputLimited ? null : exitCode);
    });

    child.stdin.end(stdinInput);
  });
}

// Remove a completed submission's temporary directory.
export function cleanupDir(workDir: string): void {
  rmSync(workDir, {
    recursive: true,
    force: true,
    maxRetries: 3,
    retryDelay: 100,
  });
}