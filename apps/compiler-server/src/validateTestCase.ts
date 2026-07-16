import { compileSource, runBinary, makeWorkDir, cleanupDir } from './compiler';

// What the browser sends us for one test case validation.
export interface ValidateTestCaseRequest {
  programType: 'cProgram' | 'cFunction'; // which question format this is
  referenceSolution: string; // teacher's complete program, or completed function
  mainCode?: string; // hidden main, only present for cFunction
  input: string; // this test case's input, piped to stdin
  expectedOutput: string; // what the output should match
  timeLimitMs: number; // test_cases.time_limit_ms, how long to allow
}

// What we send back after compiling and running one test case.
export interface ValidateTestCaseResponse {
  passed: boolean; // true only if it compiled, ran, and output matched
  actualOutput: string; // what the program actually printed
  compileError: string | null; // set only if compilation failed
  runtimeError: string | null; // set only if the program crashed or errored
  timedOut: boolean; // true if the program was killed for taking too long
}

// Puts the function code above main so main can call it
// without needing a separate forward declaration.
function assembleSource(request: ValidateTestCaseRequest): string {
  if (request.programType === 'cProgram') {
    return request.referenceSolution; // already a complete program
  }

  // cFunction: function definition first, then the hidden main below it.
  return `${request.referenceSolution}\n\n${request.mainCode ?? ''}`;
}

// Compiles the assembled source once, runs it with this test case's
// input, and compares the output. Always cleans up its temp files.
export async function validateTestCase(
  request: ValidateTestCaseRequest,
): Promise<ValidateTestCaseResponse> {
  const workDir = makeWorkDir(); // fresh folder so concurrent requests never collide

  try {
    const source = assembleSource(request); // build the final source to compile
    const compileResult = compileSource(source, workDir);

    if (!compileResult.success) {
      // Compilation failed, so there is nothing to run.
      return {
        passed: false,
        actualOutput: '',
        compileError: compileResult.stderr,
        runtimeError: null,
        timedOut: false,
      };
    }

    const runResult = await runBinary(
      compileResult.binaryPath!, // safe, we already checked success above
      request.input,
      request.timeLimitMs,
    );

    // Trim both sides so a trailing newline doesn't cause a false failure.
    const actualTrimmed = runResult.stdout.trim();
    const expectedTrimmed = request.expectedOutput.trim();

    const passed =
      !runResult.timedOut && // must not have been killed for running too long
      runResult.exitCode === 0 && // must have exited cleanly
      actualTrimmed === expectedTrimmed; // output must match exactly, ignoring edges

    return {
      passed,
      actualOutput: runResult.stdout,
      compileError: null,
      runtimeError: runResult.stderr || null,
      timedOut: runResult.timedOut,
    };
  } finally {
    cleanupDir(workDir); // always clean up, whether it passed, failed, or crashed
  }
}