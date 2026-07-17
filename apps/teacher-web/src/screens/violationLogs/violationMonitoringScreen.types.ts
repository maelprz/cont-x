export type ViolationSessionRow = {
  id: string;
  studentIdNumber: string;
  studentName: string;
  attemptNumber: number;
  status: "in_progress" | "submitted" | "timed_out";
  joinedAt: string;
  submittedAt: string | null;
  violationCount: number;
};

export type ViolationDetailRow = {
  id: string;
  violationType: "alt_tab" | "windows" | "screenshot" | "copy_paste";
  details: string | null;
  loggedAt: string;
};

export type ViolationMonitoringScreenProps = {
  examId: string;
  examTitle?: string;
};
