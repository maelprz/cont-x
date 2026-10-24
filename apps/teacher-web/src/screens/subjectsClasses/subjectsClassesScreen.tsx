import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { AdminHeader } from "../../components/layoutAdmin/adminHeader";
import { AdminAreaSidebar } from "../../components/layoutAdmin/adminAreaSidebar";
import { NewSubjectModal } from "../../components/subjectsClasses/newSubjectModal";
import { NewClassModal } from "../../components/subjectsClasses/newClassModal";
import { SubjectDetailModal } from "../../components/subjectsClasses/subjectDetailModal";
import { useSubjectsClasses } from "../../hooks/useSubjectsClasses";
import { useToast } from "../../hooks/useToast";
import { EnrollStudentModal } from "../../components/subjectsClasses/enrollStudentModal";
import type {
  ClassSummary,
  StudentOption,
  CsvEnrollResult,
} from "../../services/subjectsClassesService";

export function SubjectsClassesScreen() {
  const {
    subjects,
    teachers,
    isLoading,
    error,
    addSubject,
    addClass,
    findStudents,
    enrollInClass,
    enrollCsvInClass,
  } = useSubjectsClasses();
  const { showToast } = useToast(); // shows the success message

  const [searchQuery, setSearchQuery] = useState(""); // text typed into the header search
  const [showNewSubjectModal, setShowNewSubjectModal] = useState(false); // whether the modal is open
  const [isSaving, setIsSaving] = useState(false); // true while a subject is being created
  const [createError, setCreateError] = useState<string | null>(null); // error shown inside the modal
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(
    null,
  ); // which subject's modal is open, if any
  const selectedSubject =
    subjects.find((s) => s.id === selectedSubjectId) ?? null; // always the freshest copy from the loaded list
  const visibleSubjects = subjects.filter(
    (s) =>
      // narrows the list to the search text
      `${s.codePrefix} ${s.name}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase()), // matches the prefix or the name
  );
  const [showNewClassModal, setShowNewClassModal] = useState(false); // whether the add-class modal is open
  const [isSavingClass, setIsSavingClass] = useState(false); // true while a class is being created
  const [classError, setClassError] = useState<string | null>(null); // error shown inside the add-class modal

  const [enrollTarget, setEnrollTarget] = useState<ClassSummary | null>(null); // which class is being enrolled into; null means the modal is closed
  const [isEnrolling, setIsEnrolling] = useState(false); // true while the enroll request runs
  const [enrollError, setEnrollError] = useState<string | null>(null);

  function openNewSubjectModal() {
    // runs when the New Subject button is clicked
    setCreateError(null); // clear any old error
    setShowNewSubjectModal(true); // show the modal
  }

  async function handleCreateSubject(name: string) {
    // runs when the modal confirms
    setIsSaving(true); // block double clicks
    setCreateError(null); // clear any old error
    try {
      await addSubject(name); // ask the database to create it, then refresh the list
      setShowNewSubjectModal(false); // close the modal
      showToast("Subject created."); // tell the admin it worked
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : "Could not create the subject.",
      ); // show the safe message in the modal
    } finally {
      setIsSaving(false); // saving is over either way
    }
  }

  function openEnrollModal(cls: ClassSummary) {
    // runs when Enroll student is clicked on a row
    setEnrollError(null); // clear any old error
    setEnrollTarget(cls); // remember the class and open the modal
  }

  async function handleEnroll(student: StudentOption) {
    // runs when the modal confirms
    if (!enrollTarget) return; // no class chosen, nothing to do
    setIsEnrolling(true); // block double clicks
    setEnrollError(null); // clear any old error
    try {
      await enrollInClass(enrollTarget.id, student.id); // the database function does every check and the audit log
      setEnrollTarget(null); // close the modal
      showToast(`${student.fullName} enrolled in ${enrollTarget.name}.`); // tell the admin it worked
    } catch (err) {
      setEnrollError(
        err instanceof Error ? err.message : "Could not enroll the student.",
      ); // show the safe message in the modal
    } finally {
      setIsEnrolling(false); // saving is over either way
    }
  }

  async function handleEnrollCsv(entries: string[]): Promise<CsvEnrollResult> {
    if (!enrollTarget) throw new Error("No class selected.");
    setIsEnrolling(true); // block double clicks
    try {
      const result = await enrollCsvInClass(enrollTarget.id, entries); // the database function does every check and the audit log
      const enrolled = result.counts.enrolled ?? 0;
      if (enrolled > 0)
        showToast(
          `${enrolled} student${enrolled === 1 ? "" : "s"} enrolled in ${enrollTarget.name}.`,
        );
      return result; // return the full report to the caller
    } finally {
      setIsEnrolling(false); // saving is over either way
    }
  }

  function openNewClassModal() {
    // runs when Add Class is clicked in the detail modal
    setClassError(null); // clear any old error
    setShowNewClassModal(true); // show the modal
  }

  async function handleCreateClass(name: string, teacherId: string) {
    // runs when the add-class modal confirms
    if (!selectedSubject) return; // nothing selected, nothing to add to
    setIsSavingClass(true); // block double clicks
    setClassError(null); // clear any old error
    try {
      const created = await addClass(selectedSubject.id, name, teacherId); // ask the database to create it, then refresh the list
      setShowNewClassModal(false); // close the modal
      showToast(`Class created. Code: ${created.offerCode}`); // tell the admin it worked, and show the code
    } catch (err) {
      setClassError(
        err instanceof Error ? err.message : "Could not create the class.",
      ); // show the safe message in the modal
    } finally {
      setIsSavingClass(false); // saving is over either way
    }
  }

  return (
    <div className="flex h-screen bg-[var(--color-base-200)] text-[var(--color-base-content)]">
      <AdminAreaSidebar activeItem="subjectsClasses" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
        />

        <main className="flex-1 overflow-y-auto px-8 py-6">
          <p className="text-xs opacity-60 mb-2">
            Core System &gt; Subjects &amp; Classes
          </p>

          {/* title row with the New Subject button */}
          <div className="flex items-start justify-between gap-6 mb-6">
            <div>
              <h1 className="text-2xl font-bold mb-1">
                Subjects &amp; Classes
              </h1>
              <p className="text-sm opacity-70 max-w-xl">
                Create subjects, add classes to them, and assign each class to a
                teacher.
              </p>
            </div>
            <button
              onClick={openNewSubjectModal} // opens the create modal
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-none transition-opacity hover:opacity-90 shrink-0"
              style={{
                backgroundColor: "var(--color-primary)",
                color: "var(--color-primary-content)",
              }}
            >
              <Plus size={14} />
              New Subject
            </button>
          </div>

          {/* loading state */}
          {isLoading && (
            <div className="flex items-center gap-2 text-sm opacity-60 py-8">
              <Loader2 size={16} className="animate-spin" />
              Loading subjects...
            </div>
          )}

          {/* error state */}
          {error && (
            <div className="bg-[var(--color-error)]/10 text-[var(--color-error)] rounded-xl px-5 py-4 text-sm mb-4">
              {error}
            </div>
          )}

          {/* empty states */}
          {!isLoading && !error && subjects.length === 0 && (
            <p className="text-sm opacity-60 py-8">
              No subjects yet. Create the first one.
            </p>
          )}
          {!isLoading &&
            !error &&
            subjects.length > 0 &&
            visibleSubjects.length === 0 && (
              <p className="text-sm opacity-60 py-8">
                No subjects match your search.
              </p>
            )}

          {/* the subject cards */}
          {!isLoading && !error && visibleSubjects.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {visibleSubjects.map((subject) => {
                const activeCount = subject.classes.filter(
                  (c) => c.archivedAt === null,
                ).length; // classes still in use
                const archivedCount = subject.classes.length - activeCount; // classes already archived
                return (
                  <button
                    type="button" // not a form button
                    key={subject.id} // unique key for React
                    onClick={() => setSelectedSubjectId(subject.id)} // opens the detail modal for this subject
                    className="text-left w-full cursor-pointer transition-opacity hover:opacity-80 bg-[var(--color-base-100)] border border-[var(--color-base-300)] rounded-2xl p-5"
                  >
                    {/* the two-digit prefix badge */}
                    <span
                      className="inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full mb-3"
                      style={{
                        backgroundColor: "var(--color-primary)",
                        color: "var(--color-primary-content)",
                      }}
                    >
                      {subject.codePrefix}
                    </span>
                    {/* the subject name, a span instead of h3 because a button may only hold inline elements */}
                    <span className="block text-[15px] font-bold mb-1">
                      {subject.name}
                    </span>
                    {/* the class counts, a span instead of p for the same reason */}
                    <span className="block text-xs opacity-60">
                      {activeCount} active{" "}
                      {activeCount === 1 ? "class" : "classes"}
                      {archivedCount > 0 ? `, ${archivedCount} archived` : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </main>
      </div>
      <SubjectDetailModal
        subject={selectedSubject}
        onClose={() => setSelectedSubjectId(null)}
        onAddClass={openNewClassModal}
        onEnroll={openEnrollModal}
      />{" "}
      {/* the detail modal */}
      {/* the create modal sits on top of everything */}
      <NewSubjectModal
        isOpen={showNewSubjectModal}
        isSaving={isSaving}
        error={createError}
        onClose={() => setShowNewSubjectModal(false)}
        onSubmit={handleCreateSubject}
      />
      <NewClassModal
        isOpen={showNewClassModal && selectedSubject !== null} // only while a subject is open
        subjectName={selectedSubject?.name ?? ""} // shown in the title
        subjectPrefix={selectedSubject?.codePrefix ?? ""} // shown in the code hint
        teachers={teachers} // the teacher list
        isSaving={isSavingClass} // saving state
        error={classError} // inline error
        onClose={() => setShowNewClassModal(false)} // cancel
        onSubmit={handleCreateClass} // create
      />
      <EnrollStudentModal
        isOpen={enrollTarget !== null} // open whenever a class is chosen
        classTitle={enrollTarget?.name ?? ""} // class name for the heading
        classCode={enrollTarget?.offerCode ?? ""} // class code for the heading
        isSaving={isEnrolling} // saving state
        error={enrollError} // inline error
        onClose={() => setEnrollTarget(null)} // cancel
        onSearch={findStudents} // search function from the hook
        onSubmit={handleEnroll} // enroll
        onSubmitCsv={handleEnrollCsv} // enroll from CSV
      />
    </div>
  );
}
