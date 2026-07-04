import type { ExamStatus } from "../../screens/examLibrary/examLibraryScreen.types";

const STATUS_STYLES: Record<
  ExamStatus,
  { label: string; bg: string; text: string }
> = {
  draft: {
    label: "Draft",
    bg: "var(--color-base-300)",
    text: "var(--color-base-content)",
  },
  saved: {
    label: "Saved",
    bg: "var(--color-accent)", // distinct from draft, signals "ready to publish"
    text: "var(--color-accent-content)",
  },
  active: {
    label: "Published",
    bg: "var(--color-secondary)",
    text: "var(--color-secondary-content)",
  },
  ended: {
    label: "Ended",
    bg: "var(--color-warning)",
    text: "var(--color-warning-content)",
  },
};

export function StatusBadge({ status }: { status: ExamStatus }) {
  const { label, bg, text } = STATUS_STYLES[status];

  return (
    <span
      className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide"
      style={{ backgroundColor: bg, color: text }}
    >
      {label}
    </span>
  );
}
