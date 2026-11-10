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

// NEW — finds the existing student_answers row for this session+question,
// or creates one if this is the student's first Run Code click on it.
// Needed because student_answers rows are otherwise only created by the
// submit_exam_session RPC at the very end, but Run Code needs a real row
// to log against and update the running score before that happens.
// Relies on the unique (session_id, question_id) constraint to stay safe
// even if this ever fires twice in a race (e.g. rapid double-click).
async function ensureAnswerRow(
  sessionId: string, // exam_sessions.id — whose attempt this is
  questionId: string, // questions.id — which question this answer belongs to (or the draw id when pooled)
  pooled = false, // true when questionId is really a pooled question's draw id
): Promise<string> {
  // a pooled question's answer row is keyed by its draw, a normal one by its question id
  const keyColumn = pooled ? 'pool_draw_id' : 'question_id';

  const { data: existing, error: findError } = await supabase
    .from('student_answers')
    .select('id')
    .eq('session_id', sessionId)
    .eq(keyColumn, questionId)
    .maybeSingle();

  if (findError) throw new Error(findError.message);
  if (existing) return existing.id; // already exists, reuse it

  const { data: created, error: insertError } = await supabase
    .from('student_answers')
    .insert({
      session_id: sessionId,
      [keyColumn]: questionId,
      answer_text: null, // the submit RPC is what saves the real final code/answer text
      score: 0,
      check_attempts: 0,
      point_deduction: 0,
      answered_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (insertError) {
    // If another click won the race and inserted first, the unique
    // constraint will reject this one — fetch the row it created instead.
    const { data: fallback, error: fallbackError } = await supabase
      .from('student_answers')
      .select('id')
      .eq('session_id', sessionId)
      .eq(keyColumn, questionId)
      .single();

    if (fallbackError) throw new Error(insertError.message); // original error is more useful here
    return fallback.id;
  }

  return created.id;
}

// Loads a question's test cases. A normal question reads its own test_cases rows; a pooled
// question reads them through get_pool_draw_test_cases, because students cannot read the bank.
async function loadTestCases(
  questionId: string,
  pooled: boolean,
  onlyVisible: boolean,
): Promise<{ id: string; input: string; expected_output: string; time_limit_ms: number }[]> {
  if (pooled) {
    const { data, error } = await supabase.rpc('get_pool_draw_test_cases', {
      p_draw_id: questionId,
      p_only_visible: onlyVisible,
    });
    if (error || !data) throw new Error('Could not load test cases');
    return data as { id: string; input: string; expected_output: string; time_limit_ms: number }[];
  }

  let query = supabase
    .from('test_cases')
    .select('id, input, expected_output, time_limit_ms')
    .eq('coding_question_id', questionId);
  if (onlyVisible) query = query.eq('is_hidden', false);
  const { data, error } = await query;
  if (error || !data) throw new Error('Could not load test cases');
  return data;
}

// Run Tests: checks only the teacher's visible test cases
// Pure feedback for the student, no Supabase writes, no penalty
export async function runVisibleTests(
  questionId: string,
  code: string,
  programType: 'cFunction' | 'cProgram',
  mainCode: string | undefined,
  pooled = false // true when questionId is a pooled question's draw id
): Promise<RunOutcome> {
  const testCases = await loadTestCases(questionId, pooled, true);

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
// This is the real grading check, writes logs and updates score.
// CHANGED — now takes sessionId + questionId instead of a pre-existing
// answerId, since ensureAnswerRow finds or creates the row automatically.
export async function runAllTestsAndScore(
  sessionId: string,
  questionId: string,
  code: string,
  programType: 'cFunction' | 'cProgram',
  mainCode: string | undefined,
  maxPoints: number,
  checkPenaltyPerAttempt: number,
  pooled = false // true when questionId is a pooled question's draw id
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