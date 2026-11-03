import type { StudentResultRow } from "../screens/examResult/examResultsScreen.types";
import { collectPoolColumns } from "./resultsPools";

// how one question performed across every attempt shown on the results screen
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
  isHardest: boolean; // lowest average percent, only flagged when questions really differ
};

// builds one stat per question; attempts are counted separately, so a retry is its own data point
export function computeQuestionStats(rows: StudentResultRow[]): QuestionStat[] {
  if (rows.length === 0) return [];

  const stats: QuestionStat[] = rows[0].questionScores.map((column) => {
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

  // flag the hardest question, but only when there is a real difference between questions
  const scored = stats.filter((stat) => stat.maxPoints > 0 && stat.attempts > 0);
  if (scored.length >= 2) {
    const lowest = Math.min(...scored.map((stat) => stat.averagePercent));
    const highest = Math.max(...scored.map((stat) => stat.averagePercent));
    if (lowest < highest) {
      const hardest = scored.find((stat) => stat.averagePercent === lowest);
      if (hardest) hardest.isHardest = true;
    }
  }

  return stats;
}

// how one random pool performed across every attempt that drew from it;
// students draw different questions, so this covers whatever each student drew
export type PoolStat = {
  poolKey: string;
  label: string; // e.g. "P1", the same label the results table and CSV use
  title: string; // the pool's title, or "Random pool"
  attempts: number; // attempts that drew at least one question from this pool
  averageDrawn: number; // mean number of questions drawn per attempt
  averageScore: number; // mean points earned from this pool
  averageMax: number; // mean points the drawn questions were worth
  averagePercent: number; // total earned as a percent of total available, across attempts
  fullMarksPercent: number; // share of attempts that earned every point available to them
  zeroPercent: number; // share of attempts that earned nothing from the pool
};

// builds one stat per pool, in exam order; an attempt that drew nothing from a pool is not counted for it
export function computePoolStats(rows: StudentResultRow[]): PoolStat[] {
  return collectPoolColumns(rows).map((column) => {
    const cells = rows.flatMap((row) =>
      row.poolScores.filter((cell) => cell.poolKey === column.poolKey),
    );
    const attempts = cells.length;
    const totalScore = cells.reduce((sum, cell) => sum + cell.score, 0);
    const totalMax = cells.reduce((sum, cell) => sum + cell.maxPoints, 0);
    const totalDrawn = cells.reduce((sum, cell) => sum + cell.drawnCount, 0);

    return {
      poolKey: column.poolKey,
      label: column.label,
      title: column.title,
      attempts,
      averageDrawn: attempts > 0 ? totalDrawn / attempts : 0,
      averageScore: attempts > 0 ? totalScore / attempts : 0,
      averageMax: attempts > 0 ? totalMax / attempts : 0,
      averagePercent: totalMax > 0 ? (totalScore / totalMax) * 100 : 0,
      fullMarksPercent:
        attempts > 0
          ? (cells.filter((cell) => cell.maxPoints > 0 && cell.score >= cell.maxPoints).length /
              attempts) *
            100
          : 0,
      zeroPercent:
        attempts > 0
          ? (cells.filter((cell) => cell.score === 0).length / attempts) * 100
          : 0,
    };
  });
}