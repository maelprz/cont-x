export type ViolationSessionRow = {
  id: string;
  studentIdNumber: string;
  studentName: string;
  attemptNumber: number;
  status: "in_progress" | "submitted" | "timed_out" | "removed";
  joinedAt: string;
  submittedAt: string | null;
  violationCount: number;
  removedAt: string | null;
};

export type ViolationDetailRow = {
  id: string;
  violationType: "alt_tab" | "windows" | "screenshot" | "copy_paste";
  details: string | null;
  loggedAt: string;
  questionTitle: string | null;
};

export type ClassLogEntry = {
  id: string;
  kind: "violation" | "removal";
  occurredAt: string;
  studentName: string;
  attemptNumber: number;
  violationType: ViolationDetailRow["violationType"] | null;
  details: string | null;
  questionTitle: string | null;
};
