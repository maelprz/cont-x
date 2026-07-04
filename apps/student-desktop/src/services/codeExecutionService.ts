import { supabase } from '../services/supabaseClient';

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

// Run Tests: checks only the teacher's visible test cases
// Pure feedback for the student, no Supabase writes, no penalty
export async function runVisibleTests(
  questionId: string,
  code: string,
  programType: 'function' | 'program',
  mainCode: string | undefined
): Promise<RunOutcome> {
  const { data: testCases, error } = await supabase
    .from('test_cases')
    .select('id, input, expected_output, time_limit_ms')
    .eq('coding_question_id', questionId)
    .eq('is_hidden', false);

  if (error || !testCases) {
    throw new Error('Could not load visible test cases');
  }

  return window.ipcRenderer.invoke('run-test-cases', {
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
}

// Run Code: checks every test case, visible and hidden
// This is the real grading check, writes logs and updates score
export async function runAllTestsAndScore(
  answerId: string,
  questionId: string,
  code: string,
  programType: 'function' | 'program',
  mainCode: string | undefined,
  maxPoints: number,
  checkPenaltyPerAttempt: number
): Promise<RunOutcome> {
  const { data: testCases, error } = await supabase
    .from('test_cases')
    .select('id, input, expected_output, time_limit_ms')
    .eq('coding_question_id', questionId);

  if (error || !testCases) {
    throw new Error('Could not load test cases');
  }

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