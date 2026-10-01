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

export interface ExamCard {
  id: string;
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

export interface ExamLibraryScreenProps {
  teacherName?: string;
  teacherAvatarUrl?: string;
  exams?: ExamCard[];
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  onFilter?: () => void;
  onToggleView?: () => void;
  onNewExam?: () => void;
  onCreateNewAssessment?: () => void;
  // Nav callbacks
  onNavOverview?: () => void;
  onNavLibrary?: () => void;
  onNavBell?: () => void;
  onNavHelp?: () => void;
  // Sidebar
  onSidebarLiveFeed?: () => void;
  onSidebarExamLibrary?: () => void;
  onSidebarResults?: () => void;
  onSidebarSettings?: () => void;
  onLogout?: () => void;
}