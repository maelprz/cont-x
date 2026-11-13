import { TeacherSelect } from "../shared/teacherSelect";
import { ExamDialog, examField, examPrimary, examSecondary } from "./examDialog";
import { useState, useEffect } from "react";
import { getAttachableClasses, attachExamToClass } from "../../services/classExamService";
import type { AttachableClass } from "../../services/classExamService";
import { useAuthStore } from "../../store/useAuthStore";

// NEW COMPONENT — this flow didn't exist before the revision. Replaces the
// old "Publish" button's implicit single-class assumption: now attaching an
// exam to a class is an explicit step, separate from actually going live
// (which happens afterwards, from Manage Classes, once a session code is set).
type AttachClassProps = {
  isOpen: boolean;
  examId: string | null;
  onClose: () => void;
  onAttached: () => void; // called after a successful attach, so the parent can refetch
};

export function AttachClassModal({ isOpen, examId, ...props }: AttachClassProps) {
  return isOpen && examId ? <AttachClassForm key={examId} examId={examId} {...props} /> : null;
}

function AttachClassForm({ examId, onClose, onAttached }: Omit<AttachClassProps, "isOpen" | "examId"> & { examId: string }) {
  const teacherId = useAuthStore((state) => state.user?.id);

  const [classes, setClasses] = useState<AttachableClass[]>([]);
  const [classId, setClassId] = useState("");
  const [isLoadingClasses, setIsLoadingClasses] = useState(Boolean(teacherId));
  const [loadError, setLoadError] = useState<string | null>(null);

  const [durationHours, setDurationHours] = useState(1);
  const [durationMinutesInput, setDurationMinutesInput] = useState(0);
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!teacherId) return;

    let isMounted = true;

    getAttachableClasses(examId, teacherId)
      .then((data) => {
        if (!isMounted) return;
        setClasses(data);
        setClassId(data[0]?.id ?? "");
      })
      .catch((err) => {
        if (isMounted) setLoadError(err instanceof Error ? err.message : "Could not load classes.");
      })
      .finally(() => {
        if (isMounted) setIsLoadingClasses(false);
      });

    return () => {
      isMounted = false;
    };
  }, [examId, teacherId]);

  const totalMinutes = durationHours * 60 + durationMinutesInput;
  const canSubmit = classId.length > 0 && totalMinutes > 0 && !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit || !examId) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await attachExamToClass(examId, classId, {
        durationMinutes: totalMinutes,
        maxAttempts,
        passMark: null,
        randomizeOrder: false,
        verificationCode: null, // set later from Manage Classes, right before going live
        startsAt: null,
        endsAt: null,
      });
      onAttached();
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Could not add this exam to the class.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ExamDialog title="Add to a class" busy={isSubmitting} onClose={onClose}
      onSubmit={(event) => { event.preventDefault(); void handleSubmit(); }}
      footer={<>
        <button type="button" className={examSecondary} onClick={onClose} disabled={isSubmitting}>Cancel</button>
        <button type="submit" className={examPrimary} disabled={!canSubmit}>{isSubmitting ? "Adding…" : "Add to class"}</button>
      </>}>
      <label htmlFor="attach-exam-class" className="block text-[13px] font-medium mb-2 text-[var(--color-base-content)]">
        Class
      </label>
      {isLoadingClasses ? (
        <p className="text-[13px] mb-4 opacity-60 text-[var(--color-base-content)]">Loading classes...</p>
      ) : classes.length === 0 ? (
        <p className="text-[13px] mb-4 opacity-60 text-[var(--color-base-content)]">
          None of your classes in this subject are available — they already have this exam, or you
          don't have a class here yet.
        </p>
      ) : (
        <TeacherSelect
          id="attach-exam-class"
          label="Class"
          value={classId}
          onChange={setClassId}
          disabled={isSubmitting}
          className="mb-4"
          options={classes.map((item) => ({ value: item.id, label: item.name }))}
        />
      )}
      {loadError && (
        <p className="text-[13px] mb-4" style={{ color: "var(--color-error)" }}>
          {loadError}
        </p>
      )}

      <p className="mb-2 text-[13px] font-medium">Exam duration</p>
      <div className="flex items-end gap-3 mb-4">
        <div>
          <label htmlFor="attach-exam-hours" className="block text-[11px] mb-1 text-[var(--color-base-content)] opacity-60">Hours</label>
          <input
            id="attach-exam-hours"
            type="number"
            min={0}
            value={durationHours}
            onChange={(e) => setDurationHours(Math.max(0, Number(e.target.value)))}
            className={`${examField} w-20`}
          />
        </div>
        <div>
          <label htmlFor="attach-exam-minutes" className="block text-[11px] mb-1 text-[var(--color-base-content)] opacity-60">Minutes</label>
          <input
            id="attach-exam-minutes"
            type="number"
            min={0}
            max={59}
            value={durationMinutesInput}
            onChange={(e) => setDurationMinutesInput(Math.min(59, Math.max(0, Number(e.target.value))))}
            className={`${examField} w-20`}
          />
        </div>
        <span className="text-[12px] pb-2 text-[var(--color-base-content)] opacity-60">
          = {totalMinutes} minutes total
        </span>
      </div>

      <label htmlFor="attach-exam-attempts" className="block text-[13px] font-medium mb-2">
        Allowed attempts
      </label>
      <input
        id="attach-exam-attempts"
        type="number"
        min={1}
        value={maxAttempts}
        onChange={(e) => setMaxAttempts(Math.max(1, Number(e.target.value)))}
        className={`${examField} w-20`}
      />

      {submitError && (
        <p role="alert" className="text-[13px] mb-3" style={{ color: "var(--color-error)" }}>
          {submitError}
        </p>
      )}
    </ExamDialog>
  );
}
