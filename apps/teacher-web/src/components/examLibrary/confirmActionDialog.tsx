type ConfirmActionDialogProps = {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  isProcessing: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
};

// generic yes/no confirmation, reused for both End Exam and Delete Exam
export function ConfirmActionDialog({
  isOpen,
  title,
  message,
  confirmLabel,
  isProcessing,
  error,
  onConfirm,
  onCancel,
}: ConfirmActionDialogProps) {
  if (!isOpen) return null; // render nothing when closed

  return (
    <div
      onClick={onCancel}
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[380px] p-6 rounded-xl border bg-[var(--color-base-100)] border-[var(--color-base-300)]"
      >
        <h2 className="text-[17px] font-bold mb-1 text-[var(--color-base-content)]">
          {title}
        </h2>
        <p className="text-[13px] mb-4 text-[var(--color-base-content)] opacity-60">
          {message}
        </p>

        {error && (
          <p
            className="text-[13px] mb-3"
            style={{ color: "var(--color-error)" }}
          >
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-[var(--color-base-300)] text-[13px] font-medium cursor-pointer transition-opacity hover:opacity-70 bg-[var(--color-base-100)] text-[var(--color-base-content)]"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isProcessing}
            className="px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-none transition-opacity hover:opacity-90 bg-[var(--color-error)] text-[var(--color-error-content)] disabled:opacity-50"
          >
            {isProcessing ? "Please wait..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
