// Shape of one row in the results table.
export type StudentResultRow = {
  sessionId: string; // maps to exam_sessions.id
  studentName: string; // maps to users.first_name + last_name
  studentIdNumber: string | null; // maps to users.id_number
  scoreAdjustment: number; // manual change on top of the auto-graded score (0 when none)
  adjustmentReason: string | null; // why the teacher adjusted it
  totalScore: number; // maps to exam_sessions.total_score
  maxScore: number; // fixed questions' max points plus the points of the pooled questions this student drew
  attemptNumber: number; // maps to exam_sessions.attempt_number
  questionScores: QuestionScoreCell[]; // one cell per question
  poolScores: PoolScoreCell[]; // one cell per random pool this student drew from
};

// What one student earned in one random pool; students draw different questions,
// so the pool's maximum is for the questions THIS student drew.
export type PoolScoreCell = {
  poolKey: string; // the pool's id, or its position if the pool was deleted later
  poolOrder: number; // the pool's position in the exam, for column order
  title: string; // the pool's title, or "Random pool"
  drawnCount: number; // how many questions this student drew from it
  score: number; // points earned across those questions
  maxPoints: number; // points those questions were worth
};

// One per-question cell in a result row.
export type QuestionScoreCell = {
  questionId: string; // maps to questions.id
  label: string; // e.g. "Q1", built from question order
  title: string; // maps to questions.title
  maxPoints: number; // maps to questions.max_points
  score: number; // maps to student_answers.score
  status: "correct" | "incorrect"; // binary only, derived from score vs maxPoints
};

// Props for the whole screen — optional overrides, mainly for testing.
export type ExamResultsScreenProps = {
  examTitle?: string;
  examCode?: string;
  durationMinutes?: number;
  passMark?: number | null;
  rows?: StudentResultRow[];
};