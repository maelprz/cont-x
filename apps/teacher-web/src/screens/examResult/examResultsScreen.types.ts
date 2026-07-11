// Shape of one row in the results table — mock now, mirrors a future
// exam_sessions + student_answers + questions join.
export type StudentResultRow = {
  sessionId: string; // maps to exam_sessions.id later
  studentName: string; // maps to users.first_name + last_name
  totalScore: number; // maps to exam_sessions.total_score
  maxScore: number; // sum of questions.max_points for this exam
  attemptNumber: number; // maps to exam_sessions.attempt_number
  questionScores: QuestionScoreCell[]; // one cell per question
};

// One per-question cell in a result row.
export type QuestionScoreCell = {
  questionId: string; // maps to questions.id
  label: string; // e.g. "Q1", built from questions.order_index
  maxPoints: number; // maps to questions.max_points
  score: number; // maps to student_answers.score
  status: "correct" | "incorrect" | "partial"; // derived, not stored directly
};

// Props for the whole screen — optional overrides for later wiring.
export type ExamResultsScreenProps = {
  examTitle?: string; // maps to exams.title
  examCode?: string; // maps to exams.exam_code
  durationMinutes?: number; // maps to exams.duration_minutes
  passMark?: number; // maps to exams.pass_mark
  rows?: StudentResultRow[]; // overrides mock data if passed in
};
