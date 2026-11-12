import { supabase } from "./supabaseClient";

export interface ClassLogEntry {
  id: string;
  class_id: string;
  class_exam_id: string | null;
  occurred_at: string;
  actor_name: string;
  actor_id: string | null;
  target_name: string | null;
  target_user_id: string | null;
  event_type: string;
  outcome: "success" | "denied";
  summary: string;
  old_values: Record<string, unknown>;
  new_values: Record<string, unknown>;
}
export interface ClassLogFilters { search: string; event: string; outcome: string; from: string; to: string; }
export async function getClassLogs(classId: string, filters: ClassLogFilters, offset = 0): Promise<{ rows: ClassLogEntry[]; total: number }> {
  const { data, error } = await supabase.rpc("get_admin_class_logs", {
    p_class_id: classId, p_search: filters.search.trim(), p_event_type: filters.event || null,
    p_outcome: filters.outcome || null, p_from: filters.from ? new Date(filters.from).toISOString() : null,
    p_to: filters.to ? new Date(filters.to).toISOString() : null, p_limit: 50, p_offset: offset,
  });
  if (error) throw new Error(error.message);
  return data;
}
