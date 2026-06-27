export interface ExamDetail {
  label: string;
  value: string;
  subtext: string;
}

export interface ExamConfirmationScreenProps {
  examTitle?: string;
  courseCode?: string;
  studentName?: string;
  studentId?: string;
  examDetails?: ExamDetail[];
  onStartExam?: () => void;
  onCancel?: () => void;
}

export type ExamStartState = 'idle' | 'initializing' | 'locked';