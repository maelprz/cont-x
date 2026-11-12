type PublishSuccessOverlayProps = {
  isOpen: boolean;
  examCode: string;
  sessionCode: string;
  onClose: () => void;
};

// Shown after publishing with the exam-wide code and this class's session code.
export function PublishSuccessOverlay({
  isOpen,
  examCode,
  sessionCode,
  onClose,
}: PublishSuccessOverlayProps) {
  if (!isOpen) return null; // render nothing when closed

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="publish-success-title"
        className="w-full max-w-[420px] rounded-xl border border-[var(--color-base-300)] bg-[var(--color-base-100)] p-6"
      >
        <h2 id="publish-success-title" className="text-[18px] font-bold mb-1 text-[var(--color-base-content)]">
          Exam Published
        </h2>
        <p className="text-[13px] mb-3 text-[var(--color-base-content)] opacity-60">
          Students use the exam code to find the exam and the session code to start their attempt.
        </p>

        <dl className="mb-5 grid gap-3 text-[var(--color-base-content)]">
          {[
            { label: "Exam code", code: examCode },
            { label: "Session code", code: sessionCode },
          ].map(({ label, code }) => (
            <div key={label} className="rounded-lg border border-[var(--color-base-300)] bg-[var(--color-base-200)] px-3 py-3 text-center">
              <dt className="mb-1 text-[12px] font-medium opacity-60">{label}</dt>
              <dd className="break-all font-mono text-[20px] font-bold tracking-widest">{code}</dd>
            </div>
          ))}
        </dl>

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
