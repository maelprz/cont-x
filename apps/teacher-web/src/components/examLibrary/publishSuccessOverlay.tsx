type PublishSuccessOverlayProps = {
  isOpen: boolean;
  examCode: string;
  onClose: () => void;
};

// shown right after publishing, so the teacher can grab the join code
export function PublishSuccessOverlay({
  isOpen,
  examCode,
  onClose,
}: PublishSuccessOverlayProps) {
  if (!isOpen) return null; // render nothing when closed

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[420px] p-6 rounded-xl border bg-[var(--color-base-100)] border-[var(--color-base-300)]"
      >
        <h2 className="text-[18px] font-bold mb-1 text-[var(--color-base-content)]">
          Exam Published
        </h2>
        <p className="text-[13px] mb-3 text-[var(--color-base-content)] opacity-60">
          Share this code with your students so they can join.
        </p>

        <div className="w-full px-3 py-3 rounded-lg border mb-5 text-center text-[20px] font-mono font-bold tracking-widest bg-[var(--color-base-200)] border-[var(--color-base-300)] text-[var(--color-base-content)]">
          {examCode}
        </div>

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
