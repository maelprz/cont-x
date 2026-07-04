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
  programType: 'function' | 'program';
  mainCode?: string;
  testCases: TestCasePayload[];
}

// Builds the final source string to compile
// For function type, student code is combined with the hidden main
function buildSource(
  code: string,
  programType: 'function' | 'program',
  mainCode?: string
): string {
  if (programType === 'program') {
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

      // Exact match comparison, per your grading rule
      const passed =
        !runResult.timedOut &&
        runResult.exitCode === 0 &&
        runResult.stdout === testCase.expectedOutput;

      results.push({
        testCaseId: testCase.id,
        passed,
        actualOutput: runResult.stdout,
        executionTimeMs: null, // add real timing later if needed
        timedOut: runResult.timedOut,
      });
    }

    cleanupDir(dirname(compileResult.binaryPath));
    return { compileError: null, results };
  });
}