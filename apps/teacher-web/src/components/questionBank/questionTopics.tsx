import { useEffect, useState } from "react";
import { useAuthStore } from "../../store/useAuthStore";
import { createSubjectTopic, getSubjectTopics, getTopicsByIds, type SubjectTopic } from "../../services/questionTopicService";

export function QuestionTopics({ subjectId, selectedIds, onChange }: {
  subjectId: string | null; selectedIds: string[]; onChange: (ids: string[]) => void;
}) {
  const teacherId = useAuthStore(state => state.user?.id);
  const [subjectState, setSubjectState] = useState<{ subjectId: string | null; topics: SubjectTopic[]; error?: string }>({ subjectId: null, topics: [] });
  const [selectionState, setSelectionState] = useState<{ key: string; topics: SubjectTopic[]; error?: string }>({ key: "", topics: [] });
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const selected = [...new Set(selectedIds.filter(Boolean))];
  const selectionKey = [...selected].sort().join(",");

  useEffect(() => {
    let active = true;
    if (!subjectId) return;
    getSubjectTopics(subjectId)
      .then(topics => { if (active) setSubjectState({ subjectId, topics }); })
      .catch(err => { if (active) setSubjectState({ subjectId, topics: [], error: err instanceof Error ? err.message : "Could not load topics." }); });
    return () => { active = false; };
  }, [subjectId]);

  useEffect(() => {
    let active = true;
    if (!selectionKey) return;
    getTopicsByIds(selectionKey.split(","))
      .then(topics => { if (active) setSelectionState({ key: selectionKey, topics }); })
      .catch(err => { if (active) setSelectionState({ key: selectionKey, topics: [], error: err instanceof Error ? err.message : "Could not load selected topics." }); });
    return () => { active = false; };
  }, [selectionKey]);

  const topics = subjectState.subjectId === subjectId ? subjectState.topics : [];
  const selectedTopics = selectionState.key === selectionKey ? selectionState.topics : [];
  const knownTopics = new Map([...topics, ...selectedTopics].map(topic => [topic.id, topic]));
  const originalTopics = selected.flatMap(id => {
    const topic = knownTopics.get(id);
    return topic && topic.subject_id !== subjectId ? [topic] : [];
  }).sort((a, b) => a.name.localeCompare(b.name));
  const missingDetails = selectionState.key === selectionKey && selected.some(id => !knownTopics.has(id));
  const loadError = (subjectState.subjectId === subjectId ? subjectState.error : undefined)
    ?? (selectionState.key === selectionKey ? selectionState.error : undefined);

  async function addTopic() {
    if (!subjectId || !teacherId || !name.trim() || busy) return;
    setBusy(true); setError(null);
    try {
      const created=await createSubjectTopic(subjectId,teacherId,name);
      setSubjectState(current => ({ subjectId, topics: [...(current.subjectId === subjectId ? current.topics : []), created].sort((a,b)=>a.name.localeCompare(b.name)) }));
      onChange([...new Set([...selected, created.id])]); setName("");
    } catch(err) { setError(err instanceof Error ? err.message : "Could not add topic."); }
    finally { setBusy(false); }
  }
  return <fieldset className="mb-6 rounded-lg border border-[var(--color-base-300)] p-4">
    <legend className="px-2 font-semibold text-sm">Question topics — choose at least one</legend>
    <p className="text-xs opacity-70 mb-3">Select additional topics when this question covers several areas.</p>
    <div className="flex flex-wrap gap-3">
      {topics.map(topic=><label key={topic.id} className="flex items-center gap-2 text-sm">
        <input type="checkbox" disabled={busy} checked={selected.includes(topic.id)} onChange={()=>onChange(selected.includes(topic.id)?selected.filter(id=>id!==topic.id):[...selected,topic.id])}/>{topic.name}
      </label>)}
    </div>
    {originalTopics.length > 0 && <div className="mt-3">
      <p className="mb-2 text-xs font-medium">Original topics from the reused question</p>
      <div className="flex flex-wrap gap-2">
        {originalTopics.map(topic => <span key={topic.id} className="rounded-full border border-[var(--color-base-300)] px-2 py-1 text-xs">{topic.name}</span>)}
      </div>
      <p className="mt-2 text-xs opacity-70">These stay with the question. You can add topics from this subject above.</p>
    </div>}
    {missingDetails && <p role="alert" className="mt-2 text-sm text-[var(--color-error)]">Some selected topic details are unavailable. Existing selections have been kept.</p>}
    {selected.length===0 && <p className="text-sm mt-2 text-[var(--color-error)]">A subject topic is required before saving.</p>}
    <div className="flex gap-2 mt-3">
      <input aria-label="New subject topic" disabled={busy} value={name} onChange={event=>setName(event.target.value)} placeholder="New topic name" className="border rounded px-3 py-2 text-sm bg-[var(--color-base-100)]"/>
      <button type="button" onClick={addTopic} disabled={busy || !name.trim()} className="border rounded px-3 py-2 text-sm disabled:opacity-50">{busy?"Adding...":"Add topic"}</button>
    </div>
    {(error || loadError) && <p role="alert" className="text-sm mt-2 text-[var(--color-error)]">{error || loadError}</p>}
  </fieldset>;
}

