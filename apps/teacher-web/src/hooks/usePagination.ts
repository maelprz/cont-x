import { useState } from "react";

export function usePagination<T>(items: readonly T[], pageSize = 10, resetKey = "", initialPage = 1) {
  const [selection, setSelection] = useState<{ key: string; page: number | null }>({ key: resetKey, page: null });
  if (selection.key !== resetKey) setSelection({ key: resetKey, page: null });

  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(selection.key === resetKey ? selection.page ?? initialPage : initialPage, pageCount);
  const start = (page - 1) * pageSize;

  return {
    page,
    pageCount,
    items: items.slice(start, start + pageSize),
    onPageChange: (nextPage: number) => setSelection({ key: resetKey, page: nextPage }),
  };
}
