import { TeacherSelect } from "../shared/teacherSelect";
import { ExamDialog, examField, examPrimary, examSecondary } from "./examDialog";
import { useState, useEffect } from "react";
import type { NewExamSettings } from "../../services/examBuilderService";
import { getAssignedSubjects } from "../../services/subjectService";
import type { AssignedSubject } from "../../services/subjectService";
import { useAuthStore } from "../../store/useAuthStore";

type CreateExamProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (settings: NewExamSettings) => void;
  isSubmitting?: boolean;
  error?: string | null;
  // when the modal is opened from inside a subject in the Exam Library, the
  // subject is already decided — shown read-only instead of as a picker
  fixedSubject?: { id: string; name: string } | null;
};

export function CreateExamModal({ isOpen, ...props }: CreateExamProps) {
  return isOpen ? <CreateExamForm {...props} /> : null;
}

function CreateExamForm({ onClose, onSubmit, isSubmitting, error, fixedSubject }: Omit<CreateExamProps, "isOpen">) {
  const teacherId = useAuthStore((state) => state.user?.id);

  const [title, setTitle] = useState(""); // what the teacher types as exam title
  const [description, setDescription] = useState(""); // optional description
  const [subjectId, setSubjectId] = useState("");

  const [subjects, setSubjects] = useState<AssignedSubject[]>([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(!fixedSubject && Boolean(teacherId));
  const [subjectsError, setSubjectsError] = useState<string | null>(null);

  // loads the teacher's assigned subjects each time the modal opens
  useEffect(() => {
    if (!teacherId || fixedSubject) return;

    let isMounted = true;

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
  }, [teacherId, fixedSubject]);

  const trimmedTitle = title.trim();
  const effectiveSubjectId = fixedSubject ? fixedSubject.id : subjectId;
  const canSubmit = trimmedTitle.length > 0 && effectiveSubjectId.length > 0 && !isSubmitting;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({
      title: trimmedTitle,
      description: description.trim(),
      subjectId: effectiveSubjectId,
    });
  };

  return (
    <ExamDialog title="New exam" busy={isSubmitting} onClose={onClose}
      onSubmit={(event) => { event.preventDefault(); void handleSubmit(); }}
      footer={<>
        <button type="button" className={examSecondary} onClick={onClose} disabled={isSubmitting}>Cancel</button>
        <button type="submit" className={examPrimary} disabled={!canSubmit}>{isSubmitting ? "Creating…" : "Create exam"}</button>
      </>}>
      <label htmlFor={fixedSubject ? undefined : "new-exam-subject"} className="block text-[13px] font-medium mb-2 text-[var(--color-base-content)]">
        Subject
      </label>
      {fixedSubject ? (
        <p className={`${examField} mb-4`}>
          {fixedSubject.name}
        </p>
      ) : isLoadingSubjects ? (
        <p className="text-[13px] mb-4 opacity-60 text-[var(--color-base-content)]">Loading subjects...</p>
      ) : subjects.length === 0 ? (
        <p className="text-[13px] mb-4" style={{ color: "var(--color-error)" }}>
          You aren't assigned to any subjects yet. Ask an admin to assign you one first.
        </p>
      ) : (
        <TeacherSelect
          id="new-exam-subject"
          label="Subject"
          value={subjectId}
          onChange={setSubjectId}
          disabled={isSubmitting}
          className="mb-4"
          options={subjects.map((subject) => ({ value: subject.id, label: subject.name }))}
        />
      )}
      {subjectsError && (
        <p className="text-[13px] mb-4" style={{ color: "var(--color-error)" }}>
          {subjectsError}
        </p>
      )}

      <label htmlFor="new-exam-title" className="block text-[13px] font-medium mb-2">
        Exam title
      </label>
      <input
        id="new-exam-title"
        type="text"
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="e.g. Midterm: Data Structures"
        className={`${examField} mb-4`}
      />

      <label htmlFor="new-exam-description" className="block text-[13px] font-medium mb-2">
        Description <span style={{ opacity: 0.5, fontWeight: 400 }}>(optional)</span>
      </label>
      <textarea
        id="new-exam-description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2}
        placeholder="Briefly describe what this exam covers"
        className={`${examField} mb-4`}
      />

      {error && (
        <p role="alert" className="text-[13px] mb-3" style={{ color: "var(--color-error)" }}>
          {error}
        </p>
      )}
    </ExamDialog>
  );
}
