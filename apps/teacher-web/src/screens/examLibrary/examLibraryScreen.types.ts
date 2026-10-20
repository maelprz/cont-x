// Sameexam can be attached to several classes independently in ClassExamStatus.
export type ExamStatus = "draft" | "saved";

// matches class_exams.status exactly
export type ClassExamStatus = "scheduled" | "active" | "ended";

// one row of "this exam, as attached to one class" — an exam can have several of these
export interface ClassExamSummary {
  classExamId: string;
  classId: string;
  className: string;
  status: ClassExamStatus;
  studentCount: number; // exam_sessions count for this class attachment
}

// one subject tile on the top level of the Exam Library — exams live under these
export interface SubjectCard {
  id: string;
  name: string;
  examCount: number;
  classCount: number; // this teacher's own classes under the subject
  liveClassCount: number; // class attachments currently active, across every exam in the subject
  // false when the teacher still owns exams under a subject they're no longer
  // assigned to — shown so those exams don't silently vanish, but nothing new
  // can be created there (the exams insert policy requires an assignment)
  isAssigned: boolean;
}

export interface ExamCard {
  id: string;
  subjectId: string; // which subject this exam lives under
  code: string; // exam_code in db - one per exam, shared across every class it's attached to
  title: string;
  description: string;
  status: ExamStatus; // draft | saved
  questionCount: number;
  createdAt: string; // e.g. "Oct 12, 2023"
  classAttachments: ClassExamSummary[]; // empty until published to at least one class
  lastEditedLabel?: string; // e.g. "Last edited 2h ago"
  footerMeta?: string; // e.g. "Quality Audited"
  ctaLabel?: string; // override CTA text, e.g. "Continue Building"
  onCta?: () => void;
}