import { useEffect, useState } from "react";
import { useAuthStore } from "../../store/useAuthStore";
import { createSubjectTopic, getSubjectTopics, type SubjectTopic } from "../../services/questionTopicService";

export function QuestionTopics({ subjectId, selectedIds, onChange }: {
  subjectId: string | null; selectedIds: string[]; onChange: (ids: string[]) => void;
}) {
  const teacherId = useAuthStore(state => state.user?.id);
  const [topics, setTopics] = useState<SubjectTopic[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active=true;
    if (!subjectId) return;
    getSubjectTopics(subjectId).then(rows => { if(active) { setTopics(rows); setError(null); } })
      .catch(err => { if(active) setError(err instanceof Error ? err.message : "Could not load topics."); });
    return () => { active=false; };
  },[subjectId]);
  const validIds=selectedIds.filter(id=>topics.some(topic=>topic.id===id));
  async function addTopic() {
    if (!subjectId || !teacherId || !name.trim() || busy) return;
    setBusy(true); setError(null);
    try {
      const created=await createSubjectTopic(subjectId,teacherId,name);
      setTopics(rows=>[...rows,created].sort((a,b)=>a.name.localeCompare(b.name)));
      onChange([...validIds,created.id]); setName("");
    } catch(err) { setError(err instanceof Error ? err.message : "Could not add topic."); }
    finally { setBusy(false); }
  }
  return <fieldset className="mb-6 rounded-lg border border-[var(--color-base-300)] p-4">
    <legend className="px-2 font-semibold text-sm">Subject topics — choose at least one</legend>
    <p className="text-xs opacity-70 mb-3">Select additional topics when this question covers several areas.</p>
    <div className="flex flex-wrap gap-3">
      {topics.map(topic=><label key={topic.id} className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={validIds.includes(topic.id)} onChange={()=>onChange(validIds.includes(topic.id)?validIds.filter(id=>id!==topic.id):[...validIds,topic.id])}/>{topic.name}
      </label>)}
    </div>
    {validIds.length===0 && <p className="text-sm mt-2 text-[var(--color-error)]">A subject topic is required before saving.</p>}
    <div className="flex gap-2 mt-3">
      <input aria-label="New subject topic" value={name} onChange={event=>setName(event.target.value)} placeholder="New topic name" className="border rounded px-3 py-2 text-sm bg-[var(--color-base-100)]"/>
      <button type="button" onClick={addTopic} disabled={busy || !name.trim()} className="border rounded px-3 py-2 text-sm disabled:opacity-50">{busy?"Adding...":"Add topic"}</button>
    </div>
    {error && <p role="alert" className="text-sm mt-2 text-[var(--color-error)]">{error}</p>}
  </fieldset>;
}

