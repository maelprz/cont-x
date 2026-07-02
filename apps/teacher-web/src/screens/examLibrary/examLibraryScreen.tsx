import { useState } from "react";
import { Plus, Filter, LayoutGrid, MoreVertical, FileText, Calendar, Users, Clock, BadgeCheck } from "lucide-react";
import type { ExamCard, ExamLibraryScreenProps, ExamStatus } from "./examLibraryScreen.types";
import { TeacherHeader } from "../../components/layout/teacherHeader";
import { TeacherSidebar } from "../../components/layout/teacherSidebar";
import { useRouterLogic } from "../../router/routerLogic";

// ---------------------------------------------------------------------------
// Mock data — replace with real Supabase query when wiring up
// ---------------------------------------------------------------------------
const MOCK_EXAMS: ExamCard[] = [
  {
    id: "1",
    code: "CS101",
    title: "CS101: Data Structures",
    description: "Fundamental course examining arrays, trees, and hash tables.",
    status: "published",
    questionCount: 24,
    createdAt: "Oct 12, 2023",
    studentCount: 142,
    ctaLabel: "Edit Exam",
  },
  {
    id: "2",
    code: "ALG202",
    title: "ALG202: Advanced Sorting",
    description: "In-depth analysis of O(n log n) algorithms and spatial complexity.",
    status: "draft",
    questionCount: 12,
    createdAt: "Nov 04, 2023",
    lastEditedLabel: "Last edited 2h ago",
    ctaLabel: "Continue Building",
  },
  {
    id: "3",
    code: "SYS301",
    title: "SYS301: OS Kernels",
    description: "Practical coding exam on thread scheduling and memory management.",
    status: "published",
    questionCount: 8,
    createdAt: "Sep 28, 2023",
    footerMeta: "Quality Audited",
    ctaLabel: "View Results",
  },
  {
    id: "4",
    code: "WEB105",
    title: "WEB105: React Context API",
    description: "Frontend challenge focusing on state management and hook patterns.",
    status: "draft",
    questionCount: 15,
    createdAt: "Nov 15, 2023",
    ctaLabel: "Continue Building",
  },
  {
    id: "5",
    code: "DB404",
    title: "DB404: SQL Query Opt",
    description: "Advanced database exam on execution plans and indexing strategies.",
    status: "published",
    questionCount: 32,
    createdAt: "Aug 02, 2023",
    ctaLabel: "View Results",
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: ExamStatus }) {
  const base = "px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide";

  if (status === "published")
    return (
      <span
        className={base}
        style={{
          backgroundColor: "var(--color-info)",
          color: "var(--color-info-content)",
        }}
      >
        Published
      </span>
    );

  if (status === "draft")
    return (
      <span
        className={base}
        style={{
          backgroundColor: "var(--color-base-300)",
          color: "var(--color-base-content)",
        }}
      >
        Draft
      </span>
    );

  return (
    <span
      className={base}
      style={{
        backgroundColor: "var(--color-warning)",
        color: "var(--color-warning-content)",
      }}
    >
      Ended
    </span>
  );
}

// ---------------------------------------------------------------------------
// Exam card tile
// ---------------------------------------------------------------------------

function ExamCardTile({ exam }: { exam: ExamCard }) {
  const isDraft = exam.status === "draft";

  return (
    <div
      className="flex flex-col rounded-2xl border overflow-hidden transition-shadow duration-200 hover:shadow-md"
      style={{
        backgroundColor: "var(--color-base-100)",
        borderColor: "var(--color-base-300)",
      }}
    >
      {/* Card body */}
      <div className="flex flex-col gap-3 p-5 flex-grow">
        {/* Status + menu row */}
        <div className="flex items-center justify-between">
          <StatusBadge status={exam.status} />
          <button
            onClick={exam.onMenuOpen}
            className="p-1 rounded-lg cursor-pointer border-none bg-transparent transition-colors duration-150 hover:opacity-70"
            style={{ color: "var(--color-base-content)", opacity: 0.5 }}
          >
            <MoreVertical size={16} />
          </button>
        </div>

        {/* Title + description */}
        <div>
          <h3
            className="text-[16px] font-bold leading-snug mb-1"
            style={{ color: "var(--color-base-content)" }}
          >
            {exam.title}
          </h3>
          <p
            className="text-[13px] leading-relaxed"
            style={{ color: "var(--color-base-content)", opacity: 0.6 }}
          >
            {exam.description}
          </p>
        </div>

        {/* Meta: questions + created */}
        <div className="flex items-start gap-6 mt-auto pt-2">
          <div className="flex items-center gap-1.5">
            <FileText size={14} style={{ color: "var(--color-base-content)", opacity: 0.5 }} />
            <div>
              <p
                className="font-mono text-[9px] font-semibold uppercase tracking-widest mb-0.5"
                style={{ color: "var(--color-base-content)", opacity: 0.5 }}
              >
                Questions
              </p>
              <p className="text-[14px] font-bold" style={{ color: "var(--color-base-content)" }}>
                {exam.questionCount} Tasks
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Calendar size={14} style={{ color: "var(--color-base-content)", opacity: 0.5 }} />
            <div>
              <p
                className="font-mono text-[9px] font-semibold uppercase tracking-widest mb-0.5"
                style={{ color: "var(--color-base-content)", opacity: 0.5 }}
              >
                Created
              </p>
              <p className="text-[14px] font-bold" style={{ color: "var(--color-base-content)" }}>
                {exam.createdAt}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Card footer */}
      <div
        className="flex items-center justify-between px-5 py-3 border-t"
        style={{ borderColor: "var(--color-base-300)" }}
      >
        {/* Left footer meta */}
        <div
          className="flex items-center gap-1.5 text-[12px]"
          style={{ color: "var(--color-base-content)", opacity: 0.55 }}
        >
          {exam.studentCount !== undefined && (
            <>
              <Users size={13} />
              <span>{exam.studentCount} Students</span>
            </>
          )}
          {isDraft && exam.lastEditedLabel && (
            <>
              <Clock size={13} />
              <span>{exam.lastEditedLabel}</span>
            </>
          )}
          {exam.footerMeta && (
            <>
              <BadgeCheck size={13} />
              <span>{exam.footerMeta}</span>
            </>
          )}
        </div>

        {/* CTA link */}
        <button
          onClick={exam.onCta}
          className="flex items-center gap-1 text-[13px] font-bold cursor-pointer border-none bg-transparent transition-opacity duration-150 hover:opacity-70"
          style={{ color: "var(--color-secondary)" }}
        >
          {exam.ctaLabel ?? "Edit Exam"}
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// "Create New Assessment" dashed placeholder card
// ---------------------------------------------------------------------------

function CreateNewCard({ onClick }: { onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-8 cursor-pointer transition-colors duration-200 min-h-[260px] w-full bg-transparent"
      style={{ borderColor: "var(--color-base-300)" }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = "var(--color-base-100)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "transparent";
      }}
    >
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center"
        style={{ backgroundColor: "var(--color-base-300)" }}
      >
        <Plus size={22} style={{ color: "var(--color-base-content)", opacity: 0.6 }} />
      </div>
      <div className="text-center">
        <p
          className="text-[16px] font-bold mb-1"
          style={{ color: "var(--color-base-content)" }}
        >
          Create New Assessment
        </p>
        <p
          className="text-[13px]"
          style={{ color: "var(--color-base-content)", opacity: 0.55 }}
        >
          Start building a new examination for your students.
        </p>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main screen — named export (not default)
// ---------------------------------------------------------------------------

export function ExamLibraryScreen({
  exams = MOCK_EXAMS,
  searchQuery: externalSearch,
  onSearchChange,
  onFilter,
  onToggleView,
  onCreateNewAssessment,
}: ExamLibraryScreenProps) {
  const [localSearch, setLocalSearch] = useState("");
  const search = externalSearch ?? localSearch;

  const navigateTo = useRouterLogic((state) => state.navigateTo);

  const handleSearch = (q: string) => {
    setLocalSearch(q);
    onSearchChange?.(q);
  };

  const filtered = exams.filter(
    (e) =>
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ backgroundColor: "var(--color-base-200)" }}
    >
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
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-lg border w-[280px]"
                style={{
                  backgroundColor: "var(--color-base-100)",
                  borderColor: "var(--color-base-300)",
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  style={{ opacity: 0.5, flexShrink: 0 }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search exams by title or code"
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="flex-grow text-[13px] outline-none bg-transparent border-none"
                  style={{ color: "var(--color-base-content)", fontFamily: "inherit" }}
                />
              </div>

              {/* Filter + grid-view toggle */}
              <div className="flex items-center gap-2">
                <button
                  onClick={onFilter}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[13px] font-medium cursor-pointer transition-opacity hover:opacity-70"
                  style={{
                    borderColor: "var(--color-base-300)",
                    color: "var(--color-base-content)",
                    backgroundColor: "var(--color-base-100)",
                  }}
                >
                  <Filter size={13} />
                  Filter
                </button>
                <button
                  onClick={onToggleView}
                  className="p-2 rounded-lg border cursor-pointer transition-opacity hover:opacity-70"
                  style={{
                    borderColor: "var(--color-base-300)",
                    color: "var(--color-base-content)",
                    backgroundColor: "var(--color-base-100)",
                  }}
                >
                  <LayoutGrid size={15} />
                </button>
              </div>
            </div>
          </div>

          {/* Card grid */}
          <div className="grid grid-cols-3 gap-5">
            {/* "Create New" card — navigates to exam builder */}
            <CreateNewCard
              onClick={() => {
                onCreateNewAssessment?.();
                navigateTo("examBuilder");
              }}
            />

            {filtered.map((exam) => (
              <ExamCardTile key={exam.id} exam={exam} />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}