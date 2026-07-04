import { useState } from "react";

type SaveExamOverlayProps = {
  isOpen: boolean; // whether the overlay is visible
  examCode: string | null; // the exam's join code, shown after publishing
  isSaving: boolean; // true while a status update is in progress
  error: string | null; // shows if the status update failed
  onClose: () => void; // closes the overlay
  onSaveOnly: () => Promise<boolean>; // sets status to saved
  onPublish: () => Promise<boolean>; // sets status to active
};

export function SaveExamOverlay({
  isOpen,
  examCode,
  isSaving,
  error,
  onClose,
  onSaveOnly,
  onPublish,
}: SaveExamOverlayProps) {
  // tracks which screen inside the overlay to show
  const [step, setStep] = useState<"choose" | "published">("choose");

  if (!isOpen) return null; // render nothing when overlay is closed

  const handleSaveOnly = async () => {
    const didSave = await onSaveOnly();
    if (didSave) onClose(); // draft saved, nothing more to show
  };

  const handlePublish = async () => {
    const didPublish = await onPublish();
    if (didPublish) setStep("published"); // show the exam code next
  };

  const handleClose = () => {
    setStep("choose"); // reset so it starts fresh next time it opens
    onClose();
  };

  return (
    <div
      onClick={handleClose}
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
    >
      <div
        onClick={(e) => e.stopPropagation()} // clicks inside should not close it
        className="w-[420px] p-6 rounded-xl border bg-[var(--color-base-100)] border-[var(--color-base-300)]"
      >
        {step === "choose" ? (
          <>
            <h2 className="text-[18px] font-bold mb-1 text-[var(--color-base-content)]">
              Save Exam
            </h2>
            <p className="text-[13px] mb-5 text-[var(--color-base-content)] opacity-60">
              Publish this exam now so students can join, or just save it as a
              draft for later.
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
                onClick={handleSaveOnly}
                disabled={isSaving}
                className="px-4 py-2 rounded-lg border border-[var(--color-base-300)] text-[13px] font-medium cursor-pointer transition-opacity hover:opacity-70 bg-[var(--color-base-100)] text-[var(--color-base-content)] disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Just Save"}
              </button>
              <button
                onClick={handlePublish}
                disabled={isSaving}
                className="px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-none transition-opacity hover:opacity-90 bg-[var(--color-primary)] text-[var(--color-primary-content)] disabled:opacity-50"
              >
                {isSaving ? "Publishing..." : "Publish Exam"}
              </button>
            </div>
          </>
        ) : (
          <>
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
                onClick={handleClose}
                className="px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-none transition-opacity hover:opacity-90 bg-[var(--color-primary)] text-[var(--color-primary-content)]"
              >
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
