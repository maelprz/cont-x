import { useEffect, useState } from "react";
import {
  getClassExamResults,
  countInProgressSessions,
} from "../../services/examResultService";
import type { ExamResultsData } from "../../services/examResultService";
import {
  buildResultsCsv,
  downloadCsv,
  safeFileName,
} from "../../lib/resultsCsv";

type Props = {
  classExamId: string | null; // null = closed
  onClose: () => void;
};

export function EndedExamExportDialog({ classExamId, onClose }: Props) {
  const [data, setData] = useState<ExamResultsData | null>(null);
  const [inProgress, setInProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0); // bump to retry

  useEffect(() => {
    if (!classExamId) return;
    let isActive = true; // ignore stale fetch if dialog closes
    setIsLoading(true);
    setError(null);
    Promise.all([
      getClassExamResults(classExamId),
      countInProgressSessions(classExamId),
    ])
      .then(([results, count]) => {
        if (!isActive) return;
        setData(results);
        setInProgress(count);
      })
      .catch(() => {
        if (isActive) setError("Could not load the results. Try again.");
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });
    return () => {
      isActive = false;
    };
  }, [classExamId, reloadKey]);

  if (!classExamId) return null;

  const rows = data?.rows ?? [];

  const handleDownload = () => {
    if (!data) return;
    const date = new Date().toISOString().slice(0, 10); // date in file name so old exports not confused
    downloadCsv(
      safeFileName(data.examTitle, data.className, "results", date),
      buildResultsCsv(rows, data.passMark),
    );
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[380px] p-6 rounded-xl border bg-[var(--color-base-100)] border-[var(--color-base-300)]"
      >
        <h2 className="text-[17px] font-bold mb-1 text-[var(--color-base-content)]">
          Exam ended
        </h2>

        {isLoading && (
          <p className="text-[13px] mb-4 text-[var(--color-base-content)] opacity-60">
            Preparing results...
          </p>
        )}
        {error && (
          <p
            className="text-[13px] mb-3"
            style={{ color: "var(--color-error)" }}
          >
            {error}
          </p>
        )}

        {data && !isLoading && (
          <p className="text-[13px] mb-4 text-[var(--color-base-content)] opacity-60">
            {rows.length === 0
              ? "No submissions to export."
              : `${rows.length} attempt(s) are ready to export.`}
            {inProgress > 0 &&
              ` ${inProgress} student(s) had not submitted and are not included.`}
          </p>
        )}

        <div className="flex items-center justify-end gap-3">
          {error && (
            <button
              onClick={() => setReloadKey((k) => k + 1)}
              className="px-4 py-2 rounded-lg border border-[var(--color-base-300)] text-[13px] font-medium cursor-pointer bg-[var(--color-base-100)] text-[var(--color-base-content)]"
            >
              Retry
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-[var(--color-base-300)] text-[13px] font-medium cursor-pointer bg-[var(--color-base-100)] text-[var(--color-base-content)]"
          >
            Close
          </button>
          {data && rows.length > 0 && (
            <button
              onClick={handleDownload}
              className="px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-none bg-[var(--color-primary)] text-[var(--color-primary-content)]"
            >
              Download CSV
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
