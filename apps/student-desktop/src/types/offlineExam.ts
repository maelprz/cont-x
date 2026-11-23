import type {
  FetchedQuestion,
  SessionRules,
  SessionTiming,
  SubmittedAnswer,
} from "../services/examService";
import type { VisibleTestCase } from "../services/codeExecutionService";
import type { LocalRubric, LocalGradingState } from "./localGrading";
import type { BufferedMovementEvent } from "../services/movementEventService";
import type { KeystrokeQuestion } from "../services/keystrokeService";
import type { LiveStatePayload } from "../services/liveStateService";
import type { ViolationEvent } from "./violationEvent";

export interface OfflineAttemptKey {
  studentId: string;
  sessionId: string;
}

export interface OfflineExamSnapshot extends OfflineAttemptKey {
  /** Main-process storage only. Removed from all renderer responses. */
  protectedGradingMaterial?: string;
  protectedGradingState?: string;
  gradingMaterial?: Record<string, LocalRubric>;
  gradingState?: LocalGradingState;
  examId?: string;
  title?: string;
  visibleTests?: Record<string, VisibleTestCase[]>;
  questions: FetchedQuestion[];
  rules: SessionRules;
  timing: SessionTiming;
  timingReceivedAt: number;
  draft?: OfflineExamDraft;
  pendingSubmission?: OfflineSubmission;
}

export interface OfflineExamDraft {
  currentIndex: number;
  flaggedIds: string[];
  selectedOptions: Record<string, string>;
  textAnswers: Record<string, string>;
  codeByQuestion: Record<string, string>;
  answeredAt: Record<string, string>;
  answerChanges: {
    settled: Record<string, string>;
    changes: Record<string, number>;
  };
  questionTimesMs: Record<string, number>;
}

export interface OfflineSubmission {
  status: "submitted" | "timed_out";
  answers: SubmittedAnswer[];
  draft: OfflineExamDraft;
  requestedAt?: string;
}

export type OfflineOperationPayload =
  | { kind: "movement"; event: BufferedMovementEvent }
  | { kind: "violation"; event: ViolationEvent; questionId: string | null }
  | { kind: "keystrokes"; question: KeystrokeQuestion; batch: string }
  | { kind: "live"; state: LiveStatePayload }
  | {
      kind: "graded";
      questionId: string | null;
      poolDrawId: string | null;
      code: string;
    }
  | { kind: "submit"; submission: OfflineSubmission };

export type OfflineOperation = OfflineOperationPayload & {
  id: string;
  occurredAt: string;
};

export type OfflineEnqueue = (
  payload: OfflineOperationPayload,
  occurredAt?: string,
  id?: string,
) => Promise<void>;
