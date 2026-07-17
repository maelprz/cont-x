import { ipcMain } from 'electron';
import { compileSource, runBinary, cleanupDir } from '../compiler/compilerService';
import { dirname } from 'path';

// Shape of a single test case coming from the renderer
interface TestCasePayload {
  id: string;
  input: string;
  expectedOutput: string;
  timeLimitMs: number;
}

// Payload sent for either Run Tests or Run Code
// The only difference is which test cases the renderer includes
interface RunTestCasesPayload {
  code: string;
  programType: 'cFunction' | 'cProgram'; // CHANGED — matches compiler-server naming now
  mainCode?: string;
  testCases: TestCasePayload[];
}

// Builds the final source string to compile
// For function type, student code is combined with the hidden main
function buildSource(
  code: string,
  programType: 'cFunction' | 'cProgram',
  mainCode?: string
): string {
  if (programType === 'cProgram') {
    // Student already wrote their own main function
    return code;
  }
  // Function type, append hidden main below student's functions
  return `${code}\n\n${mainCode ?? ''}`;
}

// Registers the single compiler IPC channel
export function registerCompilerHandlers() {
  ipcMain.handle('run-test-cases', async (_event, payload: RunTestCasesPayload) => {
    const source = buildSource(payload.code, payload.programType, payload.mainCode);
    const compileResult = compileSource(source);

    if (!compileResult.success || !compileResult.binaryPath) {
      return { compileError: compileResult.stderr, results: [] };
    }

    // Run every given test case against the same compiled binary
    const results = [];
    for (const testCase of payload.testCases) {
      const runResult = await runBinary(
        compileResult.binaryPath,
        testCase.input,
        testCase.timeLimitMs
      );

      // CHANGED — trim both sides before comparing, matches compiler-server's
      // rule, so a trailing newline from printf doesn't cause a false FAIL
      const actualTrimmed = runResult.stdout.trim();
      const expectedTrimmed = testCase.expectedOutput.trim();

      const passed =
        !runResult.timedOut &&
        runResult.exitCode === 0 &&
        actualTrimmed === expectedTrimmed; // CHANGED — was exact stdout match

      results.push({
        testCaseId: testCase.id,
        passed,
        actualOutput: runResult.stdout,
        executionTimeMs: null,
        timedOut: runResult.timedOut,
      });
    }

    cleanupDir(dirname(compileResult.binaryPath));
    return { compileError: null, results };
  });
}