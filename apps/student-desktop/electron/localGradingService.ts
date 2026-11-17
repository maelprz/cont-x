import type { OfflineAttemptKey, OfflineExamSnapshot } from '../src/types/offlineExam';
import type { SubmittedAnswer } from '../src/services/examService';
import type { LocalGradingState, LocalRubric, LocalSubmission } from '../src/types/localGrading';
import { gradeTextAnswer, codingScore } from '../shared/localGrading';
import { executeTestCases } from './ipc/compilerHandlers';
import { loadOfflineExam, saveLocalGradingState } from './storage/offlineExamStorage';

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
  if (!exam?.gradingMaterial) throw new Error('Download the full grading materials before starting this exam.');
  return exam;
}

function run(rubric: LocalRubric, code: string, visibleOnly = false) {
  if (rubric.type !== 'coding' || !rubric.tests || !rubric.programType) throw new Error('Coding grading materials are incomplete.');
  return executeTestCases({ code, programType: rubric.programType, mainCode: rubric.mainCode ?? undefined,
    testCases: rubric.tests.filter((test) => !visibleOnly || !test.is_hidden).map((test) => ({
      id: test.id, input: test.input, expectedOutput: test.expected_output, timeLimitMs: test.time_limit_ms,
    })),
  });
}

function stateOf(exam: OfflineExamSnapshot): LocalGradingState {
  return exam.gradingState ?? { runs: {} };
}

export function runLocalCode(key: OfflineAttemptKey, questionId: string, code: string, visibleOnly: boolean) {
  return withAttemptLock(key, async () => {
    const exam = await readAttempt(key);
    const state = stateOf(exam);
    if (state.submission) throw new Error('This attempt has already been graded for submission.');
    const rubric = exam.gradingMaterial![questionId];
    if (!rubric) throw new Error('Question does not belong to this attempt.');
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
      await saveLocalGradingState(key, state);
    }
    return outcome;
  });
}

// Grade the final answers once; retries return the same durable submission.
export function gradeLocalSubmission(key: OfflineAttemptKey, status: LocalSubmission['status'], answers: SubmittedAnswer[]) {
  return withAttemptLock(key, async () => {
    const exam = await readAttempt(key);
    const state = stateOf(exam);
    if (state.submission) return state.submission;
    const byId = new Map(answers.map((answer) => [answer.pool_draw_id ?? answer.question_id, answer]));
    if (byId.size !== answers.length || answers.some((answer) => !exam.questions.some((q) =>
      q.poolDrawId ? answer.pool_draw_id === q.id && !answer.question_id : answer.question_id === q.id && !answer.pool_draw_id))) {
      throw new Error('Submission contains invalid or duplicate questions.');
    }
    const now = Date.parse(exam.timing.serverNow) + Math.max(0, Date.now() - exam.timingReceivedAt);
    const overtimeSeconds = exam.timing.allowOvertime ? Math.max(0, Math.ceil((Math.min(now, Date.parse(exam.timing.hardDeadline)) - Date.parse(exam.timing.normalDeadline)) / 1000)) : 0;
    const graded: LocalSubmission['answers'] = [];
    for (const question of exam.questions) {
      const rubric = exam.gradingMaterial![question.id];
      if (!rubric) throw new Error('Grading materials are incomplete.');
      const answer = byId.get(question.id) ?? { question_id: question.poolDrawId ? null : question.id, pool_draw_id: question.poolDrawId, answer_text: '' };
      const changes = Math.min(1000, Math.max(0, Math.round(answer.change_count ?? 0)));
      let score = 0;
      const previous = state.runs[question.id];
      const deduction = previous?.pointDeduction ?? rubric.pointDeduction;
      if (rubric.type === 'coding' && answer.answer_text.trim()) {
        // Final compilation checks the submitted code, including code edited after Run Code.
        // It adds no extra check attempt or penalty.
        const result = previous?.code === answer.answer_text ? previous.outcome : await run(rubric, answer.answer_text);
        if (previous?.code !== answer.answer_text && !result.compileError) {
          (state.executionLogs ??= []).push({ questionId: question.id, executedAt: new Date(now).toISOString(), outcome: result });
        }
        if (!result.compileError) score = codingScore(result.results.filter((r) => r.passed).length, result.results.length, rubric.maxPoints, deduction);
      } else if (rubric.type !== 'coding') {
        score = Math.max(0, gradeTextAnswer(rubric, answer.answer_text) - changes * exam.rules.answerChangeDeduction);
      }
      const answeredAt = answer.answered_at ? Date.parse(answer.answered_at) : null;
      if (exam.rules.overtimePolicy === 'zero' && answeredAt !== null && answeredAt > Date.parse(exam.timing.normalDeadline)) score = 0;
      graded.push({ ...answer, score, change_count: changes, check_attempts: previous?.checkAttempts ?? rubric.checkAttempts,
        point_deduction: rubric.type === 'coding' ? deduction : changes * exam.rules.answerChangeDeduction });
    }
    const overtimeDeduction = overtimeSeconds > 0 ? exam.timing.overtimeDeduction : 0;
    state.submission = { version: 1, status: now >= Date.parse(exam.timing.hardDeadline) ? 'timed_out' : status,
      submittedAt: new Date(now).toISOString(), answers: graded, overtimeSeconds, overtimeDeduction,
      totalScore: Math.max(0, graded.reduce((sum, answer) => sum + answer.score, 0) - overtimeDeduction),
      executionLogs: state.executionLogs ?? [] };
    await saveLocalGradingState(key, state);
    return state.submission;
  });
}
