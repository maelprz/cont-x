import type {
  FetchedQuestion,
  SessionRules,
  SessionTiming,
} from "../services/examService";

export interface OfflineExamSnapshot {
  studentId: string;
  sessionId: string;
  questions: FetchedQuestion[];
  rules: SessionRules;
  timing: SessionTiming;
  timingReceivedAt: number;
}
