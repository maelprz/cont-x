import { supabase } from "./supabaseClient";
import type {
  BuilderQuestion,
  BuilderPool,
  MCQBuilderQuestion,
  CodingBuilderQuestion,
  CodingProgramType,
  MCQOption,
  TestCase,
} from "../screens/examBuilder/examBuilderScreen.types";

function generateExamCode(): string {
  return `EX-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

// one row of mc_options exactly as stored in the database
type MCOptionRow = {
  id: string;
  option_text: string;
  is_correct: boolean;
};

// one row of test_cases exactly as stored in the database
type TestCaseRow = {
  id: string;
  input: string;
  expected_output: string;
  is_hidden: boolean;
};

// one question row, with its type-specific child table embedded
type QuestionRow = {
  id: string;
  title: string;
  type: "mcq" | "fitb" | "coding";
  prompt: string;
  order_index: number;
  max_points: number;
  mcq_question: { mc_options: MCOptionRow[] } | null;
  coding_question: {
    starter_code: string | null;
    program_type: CodingProgramType;
    main_code: string | null;
    check_penalty_per_attempt: number;
    reference_solution: string | null;
    test_cases: TestCaseRow[];
  } | null;
};

// one random pool with its candidate bank questions, exactly as fetched
type PoolRow = {
  id: string;
  title: string | null;
  pick_count: number;
  order_index: number;
  points_per_question: number | null;
  exam_question_pool_items: {
    id: string;
    question_bank_id: string;
    // null if the bank question isn't visible to this teacher any more
    question_bank: { id: string; title: string; type: "mcq" | "coding"; max_points: number } | null;
  }[];
};

// the exam row plus all of its questions, exactly as fetched.
type ExamBuilderRow = {
  id: string;
  subject_id: string;
  title: string;
  exam_code: string | null;
  status: "draft" | "saved";
  description: string | null;
  questions: QuestionRow[];
  exam_question_pools: PoolRow[];
};

// shape of the initial settings collected when creating a new exam.
export interface NewExamSettings {
  title: string;
  description: string;
  subjectId: string; // every exam must live under a subject
}

// creates a new draft exam with all its initial settings already set, returns its new id
export async function createDraftExam(
  teacherId: string,
  settings: NewExamSettings,
): Promise<string> {
  const { data, error } = await supabase
    .from("exams")
    .insert({
      teacher_id: teacherId,
      subject_id: settings.subjectId,
      title: settings.title,
      description: settings.description,
      status: "draft",
      exam_code: generateExamCode(),
    })
    .select("id")
    .single();

  if (error || !data) throw error ?? new Error("Could not create exam.");

  return data.id;
}

// the shape the builder screen actually needs to render
export interface ExamBuilderData {
  id: string;
  subjectId: string; // the subject this exam lives under — decides which question bank the builder uses
  title: string;
  examCode: string | null;
  status: "draft" | "saved";
  description: string; // empty string when not set, never null in the UI
  questions: BuilderQuestion[];
  pools: BuilderPool[]; // random "pick N of M" groups, in display order
}

// turns one mcq question row into the shape the MCQ editor expects
function mapMcqRow(row: QuestionRow): MCQBuilderQuestion | null {
  if (!row.mcq_question) return null; // missing child row, skip this question

  return {
    id: row.id,
    number: row.order_index + 1, // order_index is 0-based, UI numbering is 1-based
    title: row.title,
    type: "multiple-choice",
    points: row.max_points,
    description: row.prompt,
    options: row.mcq_question.mc_options.map((o) => ({
      id: o.id,
      text: o.option_text,
      isCorrect: o.is_correct,
    })),
  };
}

// turns one coding question row into the shape the coding editor expects
function mapCodingRow(row: QuestionRow): CodingBuilderQuestion | null {
  if (!row.coding_question) return null; // missing child row, skip this question

  return {
    id: row.id,
    number: row.order_index + 1,
    title: row.title,
    type: "coding",
    points: row.max_points,
    description: row.prompt,
    starterCode: row.coding_question.starter_code ?? "",
    testCases: row.coding_question.test_cases.map((t) => ({
      id: t.id,
      input: t.input,
      expectedOutput: t.expected_output,
      isHidden: t.is_hidden,
    })),
    programType: row.coding_question.program_type,
    mainCode: row.coding_question.main_code ?? "",
    deductionPerAttempt: row.coding_question.check_penalty_per_attempt,
    referenceSolution: row.coding_question.reference_solution ?? ""
  };
}

// converts one raw question row into the union type the builder screen uses
function mapQuestionRow(row: QuestionRow): BuilderQuestion | null {
  if (row.type === "mcq") return mapMcqRow(row);
  if (row.type === "coding") return mapCodingRow(row);
  return null; // "fitb" has no builder UI yet, skip until that's built
}

// fetches one exam and all of its questions, ready for the builder screen
export async function getExamById(examId: string): Promise<ExamBuilderData> {
  const { data, error } = await supabase
    .from("exams")
    .select(
      `
      id,
      subject_id,
      title,
      exam_code,
      status,
      description,
      questions (
        id,
        title,
        type,
        prompt,
        order_index,
        max_points,
        mcq_question (
          mc_options ( id, option_text, is_correct )
        ),
        coding_question (
          starter_code,
          program_type,
          main_code,
          check_penalty_per_attempt,
          reference_solution,
          test_cases ( id, input, expected_output, is_hidden )
        )
      ),
      exam_question_pools (
        id,
        title,
        pick_count,
        order_index,
        points_per_question,
        exam_question_pool_items (
          id,
          question_bank_id,
          question_bank ( id, title, type, max_points )
        )
      )
    `,
    )
    .eq("id", examId)
    .order("order_index", { referencedTable: "questions" }) // keep questions in builder order
    .order("order_index", { referencedTable: "exam_question_pools" })
    .single();

  if (error) throw error; // let the hook decide how to show this error

  const row = data as unknown as ExamBuilderRow;

  return {
    id: row.id,
    subjectId: row.subject_id,
    title: row.title,
    examCode: row.exam_code,
    status: row.status,
    description: row.description ?? "",
    questions: row.questions
      .map(mapQuestionRow)
      .filter((q): q is BuilderQuestion => q !== null), // drop unsupported/bad rows
    pools: row.exam_question_pools.map(mapPoolRow),
  };
}

function mapPoolRow(row: PoolRow): BuilderPool {
  return {
    id: row.id,
    title: row.title ?? "",
    pickCount: row.pick_count,
    pointsPerQuestion: row.points_per_question,
    items: row.exam_question_pool_items.map((item) => ({
      bankQuestionId: item.question_bank_id,
      // keep the item even if its bank row can't be read — dropping it here
      // would make the next save delete it from the pool
      title: item.question_bank?.title ?? "Unavailable question",
      type: item.question_bank?.type === "coding" ? "coding" : "multiple-choice",
      points: item.question_bank?.max_points ?? 0,
    })),
  };
}

// Saves the exam's random pools: removes pools (and items) the teacher deleted,
// upserts the rest, and syncs each pool's candidate questions. Pools sit after
// every question in the exam order (order_index continues where questions end).
export async function savePools(
  examId: string,
  pools: BuilderPool[],
  questionCount: number,
): Promise<void> {
  pools.forEach((pool) => {
    const name = pool.title.trim() || "Untitled pool";
    if (pool.items.length === 0) {
      throw new Error(`"${name}" has no questions. Add some, or delete the pool.`);
    }
    if (pool.pickCount < 1 || pool.pickCount > pool.items.length) {
      throw new Error(`"${name}" picks ${pool.pickCount} but only has ${pool.items.length} questions.`);
    }
  });

  const { data: existingPools, error: poolsError } = await supabase
    .from("exam_question_pools")
    .select("id")
    .eq("exam_id", examId);
  if (poolsError) throw poolsError;

  const keepIds = new Set(pools.map((p) => p.id));
  const removedIds = (existingPools ?? []).map((p) => p.id).filter((id) => !keepIds.has(id));

  if (removedIds.length > 0) {
    // items first, in case the foreign key doesn't cascade
    const { error: itemsDeleteError } = await supabase
      .from("exam_question_pool_items")
      .delete()
      .in("pool_id", removedIds);
    if (itemsDeleteError) throw itemsDeleteError;

    const { error: poolsDeleteError } = await supabase
      .from("exam_question_pools")
      .delete()
      .in("id", removedIds);
    if (poolsDeleteError) throw poolsDeleteError;
  }

  if (pools.length === 0) return;

  const { error: upsertError } = await supabase.from("exam_question_pools").upsert(
    pools.map((pool, index) => ({
      id: pool.id,
      exam_id: examId,
      title: pool.title.trim() || null,
      pick_count: pool.pickCount,
      order_index: questionCount + index,
      points_per_question: pool.pointsPerQuestion,
    })),
  );
  if (upsertError) throw upsertError;

  const { data: existingItems, error: itemsError } = await supabase
    .from("exam_question_pool_items")
    .select("id, pool_id, question_bank_id")
    .in("pool_id", pools.map((p) => p.id));
  if (itemsError) throw itemsError;

  const idsToDelete: string[] = [];
  const rowsToInsert: { pool_id: string; question_bank_id: string }[] = [];

  pools.forEach((pool) => {
    const wanted = new Set(pool.items.map((i) => i.bankQuestionId));
    const have = new Set<string>();
    (existingItems ?? [])
      .filter((row) => row.pool_id === pool.id)
      .forEach((row) => {
        if (wanted.has(row.question_bank_id)) have.add(row.question_bank_id);
        else idsToDelete.push(row.id);
      });
    pool.items
      .filter((item) => !have.has(item.bankQuestionId))
      .forEach((item) => rowsToInsert.push({ pool_id: pool.id, question_bank_id: item.bankQuestionId }));
  });

  if (idsToDelete.length > 0) {
    const { error } = await supabase.from("exam_question_pool_items").delete().in("id", idsToDelete);
    if (error) throw error;
  }
  if (rowsToInsert.length > 0) {
    const { error } = await supabase.from("exam_question_pool_items").insert(rowsToInsert);
    if (error) throw error;
  }
}

// deletes mc_options no longer in the current list, then upserts the rest
async function syncMcOptions(
  questionId: string,
  options: MCQOption[],
): Promise<void> {
  const { data: existingRows, error: fetchError } = await supabase
    .from("mc_options")
    .select("id") // only need ids to compare against
    .eq("mcq_question_id", questionId);
  if (fetchError) throw fetchError;

  const existingIds = new Set((existingRows ?? []).map((r) => r.id));
  const currentIds = new Set(options.map((o) => o.id));
  const idsToDelete = [...existingIds].filter((id) => !currentIds.has(id)); // removed by teacher

  if (idsToDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from("mc_options")
      .delete()
      .in("id", idsToDelete);
    if (deleteError) throw deleteError;
  }

  if (options.length > 0) {
    const { error: upsertError } = await supabase.from("mc_options").upsert(
      options.map((o) => ({
        id: o.id, // real uuid, insert or update depending on if it exists
        mcq_question_id: questionId,
        option_text: o.text,
        is_correct: o.isCorrect,
      })),
    );
    if (upsertError) throw upsertError;
  }
}

// deletes test_cases no longer in the current list, then upserts the rest
async function syncTestCases(
  questionId: string,
  testCases: TestCase[],
): Promise<void> {
  const { data: existingRows, error: fetchError } = await supabase
    .from("test_cases")
    .select("id") // only need ids to compare against
    .eq("coding_question_id", questionId);
  if (fetchError) throw fetchError;

  const existingIds = new Set((existingRows ?? []).map((r) => r.id));
  const currentIds = new Set(testCases.map((t) => t.id));
  const idsToDelete = [...existingIds].filter((id) => !currentIds.has(id)); // removed by teacher

  if (idsToDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from("test_cases")
      .delete()
      .in("id", idsToDelete);
    if (deleteError) throw deleteError;
  }

  if (testCases.length > 0) {
    const { error: upsertError } = await supabase.from("test_cases").upsert(
      testCases.map((t) => ({
        id: t.id, // real uuid, insert or update depending on if it exists
        coding_question_id: questionId,
        input: t.input,
        expected_output: t.expectedOutput,
        is_hidden: t.isHidden,
      })),
    );
    if (upsertError) throw upsertError;
  }
}

// saves one question (and its type-specific child rows) to the database
export async function saveQuestion(
  examId: string,
  question: BuilderQuestion,
): Promise<void> {
  const dbType = question.type === "multiple-choice" ? "mcq" : "coding"; // matches db's check constraint

  // if the points changed on a question students may already have answered, the database
  // rescales every stored score (and total) by the same ratio and logs the change
  const { data: existing, error: existingError } = await supabase
    .from("questions")
    .select("max_points")
    .eq("id", question.id)
    .maybeSingle();
  if (existingError) throw existingError;

  if (existing && existing.max_points !== question.points) {
    const { count, error: countError } = await supabase
      .from("exam_sessions")
      .select("id", { count: "exact", head: true })
      .eq("exam_id", examId);
    if (countError) throw countError;

    if ((count ?? 0) > 0) {
      const { error: rescaleError } = await supabase.rpc("rescale_question_points", {
        p_question_id: question.id,
        p_new_max: question.points,
      });
      if (rescaleError) throw rescaleError;
    }
  }

  const { error: questionError } = await supabase.from("questions").upsert({
    id: question.id, // real uuid, insert or update depending on if it exists
    exam_id: examId,
    title: question.title,
    type: dbType,
    prompt: question.description,
    order_index: question.number - 1, // ui numbering is 1-based, db is 0-based
    max_points: question.points,
  });
  if (questionError) throw questionError;

  if (question.type === "multiple-choice") {
    const { error: mcqError } = await supabase
      .from("mcq_question")
      .upsert({ question_id: question.id });
    if (mcqError) throw mcqError;

    await syncMcOptions(question.id, question.options);
  } else {
    const { error: codingError } = await supabase
      .from("coding_question")
      .upsert({
        question_id: question.id,
        starter_code: question.starterCode,
        program_type: question.programType,
        main_code: question.mainCode,
        check_penalty_per_attempt: question.deductionPerAttempt,
        reference_solution: question.referenceSolution,
      });
    if (codingError) throw codingError;

    await syncTestCases(question.id, question.testCases);
  }
}

// permanently deletes a question from supabase and will remove all child rows too
export async function deleteQuestion(questionId: string): Promise<void> {
  const { error } = await supabase
    .from("questions")
    .delete()
    .eq("id", questionId);
  if (error) throw error;
}

export async function updateExamStatus(
  examId: string,
  status: "draft" | "saved",
): Promise<void> {
  if (status === "draft") {
    const { count, error: countError } = await supabase
      .from("class_exams")
      .select("id", { count: "exact", head: true })
      .eq("exam_id", examId);
    if (countError) throw countError;
    if ((count ?? 0) > 0) {
      throw new Error("This exam is in a class, so it can't go back to draft.");
    }
  }

  const { error } = await supabase
    .from("exams")
    .update({ status })
    .eq("id", examId);

  if (error) throw error;
}

// Updates just the exam-level fields without touching any questions or child rows.
export async function updateExamDetails(
  examId: string,
  details: { title: string; description: string },
): Promise<void> {
  const { error } = await supabase
    .from("exams")
    .update({ title: details.title, description: details.description })
    .eq("id", examId);
  if (error) throw error;
}