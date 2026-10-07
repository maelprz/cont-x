import { useState, useEffect } from "react";
import type { NewExamSettings } from "../../services/examBuilderService";
import { getAssignedSubjects } from "../../services/subjectService";
import type { AssignedSubject } from "../../services/subjectService";
import { useAuthStore } from "../../store/useAuthStore";

export function CreateExamModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  error,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (settings: NewExamSettings) => void;
  isSubmitting?: boolean;
  error?: string | null;
}) {
  const teacherId = useAuthStore((state) => state.user?.id);

  const [title, setTitle] = useState(""); // what the teacher types as exam title
  const [description, setDescription] = useState(""); // optional description
  const [subjectId, setSubjectId] = useState("");

  const [subjects, setSubjects] = useState<AssignedSubject[]>([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);
  const [subjectsError, setSubjectsError] = useState<string | null>(null);

  // loads the teacher's assigned subjects each time the modal opens
  useEffect(() => {
    if (!isOpen || !teacherId) return;

    let isMounted = true;
    setIsLoadingSubjects(true);
    setSubjectsError(null);

    getAssignedSubjects(teacherId)
      .then((data) => {
        if (!isMounted) return;
        setSubjects(data);
        setSubjectId((current) => current || data[0]?.id || "");
      })
      .catch((err) => {
        if (isMounted) {
          setSubjectsError(err instanceof Error ? err.message : "Could not load subjects.");
        }
      })
      .finally(() => {
        if (isMounted) setIsLoadingSubjects(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, teacherId]);

  // resets the form each time the modal is reopened
  useEffect(() => {
    if (isOpen) {
      setTitle("");
      setDescription("");
      setSubjectId("");
    }
  }, [isOpen]);

  if (!isOpen) return null; // render nothing when modal is closed

  const trimmedTitle = title.trim();
  const canSubmit = trimmedTitle.length > 0 && subjectId.length > 0 && !isSubmitting;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({
      title: trimmedTitle,
      description: description.trim(),
      subjectId,
    });
  };

  return (
    // full-screen dim backdrop, click outside closes the modal
    <div
      onClick={onClose}
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
    >
      {/* modal card itself, stops clicks from closing it */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[440px] p-6 rounded-xl border bg-[var(--color-base-100)] border-[var(--color-base-300)] max-h-[85vh] overflow-y-auto"
      >
        <h2 className="text-[18px] font-bold mb-1 text-[var(--color-base-content)]">
          Name Your Assessment
        </h2>
        <p className="text-[13px] mb-5 text-[var(--color-base-content)] opacity-60">
          Set the basics now. You can add questions, then publish it to a class, next.
        </p>

        <label className="block text-[13px] font-medium mb-2 text-[var(--color-base-content)]">
          Subject
        </label>
        {isLoadingSubjects ? (
          <p className="text-[13px] mb-4 opacity-60 text-[var(--color-base-content)]">Loading subjects...</p>
        ) : subjects.length === 0 ? (
          <p className="text-[13px] mb-4" style={{ color: "var(--color-error)" }}>
            You aren't assigned to any subjects yet. Ask an admin to assign you one first.
          </p>
        ) : (
          <select
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border text-[14px] outline-none mb-4 bg-[var(--color-base-200)] border-[var(--color-base-300)] text-[var(--color-base-content)] font-[inherit]"
          >
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        )}
        {subjectsError && (
          <p className="text-[13px] mb-4" style={{ color: "var(--color-error)" }}>
            {subjectsError}
          </p>
        )}

        <label className="block text-[13px] font-medium mb-2 text-[var(--color-base-content)]">
          Exam Title
        </label>
        <input
          type="text"
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Midterm: Data Structures"
          className="w-full px-3 py-2 rounded-lg border text-[14px] outline-none mb-4 bg-[var(--color-base-200)] border-[var(--color-base-300)] text-[var(--color-base-content)] font-[inherit]"
        />

        <label className="block text-[13px] font-medium mb-2 text-[var(--color-base-content)]">
          Description <span style={{ opacity: 0.5, fontWeight: 400 }}>(optional)</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="Briefly describe what this exam covers"
          className="w-full px-3 py-2 rounded-lg border text-[13px] outline-none resize-none mb-5 bg-[var(--color-base-200)] border-[var(--color-base-300)] text-[var(--color-base-content)] font-[inherit]"
        />

        {error && (
          <p className="text-[13px] mb-3" style={{ color: "var(--color-error)" }}>
            {error}
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
            {isSubmitting ? "Creating..." : "Create & Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}