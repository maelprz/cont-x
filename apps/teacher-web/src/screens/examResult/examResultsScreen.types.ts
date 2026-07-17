// Shape of one row in the results table.
export type StudentResultRow = {
  sessionId: string; // maps to exam_sessions.id
  studentName: string; // maps to users.first_name + last_name
  totalScore: number; // maps to exam_sessions.total_score
  maxScore: number; // sum of questions.max_points for this exam
  attemptNumber: number; // maps to exam_sessions.attempt_number
  questionScores: QuestionScoreCell[]; // one cell per question
};

// One per-question cell in a result row.
export type QuestionScoreCell = {
  questionId: string; // maps to questions.id
  label: string; // e.g. "Q1", built from question order
  maxPoints: number; // maps to questions.max_points
  score: number; // maps to student_answers.score
  status: "correct" | "incorrect"; // binary only, derived from score vs maxPoints
};

// Props for the whole screen — optional overrides, mainly for testing.
export type ExamResultsScreenProps = {
  examTitle?: string;
  examCode?: string;
  durationMinutes?: number;
  passMark?: number;
  rows?: StudentResultRow[];
};
