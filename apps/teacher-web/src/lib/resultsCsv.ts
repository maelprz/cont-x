import type { StudentResultRow } from "../screens/examResult/examResultsScreen.types";
import { collectPoolColumns } from "./resultsPools";
import type { KeystrokeBatch } from "../services/keystrokeExportService";

// percent of the exam's points this attempt earned (0 when the exam has no points)
export function scorePercent(row: StudentResultRow): number {
  return row.maxScore > 0 ? (row.totalScore / row.maxScore) * 100 : 0;
}

// writes one cell: numbers stay bare, text is quoted with doubled quotes and defused
// if a spreadsheet would run it as a formula
function escapeCell(value: string | number | null): string {
  if (typeof value === "number") return String(value);
  let text = value ?? "";
  if (/^\s*[=+\-@]|^[\t\r\n]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function serializeCsv(rows: (string | number | null)[][]): string {
  return rows.map((cells) => cells.map(escapeCell).join(",")).join("\r\n");
}

// builds the full results sheet: one line per attempt, one column per question
export function buildResultsCsv(
  rows: StudentResultRow[],
  passMark: number | null, // percent, or null when the class exam has no minimum
): string {
  const questionColumns = rows[0]?.questionScores ?? [];
  const poolColumns = collectPoolColumns(rows); // students draw different pooled questions, so one column per pool

  const header = [
    "Student ID",
    "Student Name",
    "Attempt",
    "Total Score",
    "Max Score",
    "Percent",
    "Result",
    "Manual Adjustment",
    "Adjustment Reason",
    "Overtime Seconds",
    "Overtime Deduction",
    ...questionColumns.map((q) => `${q.label} (${q.maxPoints})`),
    ...poolColumns.map((pool) => `${pool.label} ${pool.title}`),
  ];

  const lines = rows.map((row) => {
    const percent = scorePercent(row);
    const result = passMark === null ? "" : percent >= passMark ? "Pass" : "Fail";
    return [
      row.studentIdNumber,
      row.studentName,
      row.attemptNumber,
      row.totalScore,
      row.maxScore,
      Math.round(percent * 100) / 100,
      result,
      row.scoreAdjustment,
      row.adjustmentReason,
      row.overtimeSeconds,
      row.overtimeDeduction ?? 0,
      ...row.questionScores.map((q) => q.score),
      // blank when this student drew nothing from that pool
      ...poolColumns.map(
        (pool) => row.poolScores.find((cell) => cell.poolKey === pool.poolKey)?.score ?? null,
      ),
    ];
  });

  return serializeCsv([header, ...lines]);
}

export function buildKeystrokeCsv(
  batches: KeystrokeBatch[],
  questions: StudentResultRow["questionScores"],
): string {
  const labels = new Map(questions.map(({ questionId, label }) => [questionId, label]));
  const rows: (string | number | null)[][] = [
    ["Question", "Question Title", "Question or Pool Draw ID", "Elapsed (ms)", "Key", "Event", "Batch Saved At (UTC)"],
  ];

  for (const batch of batches) {
    const savedAt = new Date(batch.loggedAt).toISOString();
    // The recorder resets the first gap to its start time at each drain.
    let elapsedMs = 0;
    for (const token of batch.sequence.split(",")) {
      const match = /^(\d+):([a-z0-9]+)(:up)?$/i.exec(token);
      if (!match) throw new Error("Invalid keystroke data.");
      const [, gap, code, release] = match;
      elapsedMs += Number(gap);
      rows.push([
        labels.get(batch.questionId) ?? null,
        batch.questionTitle,
        batch.questionId,
        elapsedMs,
        code,
        release ? "Release" : "Press",
        savedAt,
      ]);
    }
  }

  return serializeCsv(rows);
}

// turns pieces of a title into a safe file name, e.g. "Midterm-CS101-A"
export function safeFileName(...parts: string[]): string {
  const joined = parts
    .join(" ")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "");
  return joined || "results";
}

// saves csv text as a file in the browser; the BOM keeps Excel from garbling UTF-8 names
export function downloadCsv(fileName: string, csv: string): void {
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${fileName}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
