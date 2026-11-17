import { useState } from "react";
import { Download } from "lucide-react";
import { useToast } from "../../hooks/useToast";
import { buildKeystrokeCsv, downloadCsv, safeFileName } from "../../lib/resultsCsv";
import type { StudentResultRow } from "../../screens/examResult/examResultsScreen.types";
import { getAttemptKeystrokes } from "../../services/keystrokeExportService";

interface KeystrokeCsvButtonProps {
  row: StudentResultRow;
  classExamId: string;
  examTitle: string;
  className: string;
  buttonClassName?: string;
}

export function KeystrokeCsvButton({ row, classExamId, examTitle, className, buttonClassName }: KeystrokeCsvButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { showToast } = useToast();
  const attempt = `${row.studentName}, attempt ${row.attemptNumber}`;

  async function exportKeystrokes() {
    setIsExporting(true);
    try {
      const batches = await getAttemptKeystrokes(row.sessionId, classExamId);
      if (batches.length === 0) {
        showToast(`No keystrokes were recorded for ${attempt}.`, "error");
        return;
      }
      const fileName = safeFileName(examTitle, className, row.studentName, `attempt-${row.attemptNumber}`, "keystrokes");
      downloadCsv(fileName, buildKeystrokeCsv(batches, row.questionScores));
    } catch {
      showToast("Could not export keystrokes. Please try again.", "error");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void exportKeystrokes()}
      disabled={isExporting}
      aria-busy={isExporting}
      aria-label={`Keystroke CSV for ${attempt}`}
      className={buttonClassName ?? "inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-[var(--color-primary)]/30 bg-[var(--color-info)]/20 px-3 py-1.5 text-[12px] font-medium text-[var(--color-primary)] hover:bg-[var(--color-info)]/35 disabled:opacity-50"}
    >
      <Download size={14} aria-hidden="true" />
      {isExporting ? "Preparing CSV…" : "Keystroke CSV"}
    </button>
  );
}
