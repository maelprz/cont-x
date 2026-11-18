import type { OfflineAttemptKey, OfflineExamSnapshot, OfflineOperation } from "../../src/types/offlineExam";

export type StoredExam = Omit<OfflineExamSnapshot, keyof OfflineAttemptKey | "pendingSubmission">;

export function examDownload(snapshot: OfflineExamSnapshot): StoredExam {
  const questions = snapshot.questions.map(({ mainCode, ...question }) =>
    question.programType === "cFunction" ? { ...question, mainCode } : question);
  return {
    gradingMaterial: snapshot.gradingMaterial,
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
  return { ...snapshot, ...key, draft: pendingSubmission?.draft ?? snapshot.draft, pendingSubmission };
}

export function queueSlot(operation: OfflineOperation): string {
  return operation.kind === "live" || operation.kind === "submit" ? operation.kind : operation.id;
}
