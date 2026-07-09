import { useState, useEffect } from "react";

// Small, focused modal shown only when Publish is clicked on an exam
// that has no session code set yet — collects one, then publishes.
export function SetSessionCodeModal({
  isOpen,
  isProcessing,
  error,
  onCancel,
  onConfirm,
}: {
  isOpen: boolean;
  isProcessing: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: (code: string) => void;
}) {
  const [code, setCode] = useState("");

  useEffect(() => {
    if (isOpen) setCode(""); // reset each time this reopens for a different exam
  }, [isOpen]);

  if (!isOpen) return null;

  const canSubmit = code.length === 6 && !isProcessing;

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
        <h2 className="text-[17px] font-bold mb-1" style={{ color: "var(--color-base-content)" }}>
          Set a Session Code
        </h2>
        <p className="text-[13px] mb-4 opacity-60" style={{ color: "var(--color-base-content)" }}>
          This exam needs a 6-digit session code before it can be published. Students enter this
          right before their session begins.
        </p>

        <input
          type="text"
          autoFocus
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))}
          placeholder="6-digit code"
          className="w-full px-3 py-2 rounded-lg border text-[14px] outline-none mb-4 font-mono bg-[var(--color-base-200)] border-[var(--color-base-300)] text-[var(--color-base-content)]"
        />

        {error && (
          <p className="text-[13px] mb-3" style={{ color: "var(--color-error)" }}>
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
            onClick={() => onConfirm(code)}
            disabled={!canSubmit}
            className="px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-none transition-opacity hover:opacity-90 bg-[var(--color-primary)] text-[var(--color-primary-content)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? "Publishing..." : "Set Code & Publish"}
          </button>
        </div>
      </div>
    </div>
  );
}