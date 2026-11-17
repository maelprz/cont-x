import { ipcMain, type BrowserWindow } from 'electron';
import { compileSource, runBinary, cleanupDir } from '../compiler/compilerService';
import { dirname } from 'path';

interface TestCasePayload {
  id: string;
  input: string;
  expectedOutput: string;
  timeLimitMs: number;
}

export interface RunTestCasesPayload {
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

export function registerCompilerHandlers(getWindow: () => BrowserWindow | null) {
  ipcMain.handle('run-test-cases', async (event, payload: RunTestCasesPayload) => {
    const window = getWindow();
    if (!window || event.senderFrame !== window.webContents.mainFrame) {
      throw new Error('Compilation is only available from the exam window.');
    }
    if (!payload || typeof payload.code !== 'string' ||
        !['cFunction', 'cProgram'].includes(payload.programType) ||
        (payload.mainCode !== undefined && typeof payload.mainCode !== 'string') ||
        !Array.isArray(payload.testCases) || payload.testCases.some((test) =>
          !test || typeof test.id !== 'string' || typeof test.input !== 'string' ||
          typeof test.expectedOutput !== 'string' || !Number.isFinite(test.timeLimitMs) || test.timeLimitMs <= 0)) {
      throw new Error('Invalid compilation request.');
    }
    return executeTestCases(payload);
  });
}

export async function executeTestCases(payload: RunTestCasesPayload) {
    const source = buildSource(payload.code, payload.programType, payload.mainCode);
    const compileResult = compileSource(source);

    if (!compileResult.success || !compileResult.binaryPath) {
      return { compileError: compileResult.stderr, results: [] };
    }

    try {
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

    return { compileError: null, results };
    } finally { cleanupDir(dirname(compileResult.binaryPath)); }
}
