import { spawn, spawnSync } from 'child_process';
import { writeFileSync, mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Where MinGW's gcc lives on this machine.
// Can be overridden with an env var so install location isn't hardcoded.
const GCC_PATH = process.env.GCC_PATH ?? 'gcc';

// Result of trying to compile a source file.
export interface CompileResult {
  success: boolean; // true if it compiled with no errors
  binaryPath?: string; // path to the compiled exe, only if success
  stderr: string; // compiler warnings or errors
}

// Result of running a compiled binary once.
export interface RunResult {
  stdout: string; // whatever the program printed
  stderr: string; // any runtime errors
  timedOut: boolean; // true if we killed it for running too long
  exitCode: number | null; // process exit code
}

// Compiles one C source string into a binary in a fresh temp folder.
// Same flags as the desktop compiler, so behavior stays consistent.
export function compileSource(sourceCode: string, workDir: string): CompileResult {
  const sourcePath = join(workDir, 'submission.c'); // where the source file goes
  const binaryPath = join(workDir, 'submission.exe'); // where the compiled output goes

  // Write the assembled source code to disk before compiling.
  writeFileSync(sourcePath, sourceCode, 'utf-8');

  // Run gcc and wait for it to finish before continuing.
  const proc = spawnSync(
    GCC_PATH,
    ['-std=c11', '-Wall', '-Werror', sourcePath, '-o', binaryPath],
    { encoding: 'utf-8' },
  );

  if (proc.status !== 0) {
    // Non-zero exit means a compile error or a warning treated as one.
    return { success: false, stderr: proc.stderr ?? '' };
  }

  return { success: true, binaryPath, stderr: proc.stderr ?? '' };
}

// Runs a compiled binary once, feeding it stdin, with a hard timeout.
export function runBinary(
  binaryPath: string, // path to the compiled program
  stdinInput: string, // the test case's input, piped in as stdin
  timeoutMs: number, // how long to wait before killing it
): Promise<RunResult> {
  return new Promise((resolve) => {
    const child = spawn(binaryPath); // start the compiled program
    let stdout = ''; // collects everything the program prints
    let stderr = ''; // collects any error output
    let timedOut = false; // flips true if we have to kill it

    // Kill the process if it runs past the allowed time.
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, timeoutMs);

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString(); // append each printed chunk
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString(); // append each error chunk
    });

    // Send the test case's input, then close stdin like a real run.
    child.stdin.write(stdinInput);
    child.stdin.end();

    child.on('close', (exitCode) => {
      clearTimeout(timer); // stop the timeout timer, run finished on its own
      resolve({ stdout, stderr, timedOut, exitCode });
    });
  });
}

// Creates a fresh, isolated temp folder for one validation request.
export function makeWorkDir(): string {
  return mkdtempSync(join(tmpdir(), 'contx-validate-')); // unique folder per run
}

// Deletes a temp folder once a validation request is done with it.
export function cleanupDir(workDir: string): void {
  rmSync(workDir, { recursive: true, force: true });
}