import { useState } from "react";
import { overrideSessionScore } from "../../services/examResultService";
import type { StudentResultRow } from "../../screens/examResult/examResultsScreen.types";

type AdjustScoreModalProps = {
  row: StudentResultRow; // the attempt being adjusted
  onClose: () => void;
  onSaved: () => void; // lets the screen reload the results
};

// pulls a readable message out of whatever the database or network threw
function messageFrom(err: unknown): string {
  if (err && typeof err === "object" && "message" in err) {
    const message = (err as { message?: unknown }).message;
    if (typeof message === "string" && message) return message;
  }
  return "Could not save the new score. Try again.";
}

export function AdjustScoreModal({ row, onClose, onSaved }: AdjustScoreModalProps) {
  const baseScore = row.totalScore - row.scoreAdjustment; // what the auto-grader gave
  const [newTotalInput, setNewTotalInput] = useState(String(row.totalScore));
  const [reason, setReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const newTotal = newTotalInput.trim() === "" ? NaN : Number(newTotalInput);
  const isValidTotal = Number.isFinite(newTotal) && newTotal >= 0;
  const isUnchanged = isValidTotal && newTotal === row.totalScore;
  const canSave = isValidTotal && !isUnchanged && reason.trim() !== "" && !isSaving;

  const handleSave = async () => {
    if (!canSave) return;
    setIsSaving(true);
    setError(null);
    try {
      await overrideSessionScore(row.sessionId, newTotal, reason.trim());
      onSaved();
      onClose();
    } catch (err) {
      setError(messageFrom(err));
      setIsSaving(false);
    }
  };

  return (
    <div
      onClick={isSaving ? undefined : onClose}
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[440px] p-6 rounded-xl border bg-[var(--color-base-100)] border-[var(--color-base-300)] max-h-[85vh] overflow-y-auto"
      >
        <h2 className="text-[18px] font-bold mb-1 text-[var(--color-base-content)]">
          Adjust Score
        </h2>
        <p className="text-[13px] mb-5 text-[var(--color-base-content)] opacity-60">
          {row.studentName} &middot; attempt #{row.attemptNumber}
        </p>

        <div className="grid grid-cols-2 gap-3 mb-4 text-[13px] text-[var(--color-base-content)]">
          <div>
            <p className="opacity-60">Auto-graded</p>
            <p className="font-semibold">
              {baseScore}/{row.maxScore}
            </p>
          </div>
          <div>
            <p className="opacity-60">Current total</p>
            <p className="font-semibold">
              {row.totalScore}/{row.maxScore}
            </p>
          </div>
        </div>

        {row.scoreAdjustment !== 0 && (
          <p className="text-[12px] mb-4 text-[var(--color-base-content)] opacity-60">
            Already adjusted by {row.scoreAdjustment > 0 ? "+" : ""}
            {row.scoreAdjustment}
            {row.adjustmentReason ? ` (${row.adjustmentReason})` : ""}.
          </p>
        )}

        <label className="block text-[13px] font-medium mb-2 text-[var(--color-base-content)]">
          New total score
        </label>
        <input
          type="number"
          min={0}
          step="any"
          value={newTotalInput}
          onChange={(e) => setNewTotalInput(e.target.value)}
          className="w-32 px-3 py-2 rounded-lg border text-[13px] mb-1 bg-[var(--color-base-200)] border-[var(--color-base-300)] text-[var(--color-base-content)]"
        />
        <p
          className="text-[12px] mb-4"
          style={!isValidTotal ? { color: "var(--color-error)" } : { opacity: 0.6 }}
        >
          {!isValidTotal
            ? "Enter a score of 0 or higher."
            : newTotal > row.maxScore
              ? "Above the exam's maximum, so this counts as extra credit."
              : "Can go above the maximum for extra credit."}
        </p>

        <label className="block text-[13px] font-medium mb-2 text-[var(--color-base-content)]">
          Reason (required)
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="e.g. Extra credit for the bonus problem"
          className="w-full px-3 py-2 rounded-lg border text-[13px] mb-4 bg-[var(--color-base-200)] border-[var(--color-base-300)] text-[var(--color-base-content)]"
        />

        {error && (
          <p className="text-[13px] mb-3" style={{ color: "var(--color-error)" }}>
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 rounded-lg border border-[var(--color-base-300)] text-[13px] font-medium cursor-pointer transition-opacity hover:opacity-70 bg-[var(--color-base-100)] text-[var(--color-base-content)] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-none transition-opacity hover:opacity-90 bg-[var(--color-primary)] text-[var(--color-primary-content)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? "Saving..." : "Save Score"}
          </button>
        </div>
      </div>
    </div>
  );
}