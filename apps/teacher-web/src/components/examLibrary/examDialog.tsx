import { useEffect, useId, useRef } from "react";
import type { FormEventHandler, ReactNode } from "react";
import { X } from "lucide-react";

export const examButton = "inline-flex min-h-9 cursor-pointer items-center justify-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#465a3b] disabled:cursor-not-allowed disabled:opacity-50";
export const examPrimary = `${examButton} border-transparent bg-[#465a3b] text-white hover:bg-[#37482f]`;
export const examSecondary = `${examButton} border-[var(--color-base-300)] bg-[var(--color-base-100)] hover:bg-[var(--color-base-200)]`;
export const examDanger = `${examButton} border-transparent bg-red-700 text-white hover:bg-red-800`;
export const examField = "w-full min-w-0 rounded-lg border border-[var(--color-base-300)] bg-[var(--color-base-100)] px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-[#465a3b]";

export function ExamDialog({ title, subtitle, children, footer, onClose, onSubmit, busy, wide }: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer: ReactNode;
  onClose: () => void;
  onSubmit?: FormEventHandler<HTMLFormElement>;
  busy?: boolean;
  wide?: boolean;
}) {
  const id = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={id}
      onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}
      className={`m-auto w-[calc(100%-1.5rem)] max-h-[calc(100dvh-1.5rem)] overflow-hidden rounded-xl border border-[var(--color-base-300)] bg-[var(--color-base-100)] p-0 text-[var(--color-base-content)] shadow-xl backdrop:bg-slate-950/45 ${wide ? "max-w-[680px]" : "max-w-[460px]"}`}
    >
      <form onSubmit={onSubmit ?? ((event) => event.preventDefault())} className="flex max-h-[calc(100dvh-1.5rem-2px)] min-h-0 flex-col">
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--color-base-300)] px-4 py-3.5 sm:px-6">
          <div className="min-w-0">
            <h2 id={id} className="text-lg font-semibold">{title}</h2>
            {subtitle && <p className="mt-1 break-words text-sm text-stone-600">{subtitle}</p>}
          </div>
          <button type="button" aria-label="Close dialog" disabled={busy} onClick={onClose} className="grid size-8 shrink-0 place-items-center rounded-lg text-stone-600 hover:bg-stone-200 focus-visible:outline-2 disabled:opacity-50">
            <X size={17} aria-hidden="true" />
          </button>
        </header>
        <div className="min-h-0 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">{children}</div>
        <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-[var(--color-base-300)] bg-[#f1efe9] px-4 py-3 sm:px-6">{footer}</footer>
      </form>
    </dialog>
  );
}

export function ExamConfirmDialog({ isOpen, title, message, confirmLabel, isProcessing, error, onConfirm, onCancel, destructive = true }: {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  isProcessing: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
}) {
  if (!isOpen) return null;
  return (
    <ExamDialog title={title} busy={isProcessing} onClose={onCancel} footer={<>
      <button type="button" className={examSecondary} onClick={onCancel} disabled={isProcessing}>Cancel</button>
      <button type="button" className={destructive ? examDanger : examPrimary} onClick={onConfirm} disabled={isProcessing}>{isProcessing ? "Please wait…" : confirmLabel}</button>
    </>}>
      <p className="text-sm leading-relaxed text-stone-600">{message}</p>
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    </ExamDialog>
  );
}
