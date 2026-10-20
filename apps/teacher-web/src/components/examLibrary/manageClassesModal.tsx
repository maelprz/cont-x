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
  onRemove: (classExamId: string) => void; // only ever enabled for 'scheduled' rows
  onEditSettings: (classExamId: string) => void;
  onNavigate: (classExamId: string, targetScreen: "violationMonitoring" | "examResults") => void;
}) {
  if (!isOpen || !exam) return null;

  const renderRowAction = (attachment: ClassExamSummary) => {
    if (attachment.status === "scheduled") {
      return (
        <button
          onClick={() => onActivate(attachment.classExamId)}
          disabled={isProcessing}
          className="px-3 py-1.5 rounded-lg text-[12px] font-semibold cursor-pointer border-none transition-opacity hover:opacity-90 bg-[var(--color-primary)] text-[var(--color-primary-content)] disabled:opacity-50"
        >
          Publish
        </button>
      );
    }

    const nav = getClassExamNavigation(attachment.status);
    return (
      <button
        onClick={() => nav && onNavigate(attachment.classExamId, nav.targetScreen as "violationMonitoring" | "examResults")}
        className="px-3 py-1.5 rounded-lg text-[12px] font-semibold cursor-pointer border border-[var(--color-base-300)] transition-opacity hover:opacity-70 bg-[var(--color-base-100)] text-[var(--color-base-content)]"
      >
        {nav?.ctaLabel ?? "View"}
      </button>
    );
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[520px] p-6 rounded-xl border bg-[var(--color-base-100)] border-[var(--color-base-300)] max-h-[85vh] overflow-y-auto"
      >
        <h2 className="text-[18px] font-bold mb-1 text-[var(--color-base-content)]">Manage Classes</h2>
        <p className="text-[13px] mb-5 text-[var(--color-base-content)] opacity-60">{exam.title}</p>

        {error && (
          <p className="text-[13px] mb-4" style={{ color: "var(--color-error)" }}>
            {error}
          </p>
        )}

        {exam.classAttachments.length === 0 ? (
          <p className="text-[13px] mb-5 opacity-60 text-[var(--color-base-content)]">
            This exam isn't in any class yet.
          </p>
        ) : (
          <div className="flex flex-col gap-2 mb-5">
            {exam.classAttachments.map((attachment) => (
              <div
                key={attachment.classExamId}
                className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border border-[var(--color-base-300)]"
              >
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold text-[var(--color-base-content)] truncate">
                      {attachment.className}
                    </span>
                    <ClassExamStatusBadge status={attachment.status} />
                  </div>
                  <span className="text-[11px] opacity-55 text-[var(--color-base-content)]">
                    {attachment.studentCount} students
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {attachment.status === "active" && (
                    <button
                      onClick={() => onEnd(attachment.classExamId)}
                      disabled={isProcessing}
                      className="px-3 py-1.5 rounded-lg text-[12px] font-semibold cursor-pointer border-none transition-opacity hover:opacity-90 bg-[var(--color-error)] text-[var(--color-error-content)] disabled:opacity-50"
                    >
                      End
                    </button>
                  )}
                  {attachment.status !== "ended" && (
                    <button
                      onClick={() => onEditSettings(attachment.classExamId)}
                      disabled={isProcessing}
                      className="px-3 py-1.5 rounded-lg text-[12px] font-medium cursor-pointer border border-[var(--color-base-300)] transition-opacity hover:opacity-70 bg-[var(--color-base-100)] text-[var(--color-base-content)] disabled:opacity-50"
                    >
                      Settings
                    </button>
                  )}
                  {attachment.status === "scheduled" && (
                    <button
                      onClick={() => onRemove(attachment.classExamId)}
                      disabled={isProcessing}
                      title="Remove from this class"
                      className="px-2 py-1.5 rounded-lg text-[12px] cursor-pointer border-none transition-opacity hover:opacity-70 bg-transparent text-[var(--color-error)] disabled:opacity-50"
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

        <button
          onClick={onAttachNew}
          className="w-full px-4 py-2 mb-5 rounded-lg border border-dashed text-[13px] font-medium cursor-pointer transition-opacity hover:opacity-70 bg-transparent border-[var(--color-base-300)] text-[var(--color-base-content)]"
        >
          + Add to Another Class
        </button>

        <div className="flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-none transition-opacity hover:opacity-90 bg-[var(--color-primary)] text-[var(--color-primary-content)]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}