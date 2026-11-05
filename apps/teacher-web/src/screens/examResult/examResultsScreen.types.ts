// Shape of one row in the results table.
export type StudentResultRow = {
  sessionId: string; 
  studentName: string; 
  studentIdNumber: string | null; 
  scoreAdjustment: number; 
  adjustmentReason: string | null;
  totalScore: number; 
  maxScore: number; 
  attemptNumber: number; 
  overtimeSeconds: number;
  questionScores: QuestionScoreCell[]; 
  poolScores: PoolScoreCell[]; 
};

// What one student earned in one random pool; students draw different questions,
// so the pool's maximum is for the questions THIS student drew.
export type PoolScoreCell = {
  poolKey: string; 
  poolOrder: number;
  title: string; 
  drawnCount: number; 
  score: number; 
  maxPoints: number; 
  questions: PoolQuestionScore[]; 
};

// What one student earned on one specific question they drew from a pool.
export type PoolQuestionScore = {
  bankQuestionId: string; 
  title: string; 
  score: number; 
  maxPoints: number; 
};

// One per-question cell in a result row.
export type QuestionScoreCell = {
  questionId: string; 
  label: string; 
  title: string; 
  maxPoints: number;
  score: number; 
  status: "correct" | "incorrect"; 
};

// Props for the whole screen — optional overrides, mainly for testing.
export type ExamResultsScreenProps = {
  examTitle?: string;
  examCode?: string;
  durationMinutes?: number;
  passMark?: number | null;
  rows?: StudentResultRow[];
};