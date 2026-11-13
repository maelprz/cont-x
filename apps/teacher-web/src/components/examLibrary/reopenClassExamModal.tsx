import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useExamSettings } from "../../hooks/useExamSettings";
import { reopenClassExam } from "../../services/classExamService";

const inputClass = "w-full rounded-lg border border-[var(--color-base-300)] bg-[var(--color-base-100)] px-3 py-2 text-sm";

export function ReopenClassExamModal({ classExamId, onClose, onReopened }: {
  classExamId: string;
  onClose: () => void;
  onReopened: (result: { endsAt: string; sessionCode: string }) => void;
}) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const submitting = useRef(false);
  const { settings, error: loadError } = useExamSettings(classExamId);
  const [windowInput, setWindowInput] = useState<string | null>(null);
  const [sessionCode, setSessionCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  const windowValue = windowInput ?? (settings ? String(settings.durationMinutes) : "");
  const windowMinutes = Number(windowValue);
  const needsCode = settings !== null && !settings.verificationCode;
  const canSubmit = settings?.status === "ended" && Number.isInteger(windowMinutes) && windowMinutes > 0
    && (!needsCode || /^[0-9]{6}$/.test(sessionCode)) && !isSubmitting;

  function close() {
    if (!submitting.current) onClose();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || !settings || submitting.current) return;

    submitting.current = true;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const result = await reopenClassExam(classExamId, settings.endedAt, windowMinutes, needsCode ? sessionCode : null);
      onReopened(result);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Could not reopen the exam. Try again.");
    } finally {
      submitting.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(event) => { event.preventDefault(); close(); }}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[420px] rounded-xl border border-[var(--color-base-300)] bg-[var(--color-base-100)] p-6 text-[var(--color-base-content)] shadow-xl backdrop:bg-black/50"
    >
      <form onSubmit={submit}>
        <h2 id={titleId} className="mb-1 text-lg font-bold">Reopen exam</h2>
        {settings && <p className="mb-4 text-sm opacity-70">{settings.className}</p>}
        {!settings && !loadError && <p role="status" className="my-4 text-sm">Loading exam settings…</p>}
        {settings && settings.status !== "ended" && (
          <p role="alert" className="my-4 text-sm text-[var(--color-error)]">This exam is no longer ended. Close this dialog and refresh the list.</p>
        )}
        {settings?.status === "ended" && (
          <fieldset disabled={isSubmitting} className="mb-5 space-y-4">
            <p className="text-sm opacity-80">Entry opens immediately for enrolled students with attempts remaining. Existing submissions and grades are kept.</p>
            <label className="block space-y-1.5 text-sm font-medium">
              <span>Entry window (minutes)</span>
              <input
                className={inputClass}
                type="number"
                min={1}
                max={2147483647}
                step={1}
                required
                value={windowValue}
                onChange={(event) => setWindowInput(event.target.value)}
              />
              <span className="block text-xs font-normal opacity-70">
                The {settings.durationMinutes}-minute attempt timer and {settings.maxAttempts}-attempt limit still apply. The entry window can shorten the time available to late arrivals.
              </span>
            </label>
            {needsCode && (
              <label className="block space-y-1.5 text-sm font-medium">
                <span>Session code</span>
                <input
                  className={`${inputClass} font-mono`}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  pattern="[0-9]{6}"
                  placeholder="6-digit code"
                  required
                  value={sessionCode}
                  onChange={(event) => setSessionCode(event.target.value.replace(/\D/g, ""))}
                />
              </label>
            )}
          </fieldset>
        )}
        {(loadError || submitError) && <p role="alert" className="mb-4 text-sm text-[var(--color-error)]">{submitError ?? loadError}</p>}
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" onClick={close} disabled={isSubmitting} className="cursor-pointer rounded-lg border border-[var(--color-base-300)] px-4 py-2 text-sm disabled:opacity-50">Cancel</button>
          <button type="submit" disabled={!canSubmit} className="cursor-pointer rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-primary-content)] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
            {isSubmitting ? "Reopening…" : "Reopen exam"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
