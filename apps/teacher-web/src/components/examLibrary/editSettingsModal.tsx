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
  const [displayAtInput, setDisplayAtInput] = useState("");
  const [startsAtInput, setStartsAtInput] = useState("");
  const [endsAtInput, setEndsAtInput] = useState("");
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [passMarkInput, setPassMarkInput] = useState(""); // blank = no minimum
  const [verificationCode, setVerificationCode] = useState("");
  const [randomizeOrder, setRandomizeOrder] = useState(false);
  const [allowOvertime, setAllowOvertime] = useState(false); // off = hard stop: answers are submitted automatically at time-up
  const [overtimeMinutes, setOvertimeMinutes] = useState("");
  const [overtimeDeduction, setOvertimeDeduction] = useState("");
  const [sequential, setSequential] = useState(false);
  const [allowReview, setAllowReview] = useState(false);
  const [deductionInput, setDeductionInput] = useState("0"); // points lost per answer change; 0 = off

  // fills the form once real settings arrive for this class attachment
  useEffect(() => {
    if (!settings) return;
    setDurationHours(Math.floor(settings.durationMinutes / 60));
    setDurationMinutesInput(settings.durationMinutes % 60);
    setMaxAttempts(settings.maxAttempts);
    setPassMarkInput(settings.passMark !== null ? String(settings.passMark) : "");
    setVerificationCode(settings.verificationCode ?? "");
    setRandomizeOrder(settings.randomizeOrder);
    setAllowOvertime(settings.allowOvertime);
    setOvertimeMinutes(String(settings.overtimeMinutes));
    setOvertimeDeduction(String(settings.overtimeDeduction));
    setSequential(settings.sequential);
    setAllowReview(settings.allowReview);
    setDeductionInput(String(settings.answerChangeDeduction));
    setIsScheduled(settings.displayAt !== null || settings.startsAt !== null || settings.endsAt !== null);
    setDisplayAtInput(isoToLocalInputValue(settings.displayAt));
    setStartsAtInput(isoToLocalInputValue(settings.startsAt));
    setEndsAtInput(isoToLocalInputValue(settings.endsAt));
  }, [settings]);

  if (!isOpen) return null; // render nothing when closed

  // session code can only be changed before this class goes live
  const canEditVerificationCode = settings?.status === "scheduled";

  // pass mark is a percent of the exam's total points; blank means no minimum
  const passMarkNumber = passMarkInput.trim() === "" ? null : Number(passMarkInput);
  const passMarkInvalid =
    passMarkNumber !== null &&
    (!Number.isFinite(passMarkNumber) || passMarkNumber < 0 || passMarkNumber > 100);

  // points lost each time a student changes an answer they already gave; blank counts as 0 (off)
  const deductionNumber = deductionInput.trim() === "" ? 0 : Number(deductionInput);
  const deductionInvalid = !Number.isFinite(deductionNumber) || deductionNumber < 0;

  const overtimeInvalid = allowOvertime && (!overtimeMinutes.trim() || !Number.isInteger(Number(overtimeMinutes)) || Number(overtimeMinutes) <= 0 || !overtimeDeduction.trim() || !Number.isFinite(Number(overtimeDeduction)) || Number(overtimeDeduction) < 0);

  const handleSave = async () => {
    if (!classExamId || passMarkInvalid || deductionInvalid || overtimeInvalid) return;

    const totalMinutes = durationHours * 60 + durationMinutesInput;

    const didSave = await saveSettings(classExamId, {
      maxAttempts,
      durationMinutes: totalMinutes,
      passMark: passMarkNumber,
      randomizeOrder,
      allowOvertime,
      overtimeMinutes: Number(overtimeMinutes),
      overtimeDeduction: Number(overtimeDeduction),
      sequential,
      allowReview,
      answerChangeDeduction: deductionNumber,
      ...(canEditVerificationCode ? { verificationCode: verificationCode.trim() } : {}),
      displayAt: isScheduled ? localInputValueToIso(displayAtInput) : null,
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
                <label className="text-[13px]">Display to students at
                  <input aria-label="Display to students at" type="datetime-local" value={displayAtInput} onChange={(e) => setDisplayAtInput(e.target.value)} className="w-full p-2 border rounded-lg" />
                </label>
                <div>
                  <label className="block text-[11px] mb-1 text-[var(--color-base-content)] opacity-60">
                    Start at
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
                    Scheduled end at
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
                  Pass Mark (%) <span style={{ opacity: 0.5, fontWeight: 400 }}>(optional)</span>
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={passMarkInput}
                  onChange={(e) => setPassMarkInput(e.target.value)}
                  placeholder="No minimum"
                  className="w-28 px-3 py-2 rounded-lg border text-[13px] bg-[var(--color-base-200)] border-[var(--color-base-300)] text-[var(--color-base-content)]"
                />
              </div>
            </div>

            <p
              className="text-[12px] -mt-2 mb-4"
              style={passMarkInvalid ? { color: "var(--color-error)" } : { opacity: 0.6 }}
            >
              {passMarkInvalid
                ? "Pass mark must be a percent from 0 to 100."
                : "Percent of the exam's total points a student needs to pass. Leave blank for no minimum."}
            </p>

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

            <label className="flex items-center gap-2 mb-4 cursor-pointer">
              <input
                type="checkbox"
                checked={randomizeOrder}
                onChange={(e) => setRandomizeOrder(e.target.checked)}
              />
              <span className="text-[13px] text-[var(--color-base-content)]">
                Shuffle question order for each student
              </span>
            </label>

            <label className="flex items-center gap-2 mb-1 cursor-pointer">
              <input
                type="checkbox"
                checked={sequential}
                onChange={(e) => setSequential(e.target.checked)}
              />
              <span className="text-[13px] text-[var(--color-base-content)]">
                Students must answer questions in order
              </span>
            </label>
            <p className="text-[11px] mb-4 ml-6 opacity-50 text-[var(--color-base-content)]">
              They can&apos;t skip ahead past a question they haven&apos;t answered, but can go back.
            </p>

            <label className="flex items-center gap-2 mb-1 cursor-pointer">
              <input
                type="checkbox"
                checked={allowReview}
                onChange={(e) => setAllowReview(e.target.checked)}
              />
              <span className="text-[13px] text-[var(--color-base-content)]">
                Let students view their answers after the exam
              </span>
            </label>
            <p className="text-[11px] mb-4 ml-6 opacity-50 text-[var(--color-base-content)]">
              You can change this after the exam has ended.
            </p>

            <label className="flex items-center gap-2 mb-1 cursor-pointer">
              <input
                type="checkbox"
                checked={allowOvertime}
                onChange={(e) => setAllowOvertime(e.target.checked)}
              />
              <span className="text-[13px] text-[var(--color-base-content)]">
                Let students keep going after time runs out (overtime)
              </span>
            </label>
            <p className="text-[11px] mb-3 ml-6 opacity-50 text-[var(--color-base-content)]">
              Off: when time runs out, the student&apos;s answers are submitted automatically.
            </p>

            {allowOvertime && (
              <>
                <label className="block text-[13px] mb-3">Allowed overtime (minutes)
                  <input aria-label="Allowed overtime (minutes)" type="number" min={1} step={1} value={overtimeMinutes} onChange={(e) => setOvertimeMinutes(e.target.value)} className="w-full p-2 border rounded-lg" />
                </label>
                <label className="block text-[13px] mb-3">One fixed overtime deduction (points)
                  <input aria-label="One fixed overtime deduction (points)" type="number" min={0} step="any" value={overtimeDeduction} onChange={(e) => setOvertimeDeduction(e.target.value)} className="w-full p-2 border rounded-lg" />
                </label>
                <p className="text-[11px] mb-4 opacity-60">Deducted once when overtime is used, with the score capped at zero. Overtime extends the scheduled end. Manually ending the exam stops everyone immediately.</p>
                {overtimeInvalid && <p role="alert" className="text-[12px] mb-3">Enter positive whole overtime minutes and a fixed deduction of 0 or more.</p>}
              </>
            )}
            {!allowOvertime && <div className="mb-3" />}

            <label className="block text-[13px] font-medium mb-2 text-[var(--color-base-content)]">
              Deduction for changing an answer{" "}
              <span style={{ opacity: 0.5, fontWeight: 400 }}>(points)</span>
            </label>
            <input
              type="number"
              min={0}
              step={0.5}
              value={deductionInput}
              onChange={(e) => setDeductionInput(e.target.value)}
              className="w-28 px-3 py-2 rounded-lg border text-[13px] mb-1 bg-[var(--color-base-200)] border-[var(--color-base-300)] text-[var(--color-base-content)]"
            />
            <p
              className="text-[11px] mb-5"
              style={deductionInvalid ? { color: "var(--color-error)" } : { opacity: 0.5 }}
            >
              {deductionInvalid
                ? "Enter 0 or more."
                : "Taken when a student revisits and changes a previously settled answer. A question never goes below 0. Leave at 0 for no deduction."}
            </p>

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
            disabled={isSaving || !settings || passMarkInvalid || deductionInvalid || overtimeInvalid}
            className="px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-none transition-opacity hover:opacity-90 bg-[var(--color-primary)] text-[var(--color-primary-content)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
