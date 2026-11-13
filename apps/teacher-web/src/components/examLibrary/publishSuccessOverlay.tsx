import { ExamDialog, examPrimary } from "./examDialog";

type PublishSuccessOverlayProps = {
  isOpen: boolean;
  examCode: string;
  sessionCode: string;
  reopenedUntil?: string;
  onClose: () => void;
};

// Shown after publishing with the exam-wide code and this class's session code.
export function PublishSuccessOverlay({
  isOpen,
  examCode,
  sessionCode,
  reopenedUntil,
  onClose,
}: PublishSuccessOverlayProps) {
  if (!isOpen) return null; // render nothing when closed

  return (
    <ExamDialog title={reopenedUntil ? "Exam reopened" : "Exam published"} onClose={onClose}
      footer={<button type="button" className={examPrimary} onClick={onClose}>Done</button>}>
      <p className="text-[13px] mb-3 text-[var(--color-base-content)] opacity-60">
        Students use the exam code to find the exam and the session code to start their attempt.
      </p>
      {reopenedUntil && (
        <p className="mb-3 text-[13px] text-[var(--color-base-content)]">
          Entry closes {new Date(reopenedUntil).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}.
        </p>
      )}

      <dl className="grid gap-3 sm:grid-cols-2 text-[var(--color-base-content)]">
        {[
          { label: "Exam code", code: examCode },
          { label: "Session code", code: sessionCode },
        ].map(({ label, code }) => (
          <div key={label} className="rounded-lg border border-[var(--color-base-300)] bg-[var(--color-base-200)] px-3 py-3 text-center">
            <dt className="mb-1 text-[12px] font-medium opacity-60">{label}</dt>
            <dd className="break-all text-xl font-bold tabular-nums">{code}</dd>
          </div>
        ))}
      </dl>
    </ExamDialog>
  );
}
