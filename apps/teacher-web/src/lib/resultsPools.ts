import type {
  PoolScoreCell,
  StudentResultRow,
} from "../screens/examResult/examResultsScreen.types";

// one question a student drew, as stored in session_pool_questions
export type PoolDrawRow = {
  id: string;
  session_id: string;
  pool_id: string | null; // null once the pool itself was deleted
  pool_title: string | null;
  pool_order_index: number;
  max_points: number;
};

// one answer to a drawn question, as stored in student_answers
export type PoolAnswerRow = {
  pool_draw_id: string | null;
  score: number;
};

// groups one student's draws by pool and adds up what they earned in each;
// questions they drew but never answered count as 0 against the pool's maximum
export function buildPoolScores(
  draws: PoolDrawRow[],
  answers: PoolAnswerRow[],
): PoolScoreCell[] {
  const byPool = new Map<string, PoolScoreCell>();

  for (const draw of draws) {
    const poolKey = draw.pool_id ?? `order-${draw.pool_order_index}`;
    const cell =
      byPool.get(poolKey) ??
      {
        poolKey,
        poolOrder: draw.pool_order_index,
        title: draw.pool_title ?? "Random pool",
        drawnCount: 0,
        score: 0,
        maxPoints: 0,
      };

    const answer = answers.find((a) => a.pool_draw_id === draw.id);
    cell.drawnCount += 1;
    cell.maxPoints += draw.max_points;
    cell.score += answer?.score ?? 0;
    byPool.set(poolKey, cell);
  }

  return [...byPool.values()].sort((a, b) => a.poolOrder - b.poolOrder);
}

// table/CSV columns for pools: every pool any attempt drew from, in exam order, labelled P1, P2...
export type PoolColumn = { poolKey: string; label: string; title: string };

export function collectPoolColumns(rows: StudentResultRow[]): PoolColumn[] {
  const seen = new Map<string, { poolOrder: number; title: string }>();
  for (const row of rows) {
    for (const cell of row.poolScores) {
      if (!seen.has(cell.poolKey)) {
        seen.set(cell.poolKey, { poolOrder: cell.poolOrder, title: cell.title });
      }
    }
  }
  return [...seen.entries()]
    .sort((a, b) => a[1].poolOrder - b[1].poolOrder)
    .map(([poolKey, info], index) => ({
      poolKey,
      label: `P${index + 1}`,
      title: info.title,
    }));
}