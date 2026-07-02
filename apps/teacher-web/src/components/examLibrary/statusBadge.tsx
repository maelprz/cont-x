import type { ExamStatus } from "../../screens/examLibrary/examLibraryScreen.types";

export function StatusBadge({ status }: { status: ExamStatus }) {
  const base = "px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide";

  if (status === "published")
    return (
      <span
        className={base}
        style={{
          backgroundColor: "var(--color-secondary)",
          color: "var(--color-secondary-content)",
        }}
      >
        Published
      </span>
    );

  if (status === "draft")
    return (
      <span
        className={base}
        style={{
          backgroundColor: "var(--color-base-300)",
          color: "var(--color-base-content)",
        }}
      >
        Draft
      </span>
    );

  return (
    <span
      className={base}
      style={{
        backgroundColor: "var(--color-warning)",
        color: "var(--color-warning-content)",
      }}
    >
      Ended
    </span>
  );
}