import type { ExamStatus, ClassExamStatus } from "../../screens/examLibrary/examLibraryScreen.types";

const EXAM_STATUS_STYLES: Record<ExamStatus, { label: string; bg: string; text: string }> = {
  draft: {
    label: "Draft",
    bg: "var(--color-base-300)",
    text: "var(--color-base-content)",
  },
  saved: {
    label: "Saved",
    bg: "var(--color-accent)", // signals "ready to publish"
    text: "var(--color-accent-content)",
  },
};

// this is the exam's own authoring badge
export function StatusBadge({ status }: { status: ExamStatus }) {
  const { label, bg, text } = EXAM_STATUS_STYLES[status];
  return (
    <span
      className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide"
      style={{ backgroundColor: bg, color: text }}
    >
      {label}
    </span>
  );
}

const CLASS_EXAM_STATUS_STYLES: Record<ClassExamStatus, { label: string; bg: string; text: string }> = {
  scheduled: {
    label: "Scheduled",
    bg: "var(--color-base-300)",
    text: "var(--color-base-content)",
  },
  active: {
    label: "Live",
    bg: "var(--color-secondary)", // same color the old "active" exam badge used
    text: "var(--color-secondary-content)",
  },
  ended: {
    label: "Ended",
    bg: "var(--color-warning)",
    text: "var(--color-warning-content)",
  },
};

// class exam status badge, for the class exam card in the library
export function ClassExamStatusBadge({ status }: { status: ClassExamStatus }) {
  const { label, bg, text } = CLASS_EXAM_STATUS_STYLES[status];
  return (
    <span
      className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide"
      style={{ backgroundColor: bg, color: text }}
    >
      {label}
    </span>
  );
}