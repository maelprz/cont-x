// One metric card shown on the result screen (score, time taken, total score).
export interface ResultMetric {
  label: string;     // small uppercase label e.g. "Time Taken"
  value: string;      // the big number/value e.g. "01:42:15"
  subtext: string;   // smaller helper text below the value
}

// Props the screen accepts. All optional with mock defaults for now,
// same pattern as ExamConfirmationScreenProps.
export interface ExamResultScreenProps {
  examTitle?: string;
  courseCode?: string;
  completedDate?: string;
  sessionId?: string;
  passed?: boolean;
  finalScore?: number;       // out of 100
  validatedGrade?: string;   // e.g. "Excellent"
  metrics?: ResultMetric[];
  onReturnToDashboard?: () => void;
}