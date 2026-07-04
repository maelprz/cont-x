import { useState } from "react";
import { Filter, LayoutGrid } from "lucide-react";
import type {
  ExamCard,
  ExamLibraryScreenProps,
} from "./examLibraryScreen.types";
import { TeacherHeader } from "../../components/layout/teacherHeader";
import { TeacherSidebar } from "../../components/layout/teacherSidebar";
import { ExamCardTile } from "../../components/examLibrary/examCardTile";
import { CreateNewCard } from "../../components/examLibrary/createNewCard";
import { useRouterLogic } from "../../router/routerLogic";
import { useExamLibrary } from "../../hooks/useExamLibrary";
import { useCreateExam } from "../../hooks/useCreateExam";
import { useExamBuilderStore } from "../../store/useExamBuilderStore";
import { CreateExamModal } from "../../components/examLibrary/createExamModal";

// ---------------------------------------------------------------------------
// Mock data — replace with real Supabase query when wiring up
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Main screen — named export (not default)
// ---------------------------------------------------------------------------

export function ExamLibraryScreen({
  exams: examsProp,
  searchQuery: externalSearch,
  onSearchChange,
  onFilter,
  onToggleView,
  onCreateNewAssessment,
}: ExamLibraryScreenProps) {
  const [localSearch, setLocalSearch] = useState("");
  const search = externalSearch ?? localSearch;

  const navigateTo = useRouterLogic((state) => state.navigateTo);

  const { exams: fetchedExams} = useExamLibrary();
  const exams = examsProp ?? fetchedExams;

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { createExam, isCreating, error: createError } = useCreateExam();
  const setCurrentExamId = useExamBuilderStore((state) => state.setCurrentExamId);

  // called when teacher confirms the title in the modal
  const handleCreateExam = async (title: string) => {
    const newExamId = await createExam(title);
    if (newExamId) {
      setCurrentExamId(newExamId); // tells ExamBuilder which exam to load
      setIsCreateModalOpen(false);
      onCreateNewAssessment?.();
      navigateTo("examBuilder");
    }
  };

  const handleSearch = (q: string) => {
    setLocalSearch(q);
    onSearchChange?.(q);
  };

  const filtered = exams.filter(
    (e) =>
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.code.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-base-200)]">
      {/* reuses the exact same sidebar, "examLibrary" marks the active item */}
      <TeacherSidebar activeItem="examLibrary" />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TeacherHeader />

        <main
          className="flex-1 overflow-y-auto px-8 py-6"
          style={{ color: "var(--color-base-content)" }}
        >
          <p className="text-xs opacity-60 mb-2">
            Teacher Portal &gt; Exam Library
          </p>

          {/* heading + search/filter row */}
          <div className="flex items-start justify-between gap-6 mb-7">
            <div>
              <h1 className="text-2xl font-bold mb-1">Academic Inventory</h1>
              <p className="text-sm opacity-70 max-w-md leading-relaxed">
                Manage and deploy standardized assessments across your student
                cohorts. Ensure rigor and academic integrity with Cont/x's
                structured exam environment.
              </p>
            </div>

            <div className="flex flex-col items-end gap-2 shrink-0">
              {/* Search */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border w-[280px] border-[var(--color-base-300)] bg-[var(--color-base-100)]">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  style={{ opacity: 0.5, flexShrink: 0 }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                  />
                </svg>
                <input
                  type="text"
                  placeholder="Search exams by title or code"
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="flex-grow text-[13px] outline-none bg-transparent border-none text-[var(--color-base-content)] font-[inherit]"
                />
              </div>

              {/* Filter + grid-view toggle */}
              <div className="flex items-center gap-2">
                <button
                  onClick={onFilter}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--color-base-300)] text-[13px] text-[var(--color-base-content)]  bg-[var(--color-base-100)] font-medium cursor-pointer transition-opacity hover:opacity-70"
                >
                  <Filter size={13} />
                  Filter
                </button>
                <button
                  onClick={onToggleView}
                  className="p-2 rounded-lg border border-[var(--color-base-300)]  text-[var(--color-base-content)] bg-[var(--color-base-100)] cursor-pointer transition-opacity hover:opacity-70"
                >
                  <LayoutGrid size={15} />
                </button>
              </div>
            </div>
          </div>

          {/* Card grid */}
          <div className="grid grid-cols-3 gap-5">
            {/* "Create New" card — navigates to exam builder */}
            <CreateNewCard onClick={() => setIsCreateModalOpen(true)} />
            {filtered.map((exam) => (
              <ExamCardTile key={exam.id} exam={exam} />
            ))}
            <CreateExamModal
              isOpen={isCreateModalOpen}
              onClose={() => setIsCreateModalOpen(false)}
              onSubmit={handleCreateExam}
              isSubmitting={isCreating}
              error={createError}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
