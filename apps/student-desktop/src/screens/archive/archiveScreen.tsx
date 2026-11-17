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
      <AppHeader title="Archive" />

      <div className="flex flex-wrap items-start justify-between gap-4 px-4 sm:px-8 pt-8">
        <div>
          <h2 className="font-[var(--font-headline)] text-[var(--text-primary)] text-xl font-semibold mb-2">
            Previous Assessments
          </h2>
          <p className="text-sm text-[var(--text-secondary)] max-w-[460px]">
            Review completed exams, scores, and available answers.
          </p>
        </div>

        {/* total exam count card */}
        <div className="bg-[var(--bg-card)] border border-stone-200 rounded-xl px-5 py-3 text-center shrink-0">
          <span className="block font-[var(--font-label)] text-[10px] uppercase tracking-wide text-[var(--text-secondary)] mb-1">
            Total Exams
          </span>
          <span className="block text-[var(--text-primary)] text-xl font-semibold">
            {isLoading ? "..." : examHistory.length}
          </span>
        </div>
      </div>

      <main className="px-4 sm:px-8 py-6 flex flex-col gap-4">
        {/* filter and sort controls */}
        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-stone-200 bg-[#f8f8f8] p-4">
          <label className="flex flex-col gap-1.5 text-xs font-medium text-stone-600">Result
          <select
            value={statusFilter}
            onChange={(e) =>
              handleStatusFilterChange(
                e.target.value as "all" | "passed" | "failed",
              )
            }
            className="max-w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:outline-2 focus:outline-offset-2 focus:outline-[#465a3b]"
          >
            <option value="all">Status: All</option>
            <option value="passed">Status: Passed</option>
            <option value="failed">Status: Failed</option>
          </select>

          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-stone-600">Order
          <select
            value={sortOrder}
            onChange={(e) =>
              handleSortOrderChange(e.target.value as "asc" | "desc")
            }
            className="max-w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:outline-2 focus:outline-offset-2 focus:outline-[#465a3b]"
          >
            <option value="desc">Sort: Date (Newest First)</option>
            <option value="asc">Sort: Date (Oldest First)</option>
          </select>
          </label>
        </div>

        {/* loading state */}
        {isLoading && (
          <div role="status" className="text-[var(--text-secondary)] text-sm py-8 text-center">
            Loading exam history...
          </div>
        )}

        {/* error state */}
        {error && (
          <div role="alert" className="text-red-700 text-sm py-8 text-center">{error}</div>
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
            <div className="bg-[var(--bg-card)] border border-stone-200 rounded-xl overflow-x-auto">
              <table className="min-w-[700px] w-full border-collapse">
                <thead>
                  <tr className="bg-stone-100/70">
                    <th className="text-left font-medium text-xs text-[var(--text-secondary)] py-3.5 px-5 border-b border-stone-200">
                      Exam Name
                    </th>
                    <th className="text-left font-medium text-xs text-[var(--text-secondary)] py-3.5 px-5 border-b border-stone-200">
                      Date
                    </th>
                    <th className="text-left font-medium text-xs text-[var(--text-secondary)] py-3.5 px-5 border-b border-stone-200">
                      Score
                    </th>
                    <th className="text-left font-medium text-xs text-[var(--text-secondary)] py-3.5 px-5 border-b border-stone-200">
                      Status
                    </th>
                    <th className="text-center font-medium text-xs text-[var(--text-secondary)] py-3.5 px-5 border-b border-stone-200">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.length === 0 && <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-stone-500">No exams match this filter.</td></tr>}
                  {paginated.map((entry, index) => {
                    const isLastRow = index === paginated.length - 1;
                    return (
                      <tr
                        key={entry.id}
                        className="hover:bg-stone-50"
                      >
                        {/* exam name + code */}
                        <td
                          className={`py-4 px-5 ${isLastRow ? "" : "border-b border-stone-200"}`}
                        >
                          <span className="block text-[var(--text-primary)] text-sm font-medium">
                            {entry.examTitle}
                          </span>
                          <span className="block text-xs text-[var(--text-secondary)] mt-0.5">
                            {entry.examCode}
                          </span>
                        </td>

                        {/* submitted date */}
                        <td
                          className={`py-4 px-5 text-sm text-[var(--text-primary)] ${isLastRow ? "" : "border-b border-stone-200"}`}
                        >
                          {entry.submittedAt}
                        </td>

                        {/* score out of max */}
                        <td
                          className={`py-4 px-5 text-sm text-[var(--text-primary)] font-medium ${isLastRow ? "" : "border-b border-stone-200"}`}
                        >
                          {entry.totalScore}/{entry.maxScore}
                        </td>

                        {/* pass/fail badge */}
                        <td
                          className={`py-4 px-5 ${isLastRow ? "" : "border-b border-stone-200"}`}
                        >
                          <span
                            className={`text-xs px-2.5 py-1 rounded-full ${
                              entry.passed
                                ? "bg-[var(--accent-green)]/15 text-[var(--accent-green)]"
                                : "bg-[rgba(239,68,68,0.15)] text-[#ef4444]"
                            }`}
                          >
                            {entry.passed ? "Pass" : "Fail"}
                          </span>
                        </td>
                        <td className={`py-4 px-5 ${isLastRow ? "" : "border-b border-stone-200"}`}>
                          <div className="flex flex-wrap justify-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewResult(entry.id);
                              }}
                              className="px-3 py-1.5 rounded-lg border border-[var(--border-primary)] bg-transparent text-[var(--text-primary)] text-xs font-normal cursor-pointer hover:border-[var(--accent-blue)] hover:text-[var(--accent-blue)] transition-colors duration-150"
                            >
                              View Results
                            </button>
                            {entry.allowReview && <ViewAnswersButton sessionId={entry.id} />}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* pagination controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 mt-2">
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
                  aria-label="Previous page"
                  disabled={currentPage === 1} // grayed out on first page
                  className="text-[var(--text-secondary)] p-1.5 rounded-md hover:bg-stone-200 disabled:opacity-30"
                >
                  <ChevronLeft size={14} />
                </button>

                {/* page number buttons */}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (pageNumber) => (
                    <button
                      key={pageNumber}
                      type="button"
                      aria-current={pageNumber === currentPage ? "page" : undefined}
                      onClick={() => setCurrentPage(pageNumber)} // jumps to that page
                      className={`text-xs w-7 h-7 rounded-md ${
                        pageNumber === currentPage
                          ? "bg-[#e9eee3] font-semibold text-[#465a3b]"
                          : "text-[var(--text-secondary)] hover:bg-stone-200"
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
                  aria-label="Next page"
                  disabled={currentPage === totalPages} // grayed out on last page
                  className="text-[var(--text-secondary)] p-1.5 rounded-md hover:bg-stone-200 disabled:opacity-30"
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
