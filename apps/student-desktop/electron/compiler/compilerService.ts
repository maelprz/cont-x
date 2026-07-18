import { spawn, spawnSync } from 'child_process';
import { writeFileSync, mkdtempSync, rmSync, existsSync, cpSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

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

// Where we keep a space-free copy of the whole mingw folder, once made.
// os.tmpdir() (e.g. C:\Users\Mel\AppData\Local\Temp) has no spaces in it
// on a normal Windows install, unlike the project folder itself.
const MINGW_COPY_DIR = join(tmpdir(), 'contx-mingw-copy');

// Makes sure a space-free copy of the mingw folder exists, copying it
// from the real (possibly space-containing) project path only once.
// ld.exe internally recomputes its own install prefix from how it was
// invoked, and chokes on spaces in that path — this sidesteps the
// problem entirely instead of trying to shorten the original path.
function ensureMingwCopy(): string {
  const gccInCopy = join(MINGW_COPY_DIR, 'bin', 'gcc.exe');

  if (existsSync(gccInCopy)) {
    return gccInCopy; // already copied in a previous run, reuse it
  }

  const realMingwDir = join(
    process.env.APP_ROOT ?? '',
    'electron',
    'native',
    'mingw'
  );

  cpSync(realMingwDir, MINGW_COPY_DIR, { recursive: true }); // one-time copy
  return gccInCopy;
}

// Compiles a single C source string into a binary
// Enforces C11 with all warnings treated as errors
export function compileSource(sourceCode: string): CompileResult {
  const workDir = mkdtempSync(join(tmpdir(), 'contx-'));
  const sourcePath = join(workDir, 'submission.c');
  const binaryPath = join(workDir, 'submission.exe');

  writeFileSync(sourcePath, sourceCode, 'utf-8');

  const gccPath = ensureMingwCopy(); // space-free path, guaranteed

  const proc = spawnSync(
    gccPath,
    ['-std=c11', '-Wall', '-Werror', sourcePath, '-o', binaryPath],
    { encoding: 'utf-8' }
  );

  if (proc.status !== 0) {
    cleanupDir(workDir);
    return { success: false, stderr: proc.stderr ?? proc.error?.message ?? '' };
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