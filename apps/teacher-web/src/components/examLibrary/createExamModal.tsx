import { useState } from "react";

export function CreateExamModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  error
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (title: string) => void;
  isSubmitting?: boolean;
  error?: string | null;
}) {
  const [title, setTitle] = useState(""); // what the teacher types as exam title

  if (!isOpen) return null; // render nothing when modal is closed

  const trimmedTitle = title.trim();
  const canSubmit = trimmedTitle.length > 0 && !isSubmitting; // blocks blank titles

  const handleSubmit = () => {
    if (!canSubmit) return; // guard against empty submit
    onSubmit(trimmedTitle);
  };

  return (
    // full-screen dim backdrop, click outside closes the modal
    <div
      onClick={onClose}
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
    >
      {/* modal card itself, stops clicks from closing it */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[420px] p-6 rounded-xl border bg-[var(--color-base-100)] border-[var(--color-base-300)]"
      >
        <h2 className="text-[18px] font-bold mb-1 text-[var(--color-base-content)]">
          Name Your Assessment
        </h2>
        <p className="text-[13px] mb-4 text-[var(--color-base-content)] opacity-60">
          Give this exam a title. You can add questions and settings next.
        </p>

        <label className="block text-[13px] font-medium mb-2 text-[var(--color-base-content)]">
          Exam Title
        </label>
        <input
          type="text"
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="e.g. Midterm: Data Structures"
          className="w-full px-3 py-2 rounded-lg border text-[14px] outline-none mb-5 bg-[var(--color-base-200)] border-[var(--color-base-300)] text-[var(--color-base-content)] font-[inherit]"
        />

        {error && (
          <p className="text-[13px] mb-3" style={{ color: "var(--color-error)" }}>
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-[var(--color-base-300)] text-[13px] font-medium cursor-pointer transition-opacity hover:opacity-70 bg-[var(--color-base-100)] text-[var(--color-base-content)]"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-none transition-opacity hover:opacity-90 bg-[var(--color-primary)] text-[var(--color-primary-content)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Creating..." : "Create & Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}