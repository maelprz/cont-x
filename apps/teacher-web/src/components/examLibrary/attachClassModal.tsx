import { useState, useEffect } from "react";
import { getAttachableClasses, attachExamToClass } from "../../services/classExamService";
import type { AttachableClass } from "../../services/classExamService";
import { useAuthStore } from "../../store/useAuthStore";

// NEW COMPONENT — this flow didn't exist before the revision. Replaces the
// old "Publish" button's implicit single-class assumption: now attaching an
// exam to a class is an explicit step, separate from actually going live
// (which happens afterwards, from Manage Classes, once a session code is set).
export function AttachClassModal({
  isOpen,
  examId,
  onClose,
  onAttached,
}: {
  isOpen: boolean;
  examId: string | null;
  onClose: () => void;
  onAttached: () => void; // called after a successful attach, so the parent can refetch
}) {
  const teacherId = useAuthStore((state) => state.user?.id);

  const [classes, setClasses] = useState<AttachableClass[]>([]);
  const [classId, setClassId] = useState("");
  const [isLoadingClasses, setIsLoadingClasses] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [durationHours, setDurationHours] = useState(1);
  const [durationMinutesInput, setDurationMinutesInput] = useState(0);
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !examId || !teacherId) return;

    let isMounted = true;
    setIsLoadingClasses(true);
    setLoadError(null);

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
  }, [isOpen, examId, teacherId]);

  useEffect(() => {
    if (isOpen) {
      setDurationHours(1);
      setDurationMinutesInput(0);
      setMaxAttempts(1);
      setSubmitError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

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
    <div
      onClick={onClose}
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[440px] p-6 rounded-xl border bg-[var(--color-base-100)] border-[var(--color-base-300)] max-h-[85vh] overflow-y-auto"
      >
        <h2 className="text-[18px] font-bold mb-1 text-[var(--color-base-content)]">
          Add to a Class
        </h2>
        <p className="text-[13px] mb-5 text-[var(--color-base-content)] opacity-60">
          Choose a class and how long students get. You'll set the session code and publish it from
          Manage Classes.
        </p>

        <label className="block text-[13px] font-medium mb-2 text-[var(--color-base-content)]">
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
          <select
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border text-[14px] outline-none mb-4 bg-[var(--color-base-200)] border-[var(--color-base-300)] text-[var(--color-base-content)] font-[inherit]"
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
        {loadError && (
          <p className="text-[13px] mb-4" style={{ color: "var(--color-error)" }}>
            {loadError}
          </p>
        )}

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
          <span className="text-[12px] pb-2 text-[var(--color-base-content)] opacity-60">
            = {totalMinutes} minutes total
          </span>
        </div>

        <label className="block text-[13px] font-medium mb-2 text-[var(--color-base-content)]">
          Allowed Attempts
        </label>
        <input
          type="number"
          min={1}
          value={maxAttempts}
          onChange={(e) => setMaxAttempts(Math.max(1, Number(e.target.value)))}
          className="w-20 px-3 py-2 rounded-lg border text-[13px] mb-5 bg-[var(--color-base-200)] border-[var(--color-base-300)] text-[var(--color-base-content)]"
        />

        {submitError && (
          <p className="text-[13px] mb-3" style={{ color: "var(--color-error)" }}>
            {submitError}
          </p>
        )}

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-[var(--color-base-300)] text-[13px] font-medium cursor-pointer transition-opacity hover:opacity-70 bg-[var(--color-base-100)] text-[var(--color-base-content)]"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-none transition-opacity hover:opacity-90 bg-[var(--color-primary)] text-[var(--color-primary-content)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Adding..." : "Add to Class"}
          </button>
        </div>
      </div>
    </div>
  );
}