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
  sessionId: string,
  questionId: string,
  code: string,
  programType: 'cFunction' | 'cProgram',
  mainCode: string | undefined,
  maxPoints: number,
  checkPenaltyPerAttempt: number,
  pooled = false, // true when questionId is a pooled question's draw id
  offlineRun?: { id: string; occurredAt: string },
): Promise<RunOutcome> {
  const answerId = await ensureAnswerRow(sessionId, questionId, pooled); // real row, created on first click if needed

  const testCases = await loadTestCases(questionId, pooled, false);

  const outcome: RunOutcome = await window.ipcRenderer.invoke('run-test-cases', {
    code,
    programType,
    mainCode,
    testCases: testCases.map((t) => ({
      id: t.id,
      input: t.input,
      expectedOutput: t.expected_output,
      timeLimitMs: t.time_limit_ms,
    })),
  });

  if (outcome.compileError) {
    // Compile errors mean nothing ran, nothing to log
    return outcome;
  }

  if (offlineRun) {
    const { error } = await supabase.rpc("record_offline_graded_run", {
      p_operation_id: offlineRun.id,
      p_answer_id: answerId,
      p_requested_at: offlineRun.occurredAt,
      p_max_points: maxPoints,
      p_check_penalty: checkPenaltyPerAttempt,
      p_results: outcome.results.map((result) => ({
        passed: result.passed,
        actual_output: result.actualOutput,
        execution_time_ms: result.executionTimeMs,
      })),
    }).abortSignal(AbortSignal.timeout(10_000));
    if (error) throw error;
    return outcome;
  }

  // Write one log row per test case result
  const logRows = outcome.results.map((r) => ({
    answer_id: answerId,
    passed: r.passed,
    actual_output: r.actualOutput,
    execution_time_ms: r.executionTimeMs,
    executed_at: new Date().toISOString(),
  }));

  await supabase.from('code_execution_logs').insert(logRows);

  // Work out score based on how many test cases passed
  const passedCount = outcome.results.filter((r) => r.passed).length;
  const totalCount = outcome.results.length;
  const allPassed = totalCount > 0 && passedCount === totalCount;
  const rawScore = totalCount > 0 ? (passedCount / totalCount) * maxPoints : 0;

  // Fetch current attempt count so penalty stacks correctly
  const { data: currentAnswer } = await supabase
    .from('student_answers')
    .select('check_attempts, point_deduction')
    .eq('id', answerId)
    .single();

  const previousAttempts = currentAnswer?.check_attempts ?? 0;
  const previousDeduction = currentAnswer?.point_deduction ?? 0;

  // Only add a penalty when the run failed to pass every test case
  const newDeduction = allPassed
    ? previousDeduction
    : previousDeduction + checkPenaltyPerAttempt;

  // Never let deductions push the score below zero
  const finalScore = Math.max(0, rawScore - newDeduction);

  await supabase
    .from('student_answers')
    .update({
      score: finalScore,
      check_attempts: previousAttempts + 1,
      point_deduction: newDeduction,
      answered_at: new Date().toISOString(),
    })
    .eq('id', answerId);

  return outcome;
}
