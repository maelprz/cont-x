import { useState } from "react";
import type { ArchiveScreenProps } from "./archiveScreen.types";
import { ViewAnswersButton } from "../../components/examHistory/viewAnswersButton";
import { AppHeader } from "../../components/layout/appHeader";
import { useAllExamHistory } from "../../hooks/useAllExamHistory"; // real data hook
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouterLogic } from "../../router/routerLogic";
import { useExamSessionStore } from "../../stores/useExamSessionStore";

const ROWS_PER_PAGE = 5; // how many exams to show per page

export function ArchiveScreen(_props: ArchiveScreenProps) {
  const { examHistory, isLoading, error } = useAllExamHistory(); // fetches all exams from Supabase
  const navigateTo = useRouterLogic((state) => state.navigateTo);
  const setSessionId = useExamSessionStore((state) => state.setSessionId);

  // Sends the student to the Result screen for this specific past exam session.
  function handleViewResult(sessionId: string) {
    setSessionId(sessionId); // tell the Result screen which session to load
    navigateTo("examResult");
  }

  const [statusFilter, setStatusFilter] = useState<"all" | "passed" | "failed">(
    "all",
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1); // tracks which page the student is on

  // filters by pass/fail status
  const filtered = examHistory.filter((entry) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "passed") return entry.passed;
    if (statusFilter === "failed") return !entry.passed;
    return true;
  });

  // sorts by submitted date
  const sorted = [...filtered].sort((a, b) => {
    const aTime = new Date(a.submittedAt).getTime();
    const bTime = new Date(b.submittedAt).getTime();
    return sortOrder === "desc" ? bTime - aTime : aTime - bTime;
  });

  // slices the sorted list into pages
  const totalPages = Math.max(1, Math.ceil(sorted.length / ROWS_PER_PAGE));
  const paginated = sorted.slice(
    (currentPage - 1) * ROWS_PER_PAGE,
    currentPage * ROWS_PER_PAGE,
  );

  // resets to page 1 when filter or sort changes
  function handleStatusFilterChange(value: "all" | "passed" | "failed") {
    setStatusFilter(value);
    setCurrentPage(1); // go back to first page when filter changes
  }

  function handleSortOrderChange(value: "asc" | "desc") {
    setSortOrder(value);
    setCurrentPage(1); // go back to first page when sort changes
  }

  return (
    <div className="flex flex-col h-screen overflow-y-auto bg-[var(--bg-app)]">
      <AppHeader />

      <div className="flex items-start justify-between gap-4 px-8 pt-8">
        <div>
          <h1 className="font-[var(--font-headline)] text-[var(--text-primary)] text-2xl mb-2">
            Previous Assessments
          </h1>
          <p className="text-sm text-[var(--text-secondary)] max-w-[460px]">
            Access detailed reports and performance metrics for all completed
            examinations.
          </p>
        </div>

        {/* total exam count card */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl px-5 py-3 text-center shrink-0">
          <span className="block font-[var(--font-label)] text-[10px] uppercase tracking-wide text-[var(--text-secondary)] mb-1">
            Total Exams
          </span>
          <span className="block text-[var(--text-primary)] text-xl font-semibold">
            {isLoading ? "..." : examHistory.length}
          </span>
        </div>
      </div>

      <main className="px-8 py-6 flex flex-col gap-4">
        {/* filter and sort controls */}
        <div className="flex gap-3">
          <select
            value={statusFilter}
            onChange={(e) =>
              handleStatusFilterChange(
                e.target.value as "all" | "passed" | "failed",
              )
            }
            className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)]"
          >
            <option value="all">Status: All</option>
            <option value="passed">Status: Passed</option>
            <option value="failed">Status: Failed</option>
          </select>

          <select
            value={sortOrder}
            onChange={(e) =>
              handleSortOrderChange(e.target.value as "asc" | "desc")
            }
            className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)]"
          >
            <option value="desc">Sort: Date (Newest First)</option>
            <option value="asc">Sort: Date (Oldest First)</option>
          </select>
        </div>

        {/* loading state */}
        {isLoading && (
          <div className="text-[var(--text-secondary)] text-sm py-8 text-center">
            Loading exam history...
          </div>
        )}

        {/* error state */}
        {error && (
          <div className="text-red-400 text-sm py-8 text-center">{error}</div>
        )}

        {/* empty state */}
        {!isLoading && !error && examHistory.length === 0 && (
          <div className="text-[var(--text-secondary)] text-sm py-8 text-center">
            No completed exams found.
          </div>
        )}

        {/* table — only renders when data is ready */}
        {!isLoading && !error && examHistory.length > 0 && (
          <>
            <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.25)] overflow-hidden">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-white/[0.02]">
                    <th className="text-left font-[var(--font-label)] text-[11px] uppercase tracking-wide text-[var(--text-secondary)] py-3.5 px-5 border-b border-[var(--border-subtle)]">
                      Exam Name
                    </th>
                    <th className="text-left font-[var(--font-label)] text-[11px] uppercase tracking-wide text-[var(--text-secondary)] py-3.5 px-5 border-b border-[var(--border-subtle)]">
                      Date
                    </th>
                    <th className="text-left font-[var(--font-label)] text-[11px] uppercase tracking-wide text-[var(--text-secondary)] py-3.5 px-5 border-b border-[var(--border-subtle)]">
                      Score
                    </th>
                    <th className="text-left font-[var(--font-label)] text-[11px] uppercase tracking-wide text-[var(--text-secondary)] py-3.5 px-5 border-b border-[var(--border-subtle)]">
                      Status
                    </th>
                    <th className="text-left font-[var(--font-label)] text-[11px] uppercase tracking-wide text-[var(--text-secondary)] py-3.5 px-5 border-b border-[var(--border-subtle)]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((entry, index) => {
                    const isLastRow = index === paginated.length - 1;
                    return (
                      <tr
                        key={entry.id}
                        onClick={() => handleViewResult(entry.id)}
                        className="hover:bg-white/[0.02] cursor-pointer"
                      >
                        {/* exam name + code */}
                        <td
                          className={`py-4 px-5 ${isLastRow ? "" : "border-b border-[var(--border-subtle)]"}`}
                        >
                          <span className="block text-[var(--text-primary)] text-sm font-medium">
                            {entry.examTitle}
                          </span>
                          <span className="block font-[var(--font-label)] text-xs text-[var(--text-secondary)] mt-0.5">
                            {entry.examCode}
                          </span>
                        </td>

                        {/* submitted date */}
                        <td
                          className={`py-4 px-5 text-sm text-[var(--text-primary)] ${isLastRow ? "" : "border-b border-[var(--border-subtle)]"}`}
                        >
                          {entry.submittedAt}
                        </td>

                        {/* score out of max */}
                        <td
                          className={`py-4 px-5 text-sm text-[var(--text-primary)] font-medium ${isLastRow ? "" : "border-b border-[var(--border-subtle)]"}`}
                        >
                          {entry.totalScore}/{entry.maxScore}
                        </td>

                        {/* pass/fail badge */}
                        <td
                          className={`py-4 px-5 ${isLastRow ? "" : "border-b border-[var(--border-subtle)]"}`}
                        >
                          <span
                            className={`font-[var(--font-label)] text-xs px-2.5 py-1 rounded-full ${
                              entry.passed
                                ? "bg-[var(--accent-green)]/15 text-[var(--accent-green)]"
                                : "bg-[rgba(239,68,68,0.15)] text-[#ef4444]"
                            }`}
                          >
                            {entry.passed ? "Pass" : "Fail"}
                          </span>
                        </td>
                        <td className={`py-4 px-5 ${isLastRow ? "" : "border-b border-[var(--border-subtle)]"}`}>
                          {entry.allowReview && <ViewAnswersButton sessionId={entry.id} />}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* pagination controls */}
            <div className="flex items-center justify-between mt-2">
              <span className="text-[var(--text-secondary)] text-xs">
                Showing{" "}
                {Math.min((currentPage - 1) * ROWS_PER_PAGE + 1, sorted.length)}
                –{Math.min(currentPage * ROWS_PER_PAGE, sorted.length)} of{" "}
                {sorted.length} assessments
              </span>

              <div className="flex items-center gap-1">
                {/* previous page button */}
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1} // grayed out on first page
                  className="text-[var(--text-secondary)] p-1.5 rounded-md hover:bg-white/5 disabled:opacity-30"
                >
                  <ChevronLeft size={14} />
                </button>

                {/* page number buttons */}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (pageNumber) => (
                    <button
                      key={pageNumber}
                      type="button"
                      onClick={() => setCurrentPage(pageNumber)} // jumps to that page
                      className={`text-xs w-7 h-7 rounded-md ${
                        pageNumber === currentPage
                          ? "bg-[var(--accent-blue)] text-white"
                          : "text-[var(--text-secondary)] hover:bg-white/5"
                      }`}
                    >
                      {pageNumber}
                    </button>
                  ),
                )}

                {/* next page button */}
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages} // grayed out on last page
                  className="text-[var(--text-secondary)] p-1.5 rounded-md hover:bg-white/5 disabled:opacity-30"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}