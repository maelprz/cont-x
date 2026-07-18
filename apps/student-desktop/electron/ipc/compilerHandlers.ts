import { ipcMain } from 'electron';
import { compileSource, runBinary, cleanupDir } from '../compiler/compilerService';
import { dirname } from 'path';

interface TestCasePayload {
  id: string;
  input: string;
  expectedOutput: string;
  timeLimitMs: number;
}

interface RunTestCasesPayload {
  code: string;
  programType: 'cFunction' | 'cProgram';
  mainCode?: string;
  testCases: TestCasePayload[];
}

function buildSource(
  code: string,
  programType: 'cFunction' | 'cProgram',
  mainCode?: string
): string {
  if (programType === 'cProgram') {
    return code;
  }
  return `${code}\n\n${mainCode ?? ''}`;
}

export function registerCompilerHandlers() {
  ipcMain.handle('run-test-cases', async (_event, payload: RunTestCasesPayload) => {
    const source = buildSource(payload.code, payload.programType, payload.mainCode);
    const compileResult = compileSource(source);

    if (!compileResult.success || !compileResult.binaryPath) {
      return { compileError: compileResult.stderr, results: [] };
    }

    const results = [];
    for (const testCase of payload.testCases) {
      const runResult = await runBinary(
        compileResult.binaryPath,
        testCase.input,
        testCase.timeLimitMs
      );

      const actualTrimmed = runResult.stdout.trim();
      const expectedTrimmed = testCase.expectedOutput.trim();

      const passed =
        !runResult.timedOut &&
        runResult.exitCode === 0 &&
        actualTrimmed === expectedTrimmed;

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