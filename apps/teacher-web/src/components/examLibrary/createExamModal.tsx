import { useState } from "react";
import type { NewExamSettings } from "../../services/examBuilderService";

export function CreateExamModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  error,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (settings: NewExamSettings) => void;
  isSubmitting?: boolean;
  error?: string | null;
}) {
  const [title, setTitle] = useState(""); // what the teacher types as exam title
  const [description, setDescription] = useState(""); // optional description
  const [durationHours, setDurationHours] = useState(1); // defaults to 1 hour, never 0 total
  const [durationMinutesInput, setDurationMinutesInput] = useState(0);
  const [maxAttempts, setMaxAttempts] = useState(1); // default matches the old single-attempt behavior

  if (!isOpen) return null; // render nothing when modal is closed

  const trimmedTitle = title.trim();
  const totalMinutes = durationHours * 60 + durationMinutesInput;
  const canSubmit = trimmedTitle.length > 0 && totalMinutes > 0 && !isSubmitting; // blocks blank title or zero duration

  const handleSubmit = () => {
    if (!canSubmit) return; // guard against invalid submit
    onSubmit({
      title: trimmedTitle,
      description: description.trim(),
      durationMinutes: totalMinutes,
      maxAttempts,
    });
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
        className="w-[460px] p-6 rounded-xl border bg-[var(--color-base-100)] border-[var(--color-base-300)]"
      >
        <h2 className="text-[18px] font-bold mb-1 text-[var(--color-base-content)]">
          Name Your Assessment
        </h2>
        <p className="text-[13px] mb-5 text-[var(--color-base-content)] opacity-60">
          Set the basics now. You can add questions next.
        </p>

        <label className="block text-[13px] font-medium mb-2 text-[var(--color-base-content)]">
          Exam Title
        </label>
        <input
          type="text"
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Midterm: Data Structures"
          className="w-full px-3 py-2 rounded-lg border text-[14px] outline-none mb-4 bg-[var(--color-base-200)] border-[var(--color-base-300)] text-[var(--color-base-content)] font-[inherit]"
        />

        <label className="block text-[13px] font-medium mb-2 text-[var(--color-base-content)]">
          Description <span style={{ opacity: 0.5, fontWeight: 400 }}>(optional)</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="Briefly describe what this exam covers"
          className="w-full px-3 py-2 rounded-lg border text-[13px] outline-none resize-none mb-4 bg-[var(--color-base-200)] border-[var(--color-base-300)] text-[var(--color-base-content)] font-[inherit]"
        />

        <label className="block text-[13px] font-medium mb-2 text-[var(--color-base-content)]">
          Exam Duration
        </label>
        <div className="flex items-end gap-3 mb-4">
          <div>
            <label className="block text-[11px] mb-1 text-[var(--color-base-content)] opacity-60">Hours</label>
            <input
              type="number"
              min={0}
              value={durationHours}
              onChange={(e) => setDurationHours(Math.max(0, Number(e.target.value)))}
              className="w-20 px-3 py-2 rounded-lg border text-[13px] bg-[var(--color-base-200)] border-[var(--color-base-300)] text-[var(--color-base-content)]"
            />
          </div>
          <div>
            <label className="block text-[11px] mb-1 text-[var(--color-base-content)] opacity-60">Minutes</label>
            <input
              type="number"
              min={0}
              max={59}
              value={durationMinutesInput}
              onChange={(e) => setDurationMinutesInput(Math.min(59, Math.max(0, Number(e.target.value))))}
              className="w-20 px-3 py-2 rounded-lg border text-[13px] bg-[var(--color-base-200)] border-[var(--color-base-300)] text-[var(--color-base-content)]"
            />
          </div>
          <span className="text-[12px] pb-2 text-[var(--color-base-content)] opacity-60">
            = {totalMinutes} minutes total
          </span>
        </div>

        <label className="block text-[13px] font-medium mb-2 text-[var(--color-base-content)]">
          Allowed Attempts
        </label>
        <input
          type="number"
          min={1}
          value={maxAttempts}
          onChange={(e) => setMaxAttempts(Math.max(1, Number(e.target.value)))}
          className="w-20 px-3 py-2 rounded-lg border text-[13px] mb-5 bg-[var(--color-base-200)] border-[var(--color-base-300)] text-[var(--color-base-content)]"
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