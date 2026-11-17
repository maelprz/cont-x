import { useExamSessionStore } from '../stores/useExamSessionStore';
export interface VisibleTestCase {
  id: string;
  input: string;
  expected_output: string;
  time_limit_ms: number;
}

// One result row for a single test case run
export interface TestCaseResult {
  testCaseId: string;
  passed: boolean;
  actualOutput: string;
  executionTimeMs: number | null;
  timedOut: boolean;
}

// Shape returned from either Run Tests or Run Code
export interface RunOutcome {
  compileError: string | null;
  results: TestCaseResult[];
}


function localAttempt(sessionId?: string) {
  const exam = useExamSessionStore.getState().offlineExam;
  if (!exam?.gradingMaterial || (sessionId && exam.sessionId !== sessionId)) {
    throw new Error('The local grading package is unavailable. Download the exam again.');
  }
  return { studentId: exam.studentId, sessionId: exam.sessionId };
}

export async function runVisibleTests(
  questionId: string, code: string, _programType: 'cFunction' | 'cProgram',
  _mainCode: string | undefined, _pooled = false, _cachedTests?: VisibleTestCase[],
): Promise<RunOutcome> {
  return window.ipcRenderer.runLocalCode(localAttempt(), questionId, code, true);
}

export async function runAllTestsAndScore(
  sessionId: string, questionId: string, code: string, _programType: 'cFunction' | 'cProgram',
  _mainCode: string | undefined, _maxPoints: number, _checkPenaltyPerAttempt: number, _pooled = false,
): Promise<RunOutcome> {
  return window.ipcRenderer.runLocalCode(localAttempt(sessionId), questionId, code, false);
}
