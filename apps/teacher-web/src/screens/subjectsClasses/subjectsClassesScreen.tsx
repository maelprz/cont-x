import { useState } from "react"; // state for search, modal, and saving
import { Loader2, Plus } from "lucide-react"; // spinner and plus icons
import { AdminHeader } from "../../components/layoutAdmin/adminHeader"; // the shared top bar
import { AdminAreaSidebar } from "../../components/layoutAdmin/adminAreaSidebar"; // sidebar for admins and teacher-admins
import { NewSubjectModal } from "../../components/subjectsClasses/newSubjectModal"; // the create modal
import { useSubjectsClasses } from "../../hooks/useSubjectsClasses"; // loads subjects and creates them
import { useToast } from "../../hooks/useToast"; // the shared toast notifications

export function SubjectsClassesScreen() {
  const { subjects, isLoading, error, addSubject } = useSubjectsClasses(); // data plus the create action
  const { showToast } = useToast(); // shows the success message

  const [searchQuery, setSearchQuery] = useState(""); // text typed into the header search
  const [showNewSubjectModal, setShowNewSubjectModal] = useState(false); // whether the modal is open
  const [isSaving, setIsSaving] = useState(false); // true while a subject is being created
  const [createError, setCreateError] = useState<string | null>(null); // error shown inside the modal

  const visibleSubjects = subjects.filter((s) => // narrows the list to the search text
    `${s.codePrefix} ${s.name}`.toLowerCase().includes(searchQuery.toLowerCase()), // matches the prefix or the name
  );

  function openNewSubjectModal() { // runs when the New Subject button is clicked
    setCreateError(null); // clear any old error
    setShowNewSubjectModal(true); // show the modal
  }

  async function handleCreateSubject(name: string) { // runs when the modal confirms
    setIsSaving(true); // block double clicks
    setCreateError(null); // clear any old error
    try {
      await addSubject(name); // ask the database to create it, then refresh the list
      setShowNewSubjectModal(false); // close the modal
      showToast("Subject created."); // tell the admin it worked
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Could not create the subject."); // show the safe message in the modal
    } finally {
      setIsSaving(false); // saving is over either way
    }
  }

  return (
    <div className="flex h-screen bg-[var(--color-base-200)] text-[var(--color-base-content)]">
      <AdminAreaSidebar activeItem="subjectsClasses" />

      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader searchValue={searchQuery} onSearchChange={setSearchQuery} />

        <main className="flex-1 overflow-y-auto px-8 py-6">
          <p className="text-xs opacity-60 mb-2">Core System &gt; Subjects &amp; Classes</p>

          {/* title row with the New Subject button */}
          <div className="flex items-start justify-between gap-6 mb-6">
            <div>
              <h1 className="text-2xl font-bold mb-1">Subjects &amp; Classes</h1>
              <p className="text-sm opacity-70 max-w-xl">
                Create subjects, add classes to them, and assign each class to a teacher.
              </p>
            </div>
            <button
              onClick={openNewSubjectModal} // opens the create modal
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-none transition-opacity hover:opacity-90 shrink-0"
              style={{ backgroundColor: "var(--color-primary)", color: "var(--color-primary-content)" }}
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
            <p className="text-sm opacity-60 py-8">No subjects yet. Create the first one.</p>
          )}
          {!isLoading && !error && subjects.length > 0 && visibleSubjects.length === 0 && (
            <p className="text-sm opacity-60 py-8">No subjects match your search.</p>
          )}

          {/* the subject cards */}
          {!isLoading && !error && visibleSubjects.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {visibleSubjects.map((subject) => {
                const activeCount = subject.classes.filter((c) => c.archivedAt === null).length; // classes still in use
                const archivedCount = subject.classes.length - activeCount; // classes already archived
                return (
                  <div
                    key={subject.id} // unique key for React
                    className="bg-[var(--color-base-100)] border border-[var(--color-base-300)] rounded-2xl p-5"
                  >
                    {/* the two-digit prefix badge */}
                    <span
                      className="inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full mb-3"
                      style={{ backgroundColor: "var(--color-primary)", color: "var(--color-primary-content)" }}
                    >
                      {subject.codePrefix}
                    </span>
                    <h3 className="text-[15px] font-bold mb-1">{subject.name}</h3>
                    <p className="text-xs opacity-60">
                      {activeCount} active {activeCount === 1 ? "class" : "classes"}
                      {archivedCount > 0 ? `, ${archivedCount} archived` : ""}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* the create modal sits on top of everything */}
      <NewSubjectModal
        isOpen={showNewSubjectModal}
        isSaving={isSaving}
        error={createError}
        onClose={() => setShowNewSubjectModal(false)}
        onSubmit={handleCreateSubject}
      />
    </div>
  );
}