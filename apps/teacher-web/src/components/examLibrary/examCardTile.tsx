import { Calendar, FileText, Users, Clock, BadgeCheck } from "lucide-react";
import type { ExamCard } from "../../screens/examLibrary/examLibraryScreen.types";
import { StatusBadge } from "./statusBadge";

// footer string for class attachments, e.g. "Live in 3 classes" or "Scheduled in 1 class"
function summarizeAttachments(exam: ExamCard): string | null {
  if (exam.classAttachments.length === 0) return null;

  const activeCount = exam.classAttachments.filter((a) => a.status === "active").length;
  if (activeCount > 0) return `Live in ${activeCount} class${activeCount === 1 ? "" : "es"}`;

  const scheduledCount = exam.classAttachments.filter((a) => a.status === "scheduled").length;
  if (scheduledCount > 0) return `Scheduled in ${scheduledCount} class${scheduledCount === 1 ? "" : "es"}`;

  return `Ended in ${exam.classAttachments.length} class${exam.classAttachments.length === 1 ? "" : "es"}`;
}

export function ExamCardTile({
  exam,
  onClick,
  menu,
}: {
  exam: ExamCard;
  onClick?: () => void;
  menu?: React.ReactNode; // the three-dot dropdown, passed in from the parent
}) {
  const isDraft = exam.status === "draft";
  const isClickable = Boolean(onClick);
  // replaces the old single exam.studentCount, which assumed one audience
  const totalStudents = exam.classAttachments.reduce((sum, a) => sum + a.studentCount, 0);
  const attachmentSummary = summarizeAttachments(exam);

  return (
    <div
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(event) => {
        if (!isClickable) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick?.();
        }
      }}
      className="flex flex-col rounded-2xl border overflow-hidden transition-shadow duration-200 hover:shadow-md bg-[var(--color-base-100)] border border-[var(--color-base-300)]"
      style={{ cursor: isClickable ? "pointer" : "default" }}
    >
      {/* Card body */}
      <div className="flex flex-col gap-3 p-5 flex-grow">
        {/* Status + menu row */}
        <div className="flex items-center justify-between">
          <StatusBadge status={exam.status} />
          {menu}
        </div>

        {/* Title + description */}
        <div>
          <h3 className="text-[16px] font-bold leading-snug mb-1 text-[var(--color-base-content)]">
            {exam.title}
          </h3>
          <p className="text-[13px] leading-relaxed text-[var(--color-base-content)] opacity-60">
            {exam.description}
          </p>
        </div>

        {/* Meta: questions + created */}
        <div className="flex items-start gap-6 mt-auto pt-2">
          <div className="flex items-center gap-1.5">
            <FileText
              size={14}
              style={{ color: "var(--color-base-content)", opacity: 0.5 }}
            />
            <div>
              <p className="font-mono text-[9px] font-semibold uppercase tracking-widest mb-0.5 text-[var(--color-base-content)] opacity-50">
                Questions
              </p>
              <p className="text-[14px] font-bold text-[var(--color-base-content)]">
                {exam.questionCount} Tasks
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Calendar
              size={14}
              style={{ color: "var(--color-base-content)", opacity: 0.5 }}
            />
            <div>
              <p className="font-mono text-[9px] font-semibold uppercase tracking-widest mb-0.5 text-[var(--color-base-content)] opacity-50">
                Created
              </p>
              <p className="text-[14px] font-bold text-[var(--color-base-content)]">
                {exam.createdAt}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Card footer */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--color-base-300)]">
        <div className="flex items-center gap-1.5 text-[12px] text-[var(--color-base-content)] opacity-55">
          {exam.classAttachments.length > 0 && (
            <>
              <Users size={13} />
              <span>{totalStudents} Students</span>
              {attachmentSummary && <span className="opacity-70">· {attachmentSummary}</span>}
            </>
          )}
          {isDraft && exam.lastEditedLabel && (
            <>
              <Clock size={13} />
              <span>{exam.lastEditedLabel}</span>
            </>
          )}
          {exam.footerMeta && (
            <>
              <BadgeCheck size={13} />
              <span>{exam.footerMeta}</span>
            </>
          )}
        </div>

        <button
          onClick={(event) => {
            event.stopPropagation();
            exam.onCta?.();
          }}
          className="flex items-center gap-1 text-[13px] font-bold cursor-pointer border-none bg-transparent transition-opacity duration-150 hover:opacity-70 text-[var(--color-secondary)]"
        >
          {exam.ctaLabel ?? "Edit Exam"}
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}