import { useId, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { ExamDialog, examField, examPrimary, examSecondary } from "../examLibrary/examDialog";
import { overrideSessionScore } from "../../services/examResultService";
import type { StudentResultRow } from "../../screens/examResult/examResultsScreen.types";

type AdjustScoreModalProps = {
  row: StudentResultRow;
  onClose: () => void;
  onSaved: () => void;
};

function messageFrom(err: unknown): string {
  if (err && typeof err === "object" && "message" in err && typeof err.message === "string" && err.message) {
    return err.message;
  }
  return "Could not save the new score. Try again.";
}

export function AdjustScoreModal({ row, onClose, onSaved }: AdjustScoreModalProps) {
  const id = useId();
  const baseScore = row.totalScore - row.scoreAdjustment;
  const [newTotalInput, setNewTotalInput] = useState(String(row.totalScore));
  const [reason, setReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const newTotal = newTotalInput.trim() === "" ? NaN : Number(newTotalInput);
  const isValidTotal = Number.isFinite(newTotal) && newTotal >= 0;
  const canSave = isValidTotal && newTotal !== row.totalScore && reason.trim() !== "" && !isSaving;

  async function handleSave() {
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
  }

  return (
    <ExamDialog title="Adjust score" subtitle={`${row.studentName} · Attempt ${row.attemptNumber}`}
      onClose={onClose} busy={isSaving} dismissOnBackdrop
      onSubmit={(event) => { event.preventDefault(); void handleSave(); }}
      footer={<>
        <button type="button" className={examSecondary} onClick={onClose} disabled={isSaving}>Cancel</button>
        <button type="submit" className={examPrimary} disabled={!canSave}>
          {isSaving && <LoaderCircle size={15} aria-hidden="true" className="motion-safe:animate-spin" />}
          {isSaving ? "Saving…" : "Save score"}
        </button>
      </>}>
      <dl className="mb-4 grid grid-cols-2 gap-3 text-sm tabular-nums">
        <div><dt className="text-stone-600">Auto-graded</dt><dd className="font-semibold">{baseScore} / {row.maxScore}</dd></div>
        <div><dt className="text-stone-600">Current total</dt><dd className="font-semibold">{row.totalScore} / {row.maxScore}</dd></div>
      </dl>
      {row.scoreAdjustment !== 0 && (
        <p className="mb-4 text-xs text-stone-600 wrap-anywhere">
          Current adjustment {row.scoreAdjustment > 0 ? "+" : ""}{row.scoreAdjustment}
          {row.adjustmentReason ? " · " + row.adjustmentReason : ""}
        </p>
      )}
      <div className="space-y-3">
        <div>
          <label htmlFor={id + "-total"} className="mb-1 block text-sm font-medium">New total score</label>
          <input id={id + "-total"} type="number" min={0} step="any" value={newTotalInput} disabled={isSaving}
            onChange={(event) => setNewTotalInput(event.target.value)} className={examField + " max-w-32"}
            required aria-invalid={!isValidTotal} aria-describedby={id + "-score-note"} />
          <p id={id + "-score-note"} className={`mt-1 text-xs ${isValidTotal ? "text-stone-600" : "text-red-700"}`}>
            {!isValidTotal ? "Enter a score of 0 or higher."
              : newTotal > row.maxScore ? "Scores above the maximum count as extra credit."
              : "Enter a score above the maximum to award extra credit."}
          </p>
        </div>
        <div>
          <label htmlFor={id + "-reason"} className="mb-1 block text-sm font-medium">Reason</label>
          <textarea id={id + "-reason"} value={reason} onChange={(event) => setReason(event.target.value)}
            disabled={isSaving} rows={3} required className={examField} />
        </div>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      </div>
    </ExamDialog>
  );
}
