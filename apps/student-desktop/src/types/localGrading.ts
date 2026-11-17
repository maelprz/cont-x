import type { SubmittedAnswer } from '../services/examService';
import type { RunOutcome, VisibleTestCase } from '../services/codeExecutionService';

export interface LocalRubric {
  type: 'mcq' | 'fitb' | 'coding';
  maxPoints: number;
  correctOptionIds?: string[];
  acceptedAnswers?: string[];
  caseSensitive?: boolean;
  ignoreExtraSpaces?: boolean;
  programType?: 'cFunction' | 'cProgram';
  mainCode?: string | null;
  penaltyPerAttempt?: number;
  tests?: (VisibleTestCase & { is_hidden: boolean })[];
  checkAttempts: number;
  pointDeduction: number;
}

export interface LocalRunState {
  checkAttempts: number;
  pointDeduction: number;
  score: number;
  code: string;
  outcome: RunOutcome;
}

export interface LocalGradedAnswer extends SubmittedAnswer {
  score: number;
  check_attempts: number;
  point_deduction: number;
}

export interface LocalSubmission {
  version: 1;
  status: 'submitted' | 'timed_out';
  submittedAt: string;
  answers: LocalGradedAnswer[];
  totalScore: number;
  overtimeSeconds: number;
  overtimeDeduction: number;
  executionLogs: LocalExecutionLog[];
  codingReview?: Record<string, CodingReview>;
}

export interface CodingReview {
  status: 'graded' | 'compile_error' | 'unanswered' | 'not_recorded';
  tests: {
    id: string;
    input: string;
    expectedOutput: string;
    actualOutput: string | null;
    passed: boolean | null;
    timedOut: boolean;
  }[];
}

export interface LocalExecutionLog {
  questionId: string;
  executedAt: string;
  outcome: RunOutcome;
}

export interface LocalGradingState {
  runs: Record<string, LocalRunState>;
  executionLogs?: LocalExecutionLog[];
  replayedRuns?: Record<string, RunOutcome>;
  submission?: LocalSubmission;
}
