import { Plus } from "lucide-react";
import { ExamDialog, examDanger, examPrimary, examSecondary } from "./examDialog";
import type { ExamCard, ClassExamSummary } from "../../screens/examLibrary/examLibraryScreen.types";
import { ClassExamStatusBadge } from "./statusBadge";
import { getClassExamNavigation } from "../../router/examCardNavigation";

// NEW COMPONENT — this view didn't exist before the revision. An exam can
// now be attached to several classes at once, each with its own status, so
// "Publish"/"End" are no longer single buttons on the exam card — they're
// per-row actions here.
export function ManageClassesModal({
  isOpen,
  exam,
  isProcessing,
  error,
  onClose,
  onAttachNew,
  onActivate,
  onEnd,
  onReopen,
  onRemove,
  onEditSettings,
  onNavigate,
}: {
  isOpen: boolean;
  exam: ExamCard | null;
  isProcessing: boolean;
  error: string | null;
  onClose: () => void;
  onAttachNew: () => void;
  onActivate: (classExamId: string) => void; // may prompt for a session code first — parent decides
  onEnd: (classExamId: string) => void;
  onReopen: (classExamId: string) => void;
  onRemove: (classExamId: string) => void; // only ever enabled for 'scheduled' rows
  onEditSettings: (classExamId: string) => void;
  onNavigate: (classExamId: string, targetScreen: "studentMonitoring" | "examResults") => void;
}) {
  if (!isOpen || !exam) return null;

  const renderRowAction = (attachment: ClassExamSummary) => {
    if (attachment.status === "scheduled") {
      return (
        <button
          type="button"
          onClick={() => onActivate(attachment.classExamId)}
          disabled={isProcessing}
          className={examPrimary}
        >
          Publish
        </button>
      );
    }

    const nav = getClassExamNavigation(attachment.status);
    return (
      <button
        type="button"
        onClick={() => nav && onNavigate(attachment.classExamId, nav.targetScreen as "studentMonitoring" | "examResults")}
        className={examSecondary}
      >
        {nav?.ctaLabel ?? "View"}
      </button>
    );
  };

  return (
    <ExamDialog title="Manage classes" subtitle={exam.title} wide busy={isProcessing} onClose={onClose} dismissOnBackdrop
      footer={
        <button type="button" className={examPrimary} onClick={onAttachNew} disabled={isProcessing}>
          <Plus size={16} aria-hidden="true" /> Add to Another Class
        </button>
      }>
      {error && (
        <p className="text-[13px] mb-4" style={{ color: "var(--color-error)" }}>
          {error}
        </p>
      )}

      {exam.classAttachments.length === 0 ? (
        <p className="text-[13px] opacity-60 text-[var(--color-base-content)]">
          This exam isn't in any class yet.
        </p>
      ) : (
        <div className="divide-y divide-stone-200 border-y border-stone-200">
          {exam.classAttachments.map((attachment) => (
            <div
              key={attachment.classExamId}
              className="flex flex-wrap items-center justify-between gap-3 py-3"
            >
              <div className="flex flex-col gap-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold text-[var(--color-base-content)] truncate">
                    {attachment.className}
                  </span>
                    <ClassExamStatusBadge status={attachment.status} subtle />
                </div>
                <span className="text-[11px] opacity-55 text-[var(--color-base-content)]">
                  {attachment.studentCount} students
                </span>
              </div>

              <div className="flex max-w-full flex-wrap items-center gap-2">
                {attachment.status === "ended" && (
                  <button
                    type="button"
                    onClick={() => onReopen(attachment.classExamId)}
                    disabled={isProcessing}
                    className={examSecondary}
                  >
                    Reopen
                  </button>
                )}
                {attachment.status === "active" && (
                  <button
                    type="button"
                    onClick={() => onEnd(attachment.classExamId)}
                    disabled={isProcessing}
                    className={examDanger}
                  >
                    End
                  </button>
                )}
                {attachment.status !== "ended" && (
                  <button
                    type="button"
                    onClick={() => onEditSettings(attachment.classExamId)}
                    disabled={isProcessing}
                    className={examSecondary}
                  >
                    Settings
                  </button>
                )}
                {attachment.status === "scheduled" && (
                  <button
                    type="button"
                    onClick={() => onRemove(attachment.classExamId)}
                    disabled={isProcessing}
                    title="Remove from this class"
                    className={`${examSecondary} text-red-700 hover:bg-red-50`}
                  >
                    Remove
                  </button>
                )}
                {renderRowAction(attachment)}
              </div>
            </div>
          ))}
        </div>
      )}
    </ExamDialog>
  );
}
