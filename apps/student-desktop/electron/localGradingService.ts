import type { OfflineAttemptKey, OfflineExamSnapshot } from '../src/types/offlineExam';
import type { SubmittedAnswer } from '../src/services/examService';
import type { CodingReview, LocalGradingState, LocalRubric, LocalSubmission } from '../src/types/localGrading';
import { gradeTextAnswer, codingScore, validateCodingRubric } from '../shared/localGrading';
import { executeTestCases } from './ipc/compilerHandlers';
import { loadOfflineExam, saveLocalGradingState } from './storage/offlineExamStorage';
import { publicExam } from './storage/offlineStorageData';

const locks = new Map<string, Promise<unknown>>();
export async function withAttemptLock<T>(key: OfflineAttemptKey, action: () => Promise<T>): Promise<T> {
  const id = `${key.studentId}:${key.sessionId}`;
  const previous = locks.get(id) ?? Promise.resolve();
  const next = previous.catch(() => {}).then(action);
  locks.set(id, next);
  try { return await next; }
  finally { if (locks.get(id) === next) locks.delete(id); }
}

async function readAttempt(key: OfflineAttemptKey) {
  const exam = await loadOfflineExam(key);
  if (!exam?.gradingMaterial || Object.values(exam.gradingMaterial).some(rubric => rubric.feedbackOnly)) {
    throw new Error('Reconnect and download this attempt again to enable fully offline grading. Your saved answers are retained.');
  }
  return exam;
}

function run(rubric: LocalRubric, code: string, visibleOnly = false) {
  if (rubric.type !== 'coding' || !rubric.tests || !rubric.programType) throw new Error('Coding grading materials are incomplete.');
  validateCodingRubric(rubric);
  return executeTestCases({ code, programType: rubric.programType, mainCode: rubric.mainCode ?? undefined,
    testCases: rubric.tests.filter((test) => !visibleOnly || !test.is_hidden).map((test) => ({
      id: test.id, input: test.input, expectedOutput: test.expected_output, timeLimitMs: test.time_limit_ms,
    })),
  });
}

function stateOf(exam: OfflineExamSnapshot): LocalGradingState {
  return exam.gradingState ?? { runs: {} };
}

function visibleSubmission(exam: OfflineExamSnapshot, submission: LocalSubmission): LocalSubmission {
  return publicExam({ ...exam, gradingState: { runs: {}, submission } }).gradingState!.submission!;
}

export function runLocalCode(key: OfflineAttemptKey, questionId: string, code: string, visibleOnly: boolean, operationId?: string) {
  return withAttemptLock(key, async () => {
    const exam = await readAttempt(key);
    const state = stateOf(exam);
    const replayed = operationId && state.replayedRuns?.[operationId];
    if (replayed) return replayed;
    if (state.submission && !state.submission.provisional) throw new Error('This attempt has already been graded for submission.');
    const rubric = exam.gradingMaterial![questionId];
    if (!rubric) throw new Error('Question does not belong to this attempt.');
    if (!visibleOnly && (state.executionLogs?.length ?? 0) >= 200) throw new Error('The 200 code-check limit was reached. You can still submit your final code.');
    const outcome = await run(rubric, code, visibleOnly);
    if (!visibleOnly && !outcome.compileError) {
      (state.executionLogs ??= []).push({ questionId, executedAt: new Date().toISOString(), outcome });
      const previous = state.runs[questionId];
      const passed = outcome.results.filter((result) => result.passed).length;
      const allPassed = outcome.results.length > 0 && passed === outcome.results.length;
      const deduction = (previous?.pointDeduction ?? rubric.pointDeduction) + (allPassed ? 0 : rubric.penaltyPerAttempt ?? 0);
      state.runs[questionId] = { code, outcome, pointDeduction: deduction,
        checkAttempts: (previous?.checkAttempts ?? rubric.checkAttempts) + 1,
        score: codingScore(passed, outcome.results.length, rubric.maxPoints, deduction) };
    }
    if (operationId) (state.replayedRuns ??= {})[operationId] = outcome;
    if (operationId || (!visibleOnly && !outcome.compileError)) await saveLocalGradingState(key, state);
    // Run Tests executes visible cases only; Run Code returns every executed case.
    return outcome;
  });
}

// Grade the final answers once; retries return the same durable submission.
export function gradeLocalSubmission(key: OfflineAttemptKey, status: LocalSubmission['status'], answers: SubmittedAnswer[], requestedAt?: string) {
  return withAttemptLock(key, async () => {
    const exam = await readAttempt(key);
    const state = stateOf(exam);
    if (state.submission && !state.submission.provisional) return visibleSubmission(exam, state.submission);
    const byId = new Map(answers.map((answer) => [answer.pool_draw_id ?? answer.question_id, answer]));
    if (byId.size !== answers.length || answers.some((answer) => !exam.questions.some((q) =>
      q.poolDrawId ? answer.pool_draw_id === q.id && !answer.question_id : answer.question_id === q.id && !answer.pool_draw_id))) {
      throw new Error('Submission contains invalid or duplicate questions.');
    }
    const localTime = requestedAt ? Date.parse(requestedAt) : Date.now();
    const now = Date.parse(exam.timing.serverNow) + localTime - exam.timingReceivedAt;
    const overtimeSeconds = exam.timing.allowOvertime ? Math.max(0, Math.ceil((Math.min(now, Date.parse(exam.timing.hardDeadline)) - Date.parse(exam.timing.normalDeadline)) / 1000)) : 0;
    const graded: LocalSubmission['answers'] = [];
    const executionLogs = [...(state.executionLogs ?? [])];
    const codingReview: Record<string, CodingReview> = {};
    for (const question of exam.questions) {
      const rubric = exam.gradingMaterial![question.id];
      if (!rubric) throw new Error('Grading materials are incomplete.');
      validateCodingRubric(rubric);
      const answer = byId.get(question.id) ?? { question_id: question.poolDrawId ? null : question.id, pool_draw_id: question.poolDrawId, answer_text: '' };
      const changes = Math.min(1000, Math.max(0, Math.round(answer.change_count ?? 0)));
      let score = 0;
      const previous = state.runs[question.id];
      const deduction = previous?.pointDeduction ?? rubric.pointDeduction;
      if (rubric.type === 'coding') {
        codingReview[question.id] = { status: 'unanswered', tests: rubric.tests!
          .filter((test) => test.is_hidden === false)
          .map((test) => ({ id: test.id, input: test.input, expectedOutput: test.expected_output,
            actualOutput: null, passed: null, timedOut: false })) };
      }
      if (rubric.type === 'coding' && answer.answer_text.trim()) {
        // Final compilation checks the submitted code, including code edited after Run Code.
        // It adds no extra check attempt or penalty.
        const result = previous?.code === answer.answer_text ? previous.outcome : await run(rubric, answer.answer_text);
        const review = codingReview[question.id];
        review.status = result.compileError ? 'compile_error' : 'graded';
        review.tests = review.tests.map((test) => {
          const outcome = result.results.find((outcome) => outcome.testCaseId === test.id);
          return { ...test, actualOutput: outcome?.actualOutput ?? null,
            passed: outcome?.passed ?? null, timedOut: outcome?.timedOut ?? false };
        });
        if (previous?.code !== answer.answer_text && !result.compileError) {
          executionLogs.push({ questionId: question.id, executedAt: new Date(now).toISOString(), outcome: result });
        }
        if (!result.compileError) score = codingScore(result.results.filter((r) => r.passed).length, result.results.length, rubric.maxPoints, deduction);
      } else if (rubric.type !== 'coding') {
        score = Math.max(0, gradeTextAnswer(rubric, answer.answer_text) - changes * exam.rules.answerChangeDeduction);
      }
      graded.push({ ...answer, score, graded_max_points: rubric.maxPoints, change_count: changes, check_attempts: previous?.checkAttempts ?? rubric.checkAttempts,
        point_deduction: rubric.type === 'coding' ? deduction : changes * exam.rules.answerChangeDeduction });
    }
    const overtimeDeduction = overtimeSeconds > 0 ? exam.timing.overtimeDeduction : 0;
    state.submission = visibleSubmission(exam, { version: 1, status: now >= Date.parse(exam.timing.hardDeadline) ? 'timed_out' : status,
      submittedAt: new Date(now).toISOString(), answers: graded, overtimeSeconds, overtimeDeduction,
      totalScore: Math.max(0, graded.reduce((sum, answer) => sum + answer.score, 0) - overtimeDeduction),
      executionLogs, codingReview });
    await saveLocalGradingState(key, state);
    return state.submission;
  });
}
