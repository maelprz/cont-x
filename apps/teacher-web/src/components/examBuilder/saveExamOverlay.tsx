import { useState } from "react";

type SaveExamOverlayProps = {
  isOpen: boolean;
  examCode: string | null;
  isSaving: boolean;
  error: string | null;
  onClose: () => void;
  onSaveOnly: () => Promise<boolean>;
  onPublish: (verificationCode: string) => Promise<boolean>;
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
  const [step, setStep] = useState<"choose" | "enterCode" | "published">(
    "choose",
  );
  const [codeInput, setCodeInput] = useState(""); // what the teacher types as the passcode

  if (!isOpen) return null;

  // only 6 digits count as a valid passcode, matching the student-side entry screen
  const isCodeValid = /^\d{6}$/.test(codeInput);

  const handleSaveOnly = async () => {
    const didSave = await onSaveOnly();
    if (didSave) handleClose();
  };

  // moves from choosing to actually typing the passcode
  const handleGoToEnterCode = () => setStep("enterCode");

  const handleConfirmPublish = async () => {
    if (!isCodeValid) return; // guard against bad input
    const didPublish = await onPublish(codeInput);
    if (didPublish) setStep("published");
  };

  const handleClose = () => {
    setStep("choose"); // reset so it starts fresh next time it opens
    setCodeInput("");
    onClose();
  };

  return (
    <div
      onClick={handleClose}
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[420px] p-6 rounded-xl border bg-[var(--color-base-100)] border-[var(--color-base-300)]"
      >
        {step === "choose" && (
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
                onClick={handleGoToEnterCode}
                disabled={isSaving}
                className="px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-none transition-opacity hover:opacity-90 bg-[var(--color-primary)] text-[var(--color-primary-content)] disabled:opacity-50"
              >
                Publish Exam
              </button>
            </div>
          </>
        )}

        {step === "enterCode" && (
          <>
            <h2 className="text-[18px] font-bold mb-1 text-[var(--color-base-content)]">
              Set Session Passcode
            </h2>
            <p className="text-[13px] mb-4 text-[var(--color-base-content)] opacity-60">
              Create a 6-digit passcode. You'll read this aloud to students
              right before they start — it's separate from the exam join code.
            </p>

            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              autoFocus
              value={codeInput}
              onChange={(e) =>
                setCodeInput(e.target.value.replace(/[^0-9]/g, ""))
              }
              placeholder="6-digit passcode"
              className="w-full px-3 py-2 rounded-lg border text-[16px] tracking-[0.3em] text-center outline-none mb-4 bg-[var(--color-base-200)] border-[var(--color-base-300)] text-[var(--color-base-content)] font-[inherit]"
            />

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
                onClick={() => setStep("choose")}
                disabled={isSaving}
                className="px-4 py-2 rounded-lg border border-[var(--color-base-300)] text-[13px] font-medium cursor-pointer transition-opacity hover:opacity-70 bg-[var(--color-base-100)] text-[var(--color-base-content)] disabled:opacity-50"
              >
                Back
              </button>
              <button
                onClick={handleConfirmPublish}
                disabled={!isCodeValid || isSaving}
                className="px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-none transition-opacity hover:opacity-90 bg-[var(--color-primary)] text-[var(--color-primary-content)] disabled:opacity-50"
              >
                {isSaving ? "Publishing..." : "Confirm & Publish"}
              </button>
            </div>
          </>
        )}

        {step === "published" && (
          <>
            <h2 className="text-[18px] font-bold mb-1 text-[var(--color-base-content)]">
              Exam Published
            </h2>
            <p className="text-[13px] mb-3 text-[var(--color-base-content)] opacity-60">
              Give students the join code below. Keep the passcode to yourself
              until it's time to start.
            </p>

            <div className="w-full px-3 py-3 rounded-lg border mb-3 text-center bg-[var(--color-base-200)] border-[var(--color-base-300)]">
              <p className="font-mono text-[9px] uppercase tracking-widest mb-1 text-[var(--color-base-content)] opacity-50">
                Join Code
              </p>
              <p className="text-[20px] font-mono font-bold tracking-widest text-[var(--color-base-content)]">
                {examCode}
              </p>
            </div>

            <div className="w-full px-3 py-3 rounded-lg border mb-5 text-center bg-[var(--color-base-200)] border-[var(--color-base-300)]">
              <p className="font-mono text-[9px] uppercase tracking-widest mb-1 text-[var(--color-base-content)] opacity-50">
                Session Passcode
              </p>
              <p className="text-[20px] font-mono font-bold tracking-widest text-[var(--color-base-content)]">
                {codeInput}
              </p>
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
