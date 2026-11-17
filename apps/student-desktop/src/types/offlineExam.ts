import type {
  FetchedQuestion,
  SessionRules,
  SessionTiming,
} from "../services/examService";
import type { VisibleTestCase } from "../services/codeExecutionService";
import type { LocalRubric, LocalGradingState } from './localGrading';

export interface OfflineAttemptKey {
  studentId: string;
  sessionId: string;
}

export interface OfflineExamSnapshot extends OfflineAttemptKey {
  gradingMaterial?: Record<string, LocalRubric>;
  gradingState?: LocalGradingState;
  examId?: string;
  title?: string;
  visibleTests?: Record<string, VisibleTestCase[]>;
  questions: FetchedQuestion[];
  rules: SessionRules;
  timing: SessionTiming;
  timingReceivedAt: number;
}

export interface OfflineGradedRunRequest extends OfflineAttemptKey {
  operationId: string;
  requestedAt: string;
  questionId: string | null;
  poolDrawId: string | null;
  code: string;
}
