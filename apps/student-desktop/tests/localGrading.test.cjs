const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, mocks = {}, globals = {}) {
  const exports = {};
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
  vm.runInNewContext(outputText, { exports, ...globals, require: (name) => mocks[name] ?? require(name) });
  return exports;
}
const pure = load('shared/localGrading.ts');
const base = { maxPoints: 10, checkAttempts: 0, pointDeduction: 0 };

test('MCQ uses option identity; unanswered and wrong answers score zero', () => {
  const rubric = { ...base, type: 'mcq', correctOptionIds: ['option-a'] };
  assert.equal(pure.gradeTextAnswer(rubric, 'option-a'), 10);
  assert.equal(pure.gradeTextAnswer(rubric, 'A'), 0);
  assert.equal(pure.gradeTextAnswer(rubric, ''), 0);
});

test('FITB honors accepted alternatives, case and whitespace settings', () => {
  const rubric = { ...base, type: 'fitb', acceptedAnswers: ['Binary Search', 'Bisection'], caseSensitive: false, ignoreExtraSpaces: true };
  for (const answer of [' binary   SEARCH ', 'BISECTION', 'Binary\nSearch']) assert.equal(pure.gradeTextAnswer(rubric, answer), 10);
  assert.equal(pure.gradeTextAnswer(rubric, '   '), 0);
  assert.equal(pure.gradeTextAnswer({ ...rubric, caseSensitive: true }, 'binary search'), 0);
  assert.equal(pure.gradeTextAnswer({ ...rubric, ignoreExtraSpaces: false }, 'Binary  Search'), 0);
});

const at = Date.parse('2026-11-17T08:00:00Z');
const key = { studentId: 'student', sessionId: 'attempt' };
function fixture(overrides = {}) {
  let exam = {
    ...key, questions: [
      { id: 'mc', type: 'mcq', poolDrawId: null },
      { id: 'fitb-draw', type: 'fitb', poolDrawId: 'fitb-draw' },
      { id: 'code', type: 'coding', poolDrawId: null },
    ],
    rules: { answerChangeDeduction: 2, overtimePolicy: 'accept' },
    timing: { serverNow: new Date(at).toISOString(), normalDeadline: new Date(at + 60000).toISOString(), hardDeadline: new Date(at + 120000).toISOString(), allowOvertime: true, overtimeDeduction: 3 },
    timingReceivedAt: at,
    gradingMaterial: {
      mc: { ...base, type: 'mcq', correctOptionIds: ['yes'] },
      'fitb-draw': { ...base, type: 'fitb', acceptedAnswers: ['Hello'], caseSensitive: false },
      code: { ...base, type: 'coding', programType: 'cProgram', penaltyPerAttempt: 1,
        tests: [{ id: 'visible', is_hidden: false, input: '', expected_output: 'ok', time_limit_ms: 1000 }, { id: 'hidden', is_hidden: true, input: '', expected_output: 'ok', time_limit_ms: 1000 }] },
    }, ...overrides,
  };
  const calls = [];
  let now = at;
  class Clock extends Date { static now() { return now; } }
  const service = load('electron/localGradingService.ts', {
    '../shared/localGrading': pure,
    './storage/offlineExamStorage': {
      loadOfflineExam: async () => structuredClone(exam),
      saveLocalGradingState: async (_key, state) => { exam.gradingState = structuredClone(state); },
    },
    './ipc/compilerHandlers': { executeTestCases: async (request) => {
      calls.push(request);
      if (request.code === 'compile-error') return { compileError: 'syntax error', results: [] };
      return { compileError: null, results: request.testCases.map((t, i) => ({ testCaseId: t.id, passed: request.code === 'pass' || i === 0, actualOutput: 'ok', timedOut: false, executionTimeMs: null })) };
    } },
  }, { Date: Clock });
  return { service, calls, exam: () => exam, now: (value) => { now = value; } };
}

test('visible tests do not grade; Run Code persists partial credit and cumulative deductions without cloud access', async () => {
  const f = fixture();
  await f.service.runLocalCode(key, 'code', 'partial', true);
  assert.equal(f.calls[0].testCases.length, 1);
  assert.equal(f.exam().gradingState, undefined);
  await f.service.runLocalCode(key, 'code', 'partial', false);
  assert.equal(f.exam().gradingState.runs.code.score, 4);
  assert.equal(f.exam().gradingState.runs.code.checkAttempts, 1);
  await f.service.runLocalCode(key, 'code', 'compile-error', false);
  assert.equal(f.exam().gradingState.runs.code.checkAttempts, 1);
  await f.service.runLocalCode(key, 'code', 'pass', false);
  assert.equal(f.exam().gradingState.runs.code.score, 9);
  assert.equal(f.exam().gradingState.runs.code.checkAttempts, 2);
});

const answers = [
  { question_id: 'mc', answer_text: 'yes', change_count: 1 },
  { question_id: null, pool_draw_id: 'fitb-draw', answer_text: 'hello' },
  { question_id: 'code', answer_text: 'pass' },
];
test('final submission grades direct/pooled questions and final code, persists receipt, and retries without regrading', async () => {
  const f = fixture();
  await f.service.runLocalCode(key, 'code', 'partial', false);
  const first = await f.service.gradeLocalSubmission(key, 'submitted', answers);
  assert.equal(first.totalScore, 27);
  assert.equal(first.answers[2].check_attempts, 1);
  assert.equal(first.executionLogs.length, 2);
  const callCount = f.calls.length;
  const retry = await f.service.gradeLocalSubmission(key, 'submitted', []);
  assert.equal(JSON.stringify(first), JSON.stringify(retry));
  assert.equal(f.calls.length, callCount);
  await assert.rejects(f.service.runLocalCode(key, 'code', 'pass', false), /already been graded/);
});

test('overtime deduction applies once and late answers obey zero policy', async () => {
  const f = fixture({ rules: { answerChangeDeduction: 0, overtimePolicy: 'zero' } });
  f.now(at + 90000);
  const result = await f.service.gradeLocalSubmission(key, 'submitted', answers.map((answer) => ({ ...answer, answered_at: new Date(at + 80000).toISOString() })));
  assert.equal(result.totalScore, 0);
  assert.equal(result.overtimeSeconds, 30);
  assert.equal(result.overtimeDeduction, 3);
});

test('concurrent runs serialize and cannot lose attempt increments', async () => {
  const f = fixture();
  await Promise.all([f.service.runLocalCode(key, 'code', 'partial', false), f.service.runLocalCode(key, 'code', 'partial', false)]);
  assert.equal(f.exam().gradingState.runs.code.checkAttempts, 2);
  assert.equal(f.exam().gradingState.runs.code.pointDeduction, 2);
});

test('unknown and duplicate question references fail before grading', async () => {
  const f = fixture();
  await assert.rejects(f.service.runLocalCode(key, 'unknown', 'pass', false), /does not belong/);
  await assert.rejects(f.service.gradeLocalSubmission(key, 'submitted', [answers[0], answers[0]]), /duplicate/);
  await assert.rejects(f.service.gradeLocalSubmission(key, 'submitted', [{ question_id: 'other', answer_text: '' }]), /invalid/);
});

test('renderer Run Tests and Run Code use only the local bridge', async () => {
  const calls = [];
  const store = { useExamSessionStore: { getState: () => ({ offlineExam: { ...key, gradingMaterial: {} } }) } };
  const service = load('src/services/codeExecutionService.ts', { '../stores/useExamSessionStore': store }, {
    window: { ipcRenderer: { runLocalCode: async (...args) => { calls.push(args); return { compileError: null, results: [] }; } } },
  });
  await service.runVisibleTests('code', 'pass', 'cProgram', undefined);
  await service.runAllTestsAndScore('attempt', 'code', 'pass', 'cProgram', undefined, 10, 1);
  assert.equal(calls.length, 2);
  assert.equal(calls[0][3], true);
  assert.equal(calls[1][3], false);
});

test('submission sync sends a durable local receipt, never the server grading RPC', async () => {
  const events = [];
  const receipt = { version: 1, totalScore: 27, status: 'submitted', answers: [] };
  const service = load('src/services/examService.ts', {
    '../stores/useExamSessionStore': { useExamSessionStore: { getState: () => ({ offlineExam: { ...key, gradingMaterial: {} } }) } },
    './supabaseClient': { supabase: { rpc: async (name, args) => {
      events.push(name);
      assert.equal(args.p_submission, receipt);
      return { data: [{ total_score: 27, status: 'submitted' }], error: null };
    } } },
  }, { window: { ipcRenderer: { gradeLocalSubmission: async () => { events.push('local-grade'); return receipt; } } } });
  const result = await service.submitExamSession('attempt', 'submitted', []);
  assert.equal(result.totalScore, 27);
  assert.equal(events.join(','), 'local-grade,sync_local_exam_submission');
});
