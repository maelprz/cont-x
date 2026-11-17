-- Additive rollout: legacy clients can keep using their existing submission RPC.
alter table public.exam_sessions add column if not exists local_grading_receipt jsonb;

create or replace function public.download_local_grading_material(p_session_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  attempt public.exam_sessions%rowtype;
  item jsonb;
  qid uuid;
  source_id uuid;
  pooled boolean;
  rubric jsonb;
  materials jsonb := '{}'::jsonb;
begin
  if auth.uid() is null then raise exception 'Not authenticated.'; end if;
  select * into attempt from public.exam_sessions where id=p_session_id and student_id=auth.uid();
  if not found or attempt.status<>'in_progress' then raise exception 'Active attempt not found.'; end if;
  for item in select value from jsonb_array_elements(public.get_session_questions(p_session_id)) loop
    qid := (item->>'id')::uuid;
    pooled := item->>'pool_draw_id' is not null;
    source_id := qid;
    if pooled then
      select question_bank_id into source_id from public.session_pool_questions where id=qid and session_id=p_session_id;
    end if;
    rubric := jsonb_build_object('type',item->>'type','maxPoints',(item->>'max_points')::numeric,
      'checkAttempts',0,'pointDeduction',0);
    if item->>'type'='mcq' then
      if pooled then
        rubric := rubric || jsonb_build_object('correctOptionIds',(select coalesce(jsonb_agg(id),'[]') from public.mcq_bank_option where mcq_bank_question_id=source_id and is_correct));
      else
        rubric := rubric || jsonb_build_object('correctOptionIds',(select coalesce(jsonb_agg(id),'[]') from public.mc_options where mcq_question_id=source_id and is_correct));
      end if;
    elsif item->>'type'='fitb' then
      if pooled then
        rubric := rubric || coalesce((select jsonb_build_object('caseSensitive',case_sensitive,'ignoreExtraSpaces',ignore_extra_spaces) from public.fitb_bank_question where question_bank_id=source_id),'{}');
        rubric := rubric || jsonb_build_object('acceptedAnswers',(select coalesce(jsonb_agg(answer_text),'[]') from public.fitb_bank_answer where fitb_bank_question_id=source_id));
      else
        rubric := rubric || coalesce((select jsonb_build_object('caseSensitive',case_sensitive,'ignoreExtraSpaces',ignore_extra_spaces) from public.fitb_question where question_id=source_id),'{}');
        rubric := rubric || jsonb_build_object('acceptedAnswers',(select coalesce(jsonb_agg(answer_text),'[]') from public.fitb_answer where fitb_question_id=source_id));
      end if;
    elsif item->>'type'='coding' then
      rubric := rubric || jsonb_build_object('programType',item->'coding'->>'program_type',
        'mainCode',item->'coding'->>'main_code','penaltyPerAttempt',coalesce((item->'coding'->>'check_penalty_per_attempt')::numeric,0));
      if pooled then
        rubric := rubric || jsonb_build_object('tests',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'input',input,'expected_output',expected_output,'time_limit_ms',time_limit_ms,'is_hidden',is_hidden) order by id),'[]') from public.test_case_bank where coding_bank_question_id=source_id));
      else
        rubric := rubric || jsonb_build_object('tests',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'input',input,'expected_output',expected_output,'time_limit_ms',time_limit_ms,'is_hidden',is_hidden) order by id),'[]') from public.test_cases where coding_question_id=source_id));
      end if;
    end if;
    rubric := rubric || coalesce((select jsonb_build_object('checkAttempts',coalesce(a.check_attempts,0),'pointDeduction',coalesce(a.point_deduction,0))
      from public.student_answers a where a.session_id=p_session_id and
      ((pooled and a.pool_draw_id=qid) or (not pooled and a.question_id=qid))),'{}');
    materials := materials || jsonb_build_object(qid::text,rubric);
  end loop;
  return materials;
end $$;
revoke all on function public.download_local_grading_material(uuid) from public, anon;
grant execute on function public.download_local_grading_material(uuid) to authenticated;

-- This endpoint records client grades. It checks ownership, membership, bounds,
-- and retry consistency; it does not compare answers or execute student code.
create or replace function public.sync_local_exam_submission(p_session_id uuid, p_submission jsonb)
returns table(total_score double precision,status text)
language plpgsql security definer set search_path = '' as $$
declare
  attempt public.exam_sessions%rowtype;
  answer jsonb;
  execution jsonb;
  test_result jsonb;
  answer_id uuid;
  qid uuid;
  draw_id uuid;
  max_points double precision;
  points double precision;
  finished_at timestamptz;
  final_status text;
  answer_count integer;
  seen text[] := '{}';
  answer_key text;
  subtotal double precision := 0;
  total double precision;
  overtime_deduction double precision;
  v_overtime_seconds integer;
begin
  if auth.uid() is null then raise exception 'Not authenticated.'; end if;
  select * into attempt from public.exam_sessions where id=p_session_id and student_id=auth.uid() for update;
  if not found then raise exception 'Attempt not found.'; end if;
  if attempt.local_grading_receipt is not null then
    if attempt.local_grading_receipt<>p_submission then raise exception 'A different submission was already recorded.'; end if;
    return query select attempt.total_score,attempt.status;
    return;
  end if;
  if attempt.status<>'in_progress' then raise exception 'Attempt is no longer active.'; end if;
  if p_submission->>'version' is distinct from '1' or jsonb_typeof(p_submission->'answers') is distinct from 'array' then raise exception 'Invalid local submission.'; end if;
  final_status := p_submission->>'status';
  if final_status is null or final_status not in ('submitted','timed_out') then raise exception 'Invalid submission status.'; end if;
  finished_at := (p_submission->>'submittedAt')::timestamptz;
  if finished_at is null or finished_at<attempt.joined_at or finished_at>now()+interval '5 minutes' then raise exception 'Invalid submission time.'; end if;
  for answer in select value from jsonb_array_elements(p_submission->'answers') loop
    qid := nullif(answer->>'question_id','')::uuid;
    draw_id := nullif(answer->>'pool_draw_id','')::uuid;
    if (qid is null)=(draw_id is null) then raise exception 'Invalid question reference.'; end if;
    answer_key := coalesce(qid,draw_id)::text;
    if answer_key=any(seen) then raise exception 'Duplicate answer.'; end if;
    seen := array_append(seen,answer_key);
    max_points := null;
    if draw_id is not null then
      select d.max_points into max_points from public.session_pool_questions d where d.id=draw_id and d.session_id=p_session_id;
    else
      select q.max_points into max_points from public.questions q where q.id=qid and q.exam_id=attempt.exam_id;
    end if;
    if max_points is null then raise exception 'Question does not belong to this attempt.'; end if;
    points := (answer->>'score')::double precision;
    if points is null or not(points>=0 and points<=max_points) then raise exception 'Invalid question score.'; end if;
    subtotal := subtotal+points;
    if jsonb_typeof(answer->'answer_text') is distinct from 'string' then raise exception 'Invalid answer text.'; end if;
    if draw_id is null then
      insert into public.student_answers(session_id,question_id,answer_text,score,check_attempts,point_deduction,change_count,time_spent_seconds,answered_at)
      values(p_session_id,qid,answer->>'answer_text',points,greatest(0,(answer->>'check_attempts')::integer),greatest(0,(answer->>'point_deduction')::double precision),greatest(0,least(1000,coalesce((answer->>'change_count')::integer,0))),greatest(0,least(86400,coalesce((answer->>'time_spent_seconds')::integer,0))),coalesce((answer->>'answered_at')::timestamptz,finished_at))
      on conflict(session_id,question_id) do update set answer_text=excluded.answer_text,score=excluded.score,check_attempts=excluded.check_attempts,point_deduction=excluded.point_deduction,change_count=excluded.change_count,time_spent_seconds=excluded.time_spent_seconds,answered_at=excluded.answered_at;
    else
      insert into public.student_answers(session_id,pool_draw_id,answer_text,score,check_attempts,point_deduction,change_count,time_spent_seconds,answered_at)
      values(p_session_id,draw_id,answer->>'answer_text',points,greatest(0,(answer->>'check_attempts')::integer),greatest(0,(answer->>'point_deduction')::double precision),greatest(0,least(1000,coalesce((answer->>'change_count')::integer,0))),greatest(0,least(86400,coalesce((answer->>'time_spent_seconds')::integer,0))),coalesce((answer->>'answered_at')::timestamptz,finished_at))
      on conflict(session_id,pool_draw_id) do update set answer_text=excluded.answer_text,score=excluded.score,check_attempts=excluded.check_attempts,point_deduction=excluded.point_deduction,change_count=excluded.change_count,time_spent_seconds=excluded.time_spent_seconds,answered_at=excluded.answered_at;
    end if;
  end loop;
  select (select count(*) from public.questions where exam_id=attempt.exam_id)+(select count(*) from public.session_pool_questions where session_id=p_session_id) into answer_count;
  if cardinality(seen)<>answer_count then raise exception 'Submission must contain every question.'; end if;
  for execution in select value from jsonb_array_elements(coalesce(p_submission->'executionLogs','[]')) loop
    if not(execution->>'questionId'=any(seen)) then raise exception 'Invalid execution log question.'; end if;
    select a.id into answer_id from public.student_answers a where a.session_id=p_session_id and
      (a.question_id=(execution->>'questionId')::uuid or a.pool_draw_id=(execution->>'questionId')::uuid);
    for test_result in select value from jsonb_array_elements(execution->'outcome'->'results') loop
      insert into public.code_execution_logs(answer_id,passed,actual_output,execution_time_ms,executed_at)
      values(answer_id,(test_result->>'passed')::boolean,test_result->>'actualOutput',
        (test_result->>'executionTimeMs')::integer,(execution->>'executedAt')::timestamptz);
    end loop;
  end loop;
  total := (p_submission->>'totalScore')::double precision;
  overtime_deduction := (p_submission->>'overtimeDeduction')::double precision;
  v_overtime_seconds := (p_submission->>'overtimeSeconds')::integer;
  if total is null or overtime_deduction is null or v_overtime_seconds is null or not(overtime_deduction>=0) or v_overtime_seconds<0 or
    not(abs(total-greatest(0,subtotal-overtime_deduction))<0.000001) then raise exception 'Invalid submission total.'; end if;
  update public.exam_sessions set total_score=total,status=final_status,submitted_at=finished_at,
    overtime_seconds=v_overtime_seconds,overtime_deduction_applied=overtime_deduction,local_grading_receipt=p_submission where id=p_session_id;
  return query select total,final_status;
end $$;
revoke all on function public.sync_local_exam_submission(uuid,jsonb) from public, anon;
grant execute on function public.sync_local_exam_submission(uuid,jsonb) to authenticated;
