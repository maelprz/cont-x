import type { OfflineAttemptKey, OfflineExamSnapshot, OfflineOperation } from "../../src/types/offlineExam";
import type { RunOutcome } from '../../src/services/codeExecutionService';

// Never expose keys or hidden tests from older downloaded snapshots on restore.
export function feedbackMaterials(materials: OfflineExamSnapshot['gradingMaterial']) {
  if (!materials) return materials;
  return Object.fromEntries(Object.entries(materials).map(([id, rubric]) => [id, {
    type: rubric.type, maxPoints: rubric.maxPoints, programType: rubric.programType,
    mainCode: rubric.mainCode, penaltyPerAttempt: rubric.penaltyPerAttempt,
    tests: rubric.tests?.filter((test) => test.is_hidden === false),
    checkAttempts: 0, pointDeduction: 0, feedbackOnly: true,
  }]));
}

export type StoredExam = Omit<OfflineExamSnapshot, keyof OfflineAttemptKey | "pendingSubmission" | "gradingMaterial" | "gradingState"> & { gradingMaterial?: OfflineExamSnapshot["gradingMaterial"] | null; gradingState?: OfflineExamSnapshot["gradingState"] | null };

export function examDownload(snapshot: OfflineExamSnapshot): StoredExam {
  const questions = snapshot.questions.map(({ mainCode, ...question }) =>
    question.programType === "cFunction" ? { ...question, mainCode } : question);
  return {
    // Null removes legacy plaintext during JSON merge.
    gradingMaterial: null, gradingState: null,
    protectedGradingMaterial: snapshot.protectedGradingMaterial,
    protectedGradingState: snapshot.protectedGradingState,
    examId: snapshot.examId,
    title: snapshot.title,
    visibleTests: snapshot.visibleTests,
    questions,
    rules: snapshot.rules,
    timing: snapshot.timing,
    timingReceivedAt: snapshot.timingReceivedAt,
  };
}

export function restoreExam(
  key: OfflineAttemptKey,
  snapshot: StoredExam,
  operation?: Extract<OfflineOperation, { kind: "submit" }>,
): OfflineExamSnapshot {
  const pendingSubmission = operation ? {
    ...operation.submission,
    requestedAt: operation.occurredAt,
  } : undefined;
  return { ...snapshot, gradingMaterial: snapshot.gradingMaterial ?? undefined,
    gradingState: snapshot.gradingState ?? undefined, ...key,
    draft: pendingSubmission?.draft ?? snapshot.draft, pendingSubmission };
}

// Apply at the IPC boundary only: the main-process grader needs the full material.
export function publicExam(snapshot: OfflineExamSnapshot): OfflineExamSnapshot {
  const exam = { ...snapshot };
  delete exam.protectedGradingMaterial;
  delete exam.protectedGradingState;
  const materials = feedbackMaterials(exam.gradingMaterial);
  const visibleIds = new Set(Object.values(materials ?? {}).flatMap(rubric => rubric.tests?.map(test => test.id) ?? []));
  const visibleOutcome = (outcome: RunOutcome): RunOutcome => ({ ...outcome,
    results: outcome.results.filter(result => visibleIds.has(result.testCaseId)) });
  const state = exam.gradingState;
  const gradingState = state ? { ...state,
    runs: Object.fromEntries(Object.entries(state.runs).map(([id, run]) => [id, { ...run, outcome: visibleOutcome(run.outcome) }])),
    executionLogs: state.executionLogs?.map(log => ({ ...log, outcome: visibleOutcome(log.outcome) })),
    replayedRuns: state.replayedRuns && Object.fromEntries(Object.entries(state.replayedRuns).map(([id, outcome]) => [id, visibleOutcome(outcome)])),
    submission: state.submission && { ...state.submission,
      executionLogs: state.submission.executionLogs.map(log => ({ ...log, outcome: visibleOutcome(log.outcome) })),
      codingReview: state.submission.codingReview && Object.fromEntries(Object.entries(state.submission.codingReview)
        .map(([id, review]) => [id, { ...review, tests: review.tests.filter(test => visibleIds.has(test.id)) }])),
    },
  } : undefined;
  return { ...exam, gradingMaterial: materials, gradingState };
}

export function queueSlot(operation: OfflineOperation): string {
  return operation.kind === "live" || operation.kind === "submit" ? operation.kind : operation.id;
}
