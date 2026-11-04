import type { StudentResultRow } from "../screens/examResult/examResultsScreen.types";
import { collectPoolColumns } from "./resultsPools";

// how one fixed question performed across every attempt shown on the results screen
export type QuestionStat = {
  questionId: string;
  label: string; // e.g. "Q1"
  title: string; // the question's own title
  maxPoints: number;
  attempts: number; // how many attempts the numbers below are based on
  averageScore: number; // mean points earned
  averagePercent: number; // averageScore as a percent of maxPoints
  fullMarksPercent: number; // share of attempts that earned every point
  zeroPercent: number; // share of attempts that earned nothing
  isHardest: boolean; // lowest average percent across ALL questions, fixed and pooled
};

// how one pooled question performed; it only counts the attempts that actually drew it,
// because every student draws a different set from the pool
export type PooledQuestionStat = {
  key: string; // pool + bank question, unique per row
  poolLabel: string; // e.g. "P1", the same label the results table and CSV use
  poolTitle: string; // the pool it was drawn from, or "Random pool"
  title: string; // the question's own title
  attempts: number; // attempts that drew this question
  maxPoints: number; // mean points the question was worth (pool points can differ per attempt)
  averageScore: number; // mean points earned
  averagePercent: number; // total earned as a percent of total available
  fullMarksPercent: number; // share of those attempts that earned every point
  zeroPercent: number; // share of those attempts that earned nothing
  isHardest: boolean; // lowest average percent across ALL questions, fixed and pooled
};

export type QuestionPerformance = {
  fixed: QuestionStat[];
  pooled: PooledQuestionStat[];
};

// one stat per fixed question; attempts are counted separately, so a retry is its own data point
function buildFixedStats(rows: StudentResultRow[]): QuestionStat[] {
  if (rows.length === 0) return [];

  return rows[0].questionScores.map((column) => {
    const cells = rows.flatMap((row) =>
      row.questionScores.filter((cell) => cell.questionId === column.questionId),
    );
    const attempts = cells.length;
    const totalScore = cells.reduce((sum, cell) => sum + cell.score, 0);
    const averageScore = attempts > 0 ? totalScore / attempts : 0;

    return {
      questionId: column.questionId,
      label: column.label,
      title: column.title,
      maxPoints: column.maxPoints,
      attempts,
      averageScore,
      averagePercent: column.maxPoints > 0 ? (averageScore / column.maxPoints) * 100 : 0,
      fullMarksPercent:
        attempts > 0
          ? (cells.filter((cell) => cell.status === "correct").length / attempts) * 100
          : 0,
      zeroPercent:
        attempts > 0
          ? (cells.filter((cell) => cell.score === 0).length / attempts) * 100
          : 0,
      isHardest: false,
    };
  });
}

// one stat per question drawn from a pool; a question nobody drew has no row
function buildPooledStats(rows: StudentResultRow[]): PooledQuestionStat[] {
  type Totals = {
    poolOrder: number;
    poolLabel: string;
    poolTitle: string;
    title: string;
    attempts: number;
    totalScore: number;
    totalMax: number;
    fullMarks: number;
    zeros: number;
  };

  const labelByPool = new Map(
    collectPoolColumns(rows).map((column) => [column.poolKey, column.label]),
  );
  const totals = new Map<string, Totals>();

  for (const row of rows) {
    for (const cell of row.poolScores) {
      for (const drawn of cell.questions) {
        const key = `${cell.poolKey}:${drawn.bankQuestionId}`;
        const entry =
          totals.get(key) ??
          {
            poolOrder: cell.poolOrder,
            poolLabel: labelByPool.get(cell.poolKey) ?? "P?",
            poolTitle: cell.title,
            title: drawn.title,
            attempts: 0,
            totalScore: 0,
            totalMax: 0,
            fullMarks: 0,
            zeros: 0,
          };
        entry.attempts += 1;
        entry.totalScore += drawn.score;
        entry.totalMax += drawn.maxPoints;
        if (drawn.maxPoints > 0 && drawn.score >= drawn.maxPoints) entry.fullMarks += 1;
        if (drawn.score === 0) entry.zeros += 1;
        totals.set(key, entry);
      }
    }
  }

  return [...totals.entries()]
    .sort(
      (a, b) =>
        a[1].poolOrder - b[1].poolOrder || a[1].title.localeCompare(b[1].title),
    )
    .map(([key, t]) => ({
      key,
      poolLabel: t.poolLabel,
      poolTitle: t.poolTitle,
      title: t.title,
      attempts: t.attempts,
      maxPoints: t.totalMax / t.attempts,
      averageScore: t.totalScore / t.attempts,
      averagePercent: t.totalMax > 0 ? (t.totalScore / t.totalMax) * 100 : 0,
      fullMarksPercent: (t.fullMarks / t.attempts) * 100,
      zeroPercent: (t.zeros / t.attempts) * 100,
      isHardest: false,
    }));
}

// per-question performance for the whole exam. Fixed and pooled questions are equals here:
// the single "hardest" flag goes to whichever has the lowest average percent, and only
// when questions really differ.
export function computeQuestionPerformance(rows: StudentResultRow[]): QuestionPerformance {
  const fixed = buildFixedStats(rows);
  const pooled = buildPooledStats(rows);

  const scored: { maxPoints: number; attempts: number; averagePercent: number; isHardest: boolean }[] =
    [...fixed, ...pooled].filter((stat) => stat.maxPoints > 0 && stat.attempts > 0);

  if (scored.length >= 2) {
    const lowest = Math.min(...scored.map((stat) => stat.averagePercent));
    const highest = Math.max(...scored.map((stat) => stat.averagePercent));
    if (lowest < highest) {
      const hardest = scored.find((stat) => stat.averagePercent === lowest);
      if (hardest) hardest.isHardest = true;
    }
  }

  return { fixed, pooled };
}