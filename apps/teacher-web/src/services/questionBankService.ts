import { supabase } from "./supabaseClient";
import { requireFitbAnswer } from "../lib/fitbAnswers";
import { requireTopicIds } from "./questionTopicService";
import type { SubjectTopic } from "./questionTopicService";
import type {
  BuilderQuestion,
  CodingProgramType,
  FITBAnswer,
  MCQOption,
  TestCase,
} from "../screens/examBuilder/examBuilderScreen.types"; // reusing the same shapes exam builder uses

// one row of mcq_bank_option exactly as stored in the database
type MCQBankOptionRow = {
  id: string;
  option_text: string;
  is_correct: boolean;
};

// one row of fitb_bank_answer exactly as stored in the database
type FitbBankAnswerRow = {
  id: string;
  answer_text: string;
};

// one row of test_case_bank exactly as stored in the database
type TestCaseBankRow = {
  id: string;
  input: string;
  expected_output: string;
  is_hidden: boolean;
};

type TopicSummary = Pick<SubjectTopic, "id" | "name">;

// One full question_bank row, with its child table and subject topics embedded.
type QuestionBankRow = {
  id: string;
  teacher_id: string; // owner — differs from the viewer for questions shared by a colleague
  subject_id: string;
  title: string;
  type: "mcq" | "coding" | "fitb";
  prompt: string;
  max_points: number;
  created_at: string;
  mcq_bank_question: { mcq_bank_option: MCQBankOptionRow[] } | null;
  fitb_bank_question: {
    case_sensitive: boolean;
    ignore_extra_spaces: boolean;
    fitb_bank_answer: FitbBankAnswerRow[];
  } | null;
  coding_bank_question: {
    starter_code: string | null;
    program_type: CodingProgramType;
    main_code: string | null;
    check_penalty_per_attempt: number;
    reference_solution: string | null; // teacher's own solution, validation-only
    test_case_bank: TestCaseBankRow[];
  } | null;
  bank_question_topics: { topic_id: string; subject_topics: TopicSummary | null }[];
};

// the lightweight shape the table row needs, not the full editable question
export interface BankQuestionSummary {
  id: string;
  subjectId: string;
  isOwn: boolean; // false = shared with this teacher by someone else (read-only here)
  title: string;
  type: "multiple-choice" | "coding" | "fill-in-the-blank";
  points: number;
  createdAt: string; // display string, e.g. "Oct 12, 2023"
  topics: TopicSummary[];
}

// turns one full bank row into the same union type the editor panels expect
// "number" is unused here — bank questions have no order, unlike exam questions
function mapBankRowToBuilderQuestion(row: QuestionBankRow): BuilderQuestion | null {
  if (row.type === "mcq" && row.mcq_bank_question) {
    return {
      id: row.id,
      number: 0, // always unused for bank questions
      title: row.title,
      type: "multiple-choice",
      points: row.max_points,
      description: row.prompt,
      options: row.mcq_bank_question.mcq_bank_option.map((o) => ({
        id: o.id,
        text: o.option_text,
        isCorrect: o.is_correct,
      })),
    };
  }

  if (row.type === "fitb" && row.fitb_bank_question) {
    return {
      id: row.id,
      number: 0,
      title: row.title,
      type: "fill-in-the-blank",
      points: row.max_points,
      description: row.prompt,
      acceptedAnswers: row.fitb_bank_question.fitb_bank_answer.map((a) => ({
        id: a.id,
        text: a.answer_text,
      })),
      caseSensitive: row.fitb_bank_question.case_sensitive,
      ignoreExtraSpaces: row.fitb_bank_question.ignore_extra_spaces,
    };
  }

  if (row.type === "coding" && row.coding_bank_question) {
    return {
      id: row.id,
      number: 0,
      title: row.title,
      type: "coding",
      points: row.max_points,
      description: row.prompt,
      starterCode: row.coding_bank_question.starter_code ?? "",
      testCases: row.coding_bank_question.test_case_bank.map((t) => ({
        id: t.id,
        input: t.input,
        expectedOutput: t.expected_output,
        isHidden: t.is_hidden,
      })),
      programType: row.coding_bank_question.program_type,
      mainCode: row.coding_bank_question.main_code ?? "",
      deductionPerAttempt: row.coding_bank_question.check_penalty_per_attempt,
      referenceSolution: row.coding_bank_question.reference_solution ?? "", // load saved reference solution
    };
  }

  return null; // missing child row, skip this question
}

// turns a raw bank row into the summary shape the table needs
function getBankTopics(row: QuestionBankRow): TopicSummary[] {
  const links = row.bank_question_topics ?? [];
  if (links.some((link) => !link.subject_topics)) {
    throw new Error("Topic details could not be loaded. Refresh the question bank and try again.");
  }
  return links.map((link) => link.subject_topics!);
}

function mapBankRowToSummary(row: QuestionBankRow, viewerId: string): BankQuestionSummary {
  return {
    id: row.id,
    subjectId: row.subject_id,
    isOwn: row.teacher_id === viewerId,
    title: row.title,
    type:
      row.type === "mcq"
        ? "multiple-choice"
        : row.type === "fitb"
          ? "fill-in-the-blank"
          : "coding",
    points: row.max_points,
    createdAt: new Date(row.created_at).toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    }),
    topics: getBankTopics(row),
  };
}

// shared select string, reused by both the list and single-question fetch
const BANK_SELECT = `
  id,
  teacher_id,
  subject_id,
  title,
  type,
  prompt,
  max_points,
  created_at,
  mcq_bank_question (
    mcq_bank_option ( id, option_text, is_correct )
  ),
  fitb_bank_question (
    case_sensitive,
    ignore_extra_spaces,
    fitb_bank_answer ( id, answer_text )
  ),
  coding_bank_question (
    starter_code,
    program_type,
    main_code,
    check_penalty_per_attempt,
    reference_solution,
    test_case_bank ( id, input, expected_output, is_hidden )
  ),
  bank_question_topics (topic_id, subject_topics(id, name))
`;

// fetches all bank questions a teacher can see for one subject, newest first
export async function getQuestionBank(
  teacherId: string,
  subjectId: string,
  includeShared = false,
): Promise<BankQuestionSummary[]> {
  let query = supabase.from("question_bank").select(BANK_SELECT);
  if (!includeShared) query = query.eq("subject_id", subjectId);

  const { data, error } = await query.order("created_at", { ascending: false }); // newest first

  if (error) throw error; // let the hook decide how to show this error

  return (data as unknown as QuestionBankRow[]).map((row) => mapBankRowToSummary(row, teacherId));
}

// question counts per subject for the sub-bank tiles: everything the teacher
// can see (own + shared) and how many of those are their own
export async function getBankCountsBySubject(
  teacherId: string,
): Promise<Record<string, { total: number; own: number }>> {
  const { data, error } = await supabase.from("question_bank").select("subject_id, teacher_id");
  if (error) throw error;

  const counts: Record<string, { total: number; own: number }> = {};
  (data ?? []).forEach((row) => {
    const entry = (counts[row.subject_id] ??= { total: 0, own: 0 });
    entry.total += 1;
    if (row.teacher_id === teacherId) entry.own += 1;
  });
  return counts;
}

// fetches one bank question fully, ready to hand to an editor panel
export async function getBankQuestionById(id: string): Promise<BuilderQuestion> {
  const { data, error } = await supabase
    .from("question_bank")
    .select(BANK_SELECT)
    .eq("id", id)
    .single();

  if (error) throw error;

  const row = data as unknown as QuestionBankRow;
  const question = mapBankRowToBuilderQuestion(row);
  if (!question) throw new Error("This question is missing required data.");

  return { ...question, topicIds: getBankTopics(row).map((topic) => topic.id) };
}

// deletes options no longer in the current list, then upserts the rest
async function syncMcqBankOptions(bankQuestionId: string, options: MCQOption[]): Promise<void> {
  const { data: existingRows, error: fetchError } = await supabase
    .from("mcq_bank_option")
    .select("id")
    .eq("mcq_bank_question_id", bankQuestionId);
  if (fetchError) throw fetchError;

  const existingIds = new Set((existingRows ?? []).map((r) => r.id));
  const currentIds = new Set(options.map((o) => o.id));
  const idsToDelete = [...existingIds].filter((id) => !currentIds.has(id)); // removed by teacher

  if (idsToDelete.length > 0) {
    const { error: deleteError } = await supabase.from("mcq_bank_option").delete().in("id", idsToDelete);
    if (deleteError) throw deleteError;
  }

  if (options.length > 0) {
    const { error: upsertError } = await supabase.from("mcq_bank_option").upsert(
      options.map((o) => ({
        id: o.id, // real uuid, insert or update depending on if it exists
        mcq_bank_question_id: bankQuestionId,
        option_text: o.text,
        is_correct: o.isCorrect,
      })),
    );
    if (upsertError) throw upsertError;
  }
}

// deletes accepted answers no longer in the current list, then upserts the rest
async function syncFitbBankAnswers(bankQuestionId: string, answers: FITBAnswer[]): Promise<void> {
  const { data: existingRows, error: fetchError } = await supabase
    .from("fitb_bank_answer")
    .select("id")
    .eq("fitb_bank_question_id", bankQuestionId);
  if (fetchError) throw fetchError;

  const existingIds = new Set((existingRows ?? []).map((r) => r.id));
  const currentIds = new Set(answers.map((a) => a.id));
  const idsToDelete = [...existingIds].filter((id) => !currentIds.has(id));

  if (idsToDelete.length > 0) {
    const { error: deleteError } = await supabase.from("fitb_bank_answer").delete().in("id", idsToDelete);
    if (deleteError) throw deleteError;
  }

  const { error: upsertError } = await supabase.from("fitb_bank_answer").upsert(
    answers.map((a) => ({
      id: a.id,
      fitb_bank_question_id: bankQuestionId,
      answer_text: a.text,
    })),
  );
  if (upsertError) throw upsertError;
}

// deletes test cases no longer in the current list, then upserts the rest
async function syncTestCaseBank(bankQuestionId: string, testCases: TestCase[]): Promise<void> {
  const { data: existingRows, error: fetchError } = await supabase
    .from("test_case_bank")
    .select("id")
    .eq("coding_bank_question_id", bankQuestionId);
  if (fetchError) throw fetchError;

  const existingIds = new Set((existingRows ?? []).map((r) => r.id));
  const currentIds = new Set(testCases.map((t) => t.id));
  const idsToDelete = [...existingIds].filter((id) => !currentIds.has(id));

  if (idsToDelete.length > 0) {
    const { error: deleteError } = await supabase.from("test_case_bank").delete().in("id", idsToDelete);
    if (deleteError) throw deleteError;
  }

  if (testCases.length > 0) {
    const { error: upsertError } = await supabase.from("test_case_bank").upsert(
      testCases.map((t) => ({
        id: t.id,
        coding_bank_question_id: bankQuestionId,
        input: t.input,
        expected_output: t.expectedOutput,
        is_hidden: t.isHidden,
      })),
    );
    if (upsertError) throw upsertError;
  }
}

// saves one bank question (and its type-specific child rows) to the database
export async function saveBankQuestion(
  _teacherId: string, // ownership comes from the authenticated RPC, never this argument
  subjectId: string, // every bank question lives under a subject now (NOT NULL in the db)
  question: BuilderQuestion,
): Promise<void> {
  const topicIds = requireTopicIds(question.topicIds);
  // checked before anything is written, so a question with no usable answer never reaches the database
  const fitbAnswers =
    question.type === "fill-in-the-blank" ? requireFitbAnswer(question.acceptedAnswers) : [];

  const dbType =
    question.type === "multiple-choice"
      ? "mcq"
      : question.type === "fill-in-the-blank"
        ? "fitb"
        : "coding"; // matches db's check constraint

  const { error: questionError } = await supabase.rpc("save_question_base_with_topics", {
    p_subject_id: subjectId,
    p_topic_ids: topicIds,
    p_question: {
    id: question.id, // real uuid, insert or update depending on if it exists
    title: question.title,
    type: dbType,
    prompt: question.description,
    max_points: question.points,
    },
  });
  if (questionError) throw questionError;

  if (question.type === "multiple-choice") {
    const { error: mcqError } = await supabase
      .from("mcq_bank_question")
      .upsert({ question_bank_id: question.id });
    if (mcqError) throw mcqError;

    await syncMcqBankOptions(question.id, question.options);
  } else if (question.type === "fill-in-the-blank") {
    const { error: fitbError } = await supabase.from("fitb_bank_question").upsert({
      question_bank_id: question.id,
      case_sensitive: question.caseSensitive,
      ignore_extra_spaces: question.ignoreExtraSpaces,
    });
    if (fitbError) throw fitbError;

    await syncFitbBankAnswers(question.id, fitbAnswers);
  } else {
    const { error: codingError } = await supabase.from("coding_bank_question").upsert({
      question_bank_id: question.id,
      starter_code: question.starterCode,
      program_type: question.programType,
      main_code: question.mainCode,
      check_penalty_per_attempt: question.deductionPerAttempt,
      reference_solution: question.referenceSolution,
    });
    if (codingError) throw codingError;

    await syncTestCaseBank(question.id, question.testCases);
  }
}

// permanently deletes a bank question — cascades remove its own child rows
export async function deleteBankQuestion(id: string): Promise<void> {
  const { error } = await supabase.from("question_bank").delete().eq("id", id);
  if (error) {
    // 23503 = foreign key violation: an exam's random pool, or a student's drawn question, still points at it
    if (error.code === "23503") {
      throw new Error(
        "This question is in use (in an exam's random pool, or already drawn by students), so it can't be deleted.",
      );
    }
    throw error;
  }
}
