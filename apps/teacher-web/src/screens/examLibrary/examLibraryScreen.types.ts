export type ExamStatus = 'published' | 'draft' | 'ended';

export interface ExamCard {
  id: string;
  code: string;
  title: string;
  description: string;
  status: ExamStatus;
  questionCount: number;
  createdAt: string;           // display string e.g. "Oct 12, 2023"
  studentCount?: number;       // only on published exams
  lastEditedLabel?: string;    // e.g. "Last edited 2h ago" — shown on drafts
  footerMeta?: string;         // e.g. "Quality Audited" — shown on some published
  ctaLabel?: string;           // override CTA text, e.g. "Continue Building"
  onCta?: () => void;
  onMenuOpen?: () => void;
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