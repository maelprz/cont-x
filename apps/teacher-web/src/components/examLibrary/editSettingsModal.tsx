import { useState, useEffect } from "react";
import { useExamSettings } from "../../hooks/useExamSettings";
import { useUpdateExamSettingsForm } from "../../hooks/useUpdateExamSettingsForm";
import { isoToLocalInputValue, localInputValueToIso } from "../../lib/scheduleDateTime";

// editing setting for a single class attachment
export function EditSettingsModal({
  isOpen,
  classExamId,
  onClose,
  onSaved,
}: {
  isOpen: boolean;
  classExamId: string | null;
  onClose: () => void;
  onSaved: () => void; // called after a successful save, so the parent can refetch
}) {
  const { settings, isLoading, error: loadError } = useExamSettings(isOpen ? classExamId : null);
  const { saveSettings, isSaving, error: saveError } = useUpdateExamSettingsForm();

  const [durationHours, setDurationHours] = useState(0);
  const [durationMinutesInput, setDurationMinutesInput] = useState(0);
  const [isScheduled, setIsScheduled] = useState(false);
  const [startsAtInput, setStartsAtInput] = useState("");
  const [endsAtInput, setEndsAtInput] = useState("");
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [passMarkInput, setPassMarkInput] = useState(""); // blank = no minimum
  const [verificationCode, setVerificationCode] = useState("");
  const [randomizeOrder, setRandomizeOrder] = useState(false);

  // fills the form once real settings arrive for this class attachment
  useEffect(() => {
    if (!settings) return;
    setDurationHours(Math.floor(settings.durationMinutes / 60));
    setDurationMinutesInput(settings.durationMinutes % 60);
    setMaxAttempts(settings.maxAttempts);
    setPassMarkInput(settings.passMark !== null ? String(settings.passMark) : "");
    setVerificationCode(settings.verificationCode ?? "");
    setRandomizeOrder(settings.randomizeOrder);
    setIsScheduled(settings.startsAt !== null || settings.endsAt !== null);
    setStartsAtInput(isoToLocalInputValue(settings.startsAt));
    setEndsAtInput(isoToLocalInputValue(settings.endsAt));
  }, [settings]);

  if (!isOpen) return null; // render nothing when closed

  // session code can only be changed before this class goes live
  const canEditVerificationCode = settings?.status === "scheduled";

  const handleSave = async () => {
    if (!classExamId) return;

    const totalMinutes = durationHours * 60 + durationMinutesInput;
    const trimmedPassMark = passMarkInput.trim();

    const didSave = await saveSettings(classExamId, {
      maxAttempts,
      durationMinutes: totalMinutes,
      passMark: trimmedPassMark === "" ? null : Number(trimmedPassMark),
      randomizeOrder,
      ...(canEditVerificationCode ? { verificationCode: verificationCode.trim() } : {}),
      startsAt: isScheduled ? localInputValueToIso(startsAtInput) : null,
      endsAt: isScheduled ? localInputValueToIso(endsAtInput) : null,
    });

    if (didSave) {
      onSaved();
      onClose();
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[440px] p-6 rounded-xl border bg-[var(--color-base-100)] border-[var(--color-base-300)] max-h-[85vh] overflow-y-auto"
      >
        <h2 className="text-[18px] font-bold mb-1 text-[var(--color-base-content)]">Edit Settings</h2>
        <p className="text-[13px] mb-5 text-[var(--color-base-content)] opacity-60">
          {settings ? `Update settings for ${settings.className}.` : "Update this class's settings."}
        </p>

        {isLoading && <p className="text-[13px] opacity-60 mb-4">Loading settings...</p>}
        {loadError && (
          <p className="text-[13px] mb-4" style={{ color: "var(--color-error)" }}>
            {loadError}
          </p>
        )}

        {settings && (
          <>
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
            </div>

            <label className="flex items-center gap-2 mb-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isScheduled}
                onChange={(e) => setIsScheduled(e.target.checked)}
              />
              <span className="text-[13px] font-medium text-[var(--color-base-content)]">
                Schedule this class automatically
              </span>
            </label>

            {isScheduled && (
              <div className="flex flex-col gap-3 mb-4 pl-1">
                <div>
                  <label className="block text-[11px] mb-1 text-[var(--color-base-content)] opacity-60">
                    Auto-publish at
                  </label>
                  <input
                    type="datetime-local"
                    value={startsAtInput}
                    onChange={(e) => setStartsAtInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border text-[13px] bg-[var(--color-base-200)] border-[var(--color-base-300)] text-[var(--color-base-content)]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] mb-1 text-[var(--color-base-content)] opacity-60">
                    Auto-end at
                  </label>
                  <input
                    type="datetime-local"
                    value={endsAtInput}
                    onChange={(e) => setEndsAtInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border text-[13px] bg-[var(--color-base-200)] border-[var(--color-base-300)] text-[var(--color-base-content)]"
                  />
                </div>
              </div>
            )}

            <div className="flex items-end gap-3 mb-4">
              <div>
                <label className="block text-[13px] font-medium mb-2 text-[var(--color-base-content)]">
                  Allowed Attempts
                </label>
                <input
                  type="number"
                  min={1}
                  value={maxAttempts}
                  onChange={(e) => setMaxAttempts(Math.max(1, Number(e.target.value)))}
                  className="w-20 px-3 py-2 rounded-lg border text-[13px] bg-[var(--color-base-200)] border-[var(--color-base-300)] text-[var(--color-base-content)]"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium mb-2 text-[var(--color-base-content)]">
                  Pass Mark <span style={{ opacity: 0.5, fontWeight: 400 }}>(optional)</span>
                </label>
                <input
                  type="number"
                  min={0}
                  value={passMarkInput}
                  onChange={(e) => setPassMarkInput(e.target.value)}
                  placeholder="No minimum"
                  className="w-28 px-3 py-2 rounded-lg border text-[13px] bg-[var(--color-base-200)] border-[var(--color-base-300)] text-[var(--color-base-content)]"
                />
              </div>
            </div>

            <label className="block text-[13px] font-medium mb-2 text-[var(--color-base-content)]">
              Session Code
            </label>
            {canEditVerificationCode ? (
              <input
                type="text"
                maxLength={6}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="6-digit code"
                className="w-32 px-3 py-2 rounded-lg border text-[13px] mb-1 bg-[var(--color-base-200)] border-[var(--color-base-300)] text-[var(--color-base-content)] font-mono"
              />
            ) : (
              <p className="text-[12px] mb-1 opacity-60 text-[var(--color-base-content)]">
                {settings.verificationCode ?? "—"} (locked — this class is already live or has ended)
              </p>
            )}
            <p className="text-[11px] mb-4 opacity-50 text-[var(--color-base-content)]">
              Students enter this right before their session begins.
            </p>

            <label className="flex items-center gap-2 mb-5 cursor-pointer">
              <input
                type="checkbox"
                checked={randomizeOrder}
                onChange={(e) => setRandomizeOrder(e.target.checked)}
              />
              <span className="text-[13px] text-[var(--color-base-content)]">
                Shuffle question order for each student
              </span>
            </label>

            {saveError && (
              <p className="text-[13px] mb-3" style={{ color: "var(--color-error)" }}>
                {saveError}
              </p>
            )}
          </>
        )}

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-[var(--color-base-300)] text-[13px] font-medium cursor-pointer transition-opacity hover:opacity-70 bg-[var(--color-base-100)] text-[var(--color-base-content)]"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !settings}
            className="px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-none transition-opacity hover:opacity-90 bg-[var(--color-primary)] text-[var(--color-primary-content)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}