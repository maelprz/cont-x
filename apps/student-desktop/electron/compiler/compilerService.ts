import { spawn, spawnSync } from 'child_process';
import { writeFileSync, mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Path to the bundled MinGW compiler
// Adjust this to match wherever MinGW gets placed by the installer
const GCC_PATH = join(
  process.env.APP_ROOT ?? '',
  'electron',
  'native',
  'mingw',
  'bin',
  'gcc.exe'
);

// Result of compiling source code
export interface CompileResult {
  success: boolean;        // true if compiled with no errors
  binaryPath?: string;     // path to compiled exe, only if success
  stderr: string;          // compiler warnings or errors
}

// Result of running a compiled binary once
export interface RunResult {
  stdout: string;          // what the program printed
  stderr: string;          // any runtime errors
  timedOut: boolean;       // true if the program was killed for running too long
  exitCode: number | null; // process exit code
}

// Compiles a single C source string into a binary
// Enforces C11 with all warnings treated as errors
export function compileSource(sourceCode: string): CompileResult {
  // Make a fresh temp folder so concurrent runs never collide
  const workDir = mkdtempSync(join(tmpdir(), 'contx-'));
  const sourcePath = join(workDir, 'submission.c');
  const binaryPath = join(workDir, 'submission.exe');

  // Write the student's combined source code to disk
  writeFileSync(sourcePath, sourceCode, 'utf-8');

  // Run gcc synchronously since compiling is fast and blocking is fine here
  const proc = spawnSync(
    GCC_PATH,
    ['-std=c11', '-Wall', '-Werror', sourcePath, '-o', binaryPath],
    { encoding: 'utf-8' }
  );

  if (proc.status !== 0) {
    // Non-zero exit means compile error or warning treated as error
    cleanupDir(workDir);
    return { success: false, stderr: proc.stderr ?? '' };
  }

  return { success: true, binaryPath, stderr: proc.stderr ?? '' };
}

// Runs a compiled binary, feeding it stdin, with a hard timeout
export function runBinary(
  binaryPath: string,
  stdinInput: string,
  timeoutMs: number
): Promise<RunResult> {
  return new Promise((resolve) => {
    const child = spawn(binaryPath);
    let stdout = '';
    let stderr = '';
    let timedOut = false;

    // Kill the process if it runs past the allowed time limit
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, timeoutMs);

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    // Send the test case input, then close stdin
    child.stdin.write(stdinInput);
    child.stdin.end();

    child.on('close', (exitCode) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, timedOut, exitCode });
    });
  });
}

// Deletes the temp folder for a finished compile or run
export function cleanupDir(workDir: string) {
  rmSync(workDir, { recursive: true, force: true });
}