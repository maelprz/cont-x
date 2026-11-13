import { LoaderCircle } from "lucide-react";
import { ExamDialog, examPrimary, examSecondary } from "../examLibrary/examDialog";

interface UnsavedChangesPromptProps {
  isOpen: boolean;
  isSaving?: boolean;
  error?: string | null;
  onSave: () => void | Promise<void>;
  onLeaveWithoutSaving: () => void;
  onCancel: () => void;
}

export function UnsavedChangesPrompt({
  isOpen,
  isSaving = false,
  error,
  onSave,
  onLeaveWithoutSaving,
  onCancel,
}: UnsavedChangesPromptProps) {
  if (!isOpen) return null;

  return (
    <ExamDialog title="Unsaved changes" busy={isSaving} onClose={onCancel} footer={<>
      <button type="button" className={`${examSecondary} text-red-700`} disabled={isSaving} onClick={onLeaveWithoutSaving}>Leave</button>
      <button type="button" className={examPrimary} disabled={isSaving} onClick={onSave}>
        {isSaving && <LoaderCircle size={16} className="motion-safe:animate-spin" aria-hidden="true" />}
        {isSaving ? "Saving…" : "Save changes"}
      </button>
    </>}>
      <p role="status" className="text-sm text-stone-600">{isSaving ? "Saving your exam changes…" : "Save your exam changes before leaving?"}</p>
      {error && !isSaving && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    </ExamDialog>
  );
}
