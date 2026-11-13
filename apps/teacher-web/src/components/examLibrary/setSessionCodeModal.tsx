import { ExamDialog, examField, examPrimary, examSecondary } from "./examDialog";
import { useState } from "react";

type SessionCodeProps = {
  isOpen: boolean;
  isProcessing: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: (code: string) => void;
};

export function SetSessionCodeModal({ isOpen, ...props }: SessionCodeProps) {
  return isOpen ? <SessionCodeForm {...props} /> : null;
}

function SessionCodeForm({ isProcessing, error, onCancel, onConfirm }: Omit<SessionCodeProps, "isOpen">) {
  const [code, setCode] = useState("");
  const canSubmit = code.length === 6 && !isProcessing;
  return (
    <ExamDialog title="Set a session code" busy={isProcessing} onClose={onCancel}
      onSubmit={(event) => { event.preventDefault(); if (canSubmit) onConfirm(code); }}
      footer={<>
        <button type="button" className={examSecondary} onClick={onCancel} disabled={isProcessing}>Cancel</button>
        <button type="submit" className={examPrimary} disabled={!canSubmit}>{isProcessing ? "Publishing…" : "Set code & publish"}</button>
      </>}>
      <label className="block space-y-2 text-sm font-medium">
        <span>Session code</span>
        <input autoFocus inputMode="numeric" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} placeholder="6-digit code" className={`${examField} tabular-nums`} />
      </label>
      <p className="mt-2 text-sm text-stone-600">Students enter this code when they start their attempt.</p>
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    </ExamDialog>
  );
}
