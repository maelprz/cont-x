type ResultPage<T> = {
  data: T[] | null;
  count: number | null;
  error: { message: string } | null;
};

// Callers must order by a unique key and request an exact count. Advance by the
// actual response length because a project's API cap may be below our page size.
export async function loadResultRows<T>(
  fetchPage: (from: number, to: number) => PromiseLike<ResultPage<T>>,
  keyOf: (row: T) => string,
): Promise<T[]> {
  const rows: T[] = [];
  const keys = new Set<string>();
  let expected: number | null = null;
  do {
    const { data, count, error } = await fetchPage(rows.length, rows.length + 499);
    if (error) throw new Error(error.message);
    if (count === null || (expected !== null && count !== expected)) {
      throw new Error("Results changed or could not be loaded completely. Refresh and try again.");
    }
    expected = count;
    const page = data ?? [];
    if ((!page.length && rows.length < expected) || rows.length + page.length > expected) {
      throw new Error("Some results are missing. Refresh and try again.");
    }
    for (const row of page) {
      const key = keyOf(row);
      if (keys.has(key)) throw new Error("Results changed while loading. Refresh and try again.");
      keys.add(key);
      rows.push(row);
    }
  } while (rows.length < expected);
  return rows;
}
