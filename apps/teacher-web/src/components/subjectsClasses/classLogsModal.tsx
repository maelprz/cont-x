import { useEffect, useState } from "react";
import { getClassLogs, type ClassLogEntry, type ClassLogFilters } from "../../services/classLogService";

const emptyFilters: ClassLogFilters = { search: "", event: "", outcome: "", from: "", to: "" };
const eventLabels: Record<string, string> = {
  exam_settings: "Exam settings", session_code: "Session code", exam_entry: "Exam entry",
  attempt_status: "Attempt status", enrollment: "Enrollment", class_insert: "Class created", class_update: "Class changed",
};
export function ClassLogsModal({ classId, className, onClose }: { classId: string; className: string; onClose: () => void }) {
  const [draft, setDraft] = useState(emptyFilters);
  const [filters, setFilters] = useState(emptyFilters);
  const [page, setPage] = useState(0);
  const [reload, setReload] = useState(0);
  const [rows, setRows] = useState<ClassLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ClassLogEntry | null>(null);
  useEffect(() => {
    let active = true;
    getClassLogs(classId, filters, page * 50).then(result => {
      if (active) { setRows(result.rows); setTotal(result.total); }
    }).catch(err => { if (active) setError(err instanceof Error ? err.message : "Could not load class logs."); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [classId, filters, page, reload]);
  function beginLoad() { setBusy(true); setError(null); setSelected(null); }
  function refresh() { beginLoad(); setReload(value => value + 1); }
  function changePage(value: number) { beginLoad(); setPage(value); }
  function applyFilters(event: React.FormEvent) { event.preventDefault(); beginLoad(); setPage(0); setFilters({ ...draft }); }
  return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-5" onClick={onClose}>
    <section role="dialog" aria-modal="true" aria-label={`Class logs: ${className}`} onClick={event => event.stopPropagation()} className="w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-xl border p-6 bg-[var(--color-base-100)] text-[var(--color-base-content)]">
      <div className="flex justify-between gap-4 mb-4"><div><h2 className="text-xl font-bold">Class logs — {className}</h2><p className="text-xs opacity-70">Recorded from this update onward. Search by person, event or changed value.</p></div><button type="button" onClick={onClose} aria-label="Close class logs">Close</button></div>
      <form onSubmit={applyFilters} className="flex flex-wrap gap-3 items-end mb-4">
        <label className="text-sm">Search<input aria-label="Search class logs" maxLength={200} value={draft.search} onChange={e => setDraft({ ...draft, search: e.target.value })} className="block border rounded p-2" /></label>
        <label className="text-sm">Event<select aria-label="Event type" value={draft.event} onChange={e => setDraft({ ...draft, event: e.target.value })} className="block border rounded p-2"><option value="">All events</option>{Object.entries(eventLabels).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <label className="text-sm">Outcome<select aria-label="Event outcome" value={draft.outcome} onChange={e => setDraft({ ...draft, outcome: e.target.value })} className="block border rounded p-2"><option value="">All outcomes</option><option value="success">Success</option><option value="denied">Denied</option></select></label>
        <label className="text-sm">From<input aria-label="Logs from" type="datetime-local" value={draft.from} onChange={e => setDraft({ ...draft, from: e.target.value })} className="block border rounded p-2" /></label>
        <label className="text-sm">To<input aria-label="Logs to" type="datetime-local" value={draft.to} onChange={e => setDraft({ ...draft, to: e.target.value })} className="block border rounded p-2" /></label>
        <button disabled={busy} type="submit" className="border rounded p-2">Search logs</button><button type="button" disabled={busy} onClick={refresh} className="border rounded p-2">Refresh</button>
      </form>
      {busy && <p role="status">Loading class logs...</p>}
      {error && <div role="alert"><p>{error}</p><button type="button" onClick={refresh}>Retry logs</button></div>}
      {!busy && !error && <>
        <p className="text-sm mb-2">{total} matching events</p>
        {rows.length === 0 ? <p>No class events match these filters.</p> : <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead><tr><th className="p-2">Time</th><th className="p-2">Actor / student</th><th className="p-2">Event</th><th className="p-2">Outcome</th><th className="p-2">Details</th></tr></thead><tbody>{rows.map(row => <tr key={row.id} className="border-t"><td className="p-2 whitespace-nowrap">{new Date(row.occurred_at).toLocaleString()}</td><td className="p-2">{row.actor_name}{row.target_name && <div className="text-xs opacity-70">Student: {row.target_name}</div>}</td><td className="p-2">{row.summary}</td><td className="p-2">{row.outcome}</td><td className="p-2"><button type="button" onClick={() => setSelected(row)} aria-label={`View log ${row.id}`} className="underline">View details</button></td></tr>)}</tbody></table></div>}
        <div className="flex gap-3 items-center mt-3"><button type="button" disabled={page === 0} onClick={() => changePage(page - 1)}>Previous page</button><span>Page {page + 1}</span><button type="button" disabled={(page + 1) * 50 >= total} onClick={() => changePage(page + 1)}>Next page</button></div>
      </>}
      {selected && <section aria-label="Event details" className="border rounded p-4 mt-4">
        <h3 className="font-semibold">{selected.summary}</h3><p className="text-xs mb-2">{selected.event_type} · {selected.id}</p>
        <p className="text-xs">Actor ID: {selected.actor_id ?? "System"} · Student ID: {selected.target_user_id ?? "—"} · Exam attachment: {selected.class_exam_id ?? "—"}</p>
        <div className="grid md:grid-cols-2 gap-4 mt-3">{[["Before",selected.old_values],["After",selected.new_values]].map(([label,values]) => <div key={String(label)}><h4 className="font-semibold">{String(label)}</h4><pre className="text-xs whitespace-pre-wrap break-all">{JSON.stringify(values,null,2)}</pre></div>)}</div>
        <button type="button" onClick={() => setSelected(null)} className="underline mt-3">Close details</button>
      </section>}
    </section>
  </div>;
}
