// Defines the shape of data the teacher Dashboard screen needs.

export interface ExamSummaryCard {
  label: string;   // e.g. "Active Exams"
  value: string;   // e.g. "3"
  subtext: string; // e.g. "Currently running"
}

export interface DashboardScreenProps {
  summaryCards?: ExamSummaryCard[];
}