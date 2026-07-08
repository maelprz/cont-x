import { supabase } from "./supabaseClient";
import type {
  BuilderQuestion,
  CodingProgramType,
  MCQOption,
  TestCase,
} from "../screens/examBuilder/examBuilderScreen.types"; // reusing the same shapes exam builder uses

// one row of mcq_bank_option exactly as stored in the database
type MCQBankOptionRow = {
  id: string;
  option_text: string;
  is_correct: boolean;
};

// one row of test_case_bank exactly as stored in the database
type TestCaseBankRow = {
  id: string;
  input: string;
  expected_output: string;
  is_hidden: boolean;
};

// one tag row exactly as stored in the database
export interface BankTag {
  id: string;
  name: string;
}

// one full question_bank row, with its child table and tags embedded
type QuestionBankRow = {
  id: string;
  title: string;
  type: "mcq" | "coding";
  prompt: string;
  max_points: number;
  created_at: string;
  mcq_bank_question: { mcq_bank_option: MCQBankOptionRow[] } | null;
  coding_bank_question: {
    starter_code: string | null;
    program_type: CodingProgramType;
    main_code: string | null;
    check_penalty_per_attempt: number;
    test_case_bank: TestCaseBankRow[];
  } | null;
  question_bank_tag_links: { question_bank_tags: BankTag }[];
};

// the lightweight shape the table row needs, not the full editable question
export interface BankQuestionSummary {
  id: string;
  title: string;
  type: "multiple-choice" | "coding";
  points: number;
  createdAt: string; // display string, e.g. "Oct 12, 2023"
  tags: BankTag[];
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
    };
  }

  return null; // missing child row, skip this question
}

// turns a raw bank row into the summary shape the table needs
function mapBankRowToSummary(row: QuestionBankRow): BankQuestionSummary {
  return {
    id: row.id,
    title: row.title,
    type: row.type === "mcq" ? "multiple-choice" : "coding",
    points: row.max_points,
    createdAt: new Date(row.created_at).toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    }),
    tags: row.question_bank_tag_links.map((link) => link.question_bank_tags),
  };
}

// shared select string, reused by both the list and single-question fetch
const BANK_SELECT = `
  id,
  title,
  type,
  prompt,
  max_points,
  created_at,
  mcq_bank_question (
    mcq_bank_option ( id, option_text, is_correct )
  ),
  coding_bank_question (
    starter_code,
    program_type,
    main_code,
    check_penalty_per_attempt,
    test_case_bank ( id, input, expected_output, is_hidden )
  ),
  question_bank_tag_links (
    question_bank_tags ( id, name )
  )
`;

// fetches every bank question belonging to one teacher, tags included
export async function getQuestionBank(teacherId: string): Promise<BankQuestionSummary[]> {
  const { data, error } = await supabase
    .from("question_bank")
    .select(BANK_SELECT)
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: false }); // newest bank questions first

  if (error) throw error; // let the hook decide how to show this error

  return (data as unknown as QuestionBankRow[]).map(mapBankRowToSummary);
}

// fetches one bank question fully, ready to hand to an editor panel
export async function getBankQuestionById(id: string): Promise<BuilderQuestion> {
  const { data, error } = await supabase
    .from("question_bank")
    .select(BANK_SELECT)
    .eq("id", id)
    .single();

  if (error) throw error;

  const question = mapBankRowToBuilderQuestion(data as unknown as QuestionBankRow);
  if (!question) throw new Error("This question is missing required data.");

  return question;
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
export async function saveBankQuestion(teacherId: string, question: BuilderQuestion): Promise<void> {
  const dbType = question.type === "multiple-choice" ? "mcq" : "coding"; // matches db's check constraint

  const { error: questionError } = await supabase.from("question_bank").upsert({
    id: question.id, // real uuid, insert or update depending on if it exists
    teacher_id: teacherId,
    title: question.title,
    type: dbType,
    prompt: question.description,
    max_points: question.points,
  });
  if (questionError) throw questionError;

  if (question.type === "multiple-choice") {
    const { error: mcqError } = await supabase
      .from("mcq_bank_question")
      .upsert({ question_bank_id: question.id });
    if (mcqError) throw mcqError;

    await syncMcqBankOptions(question.id, question.options);
  } else {
    const { error: codingError } = await supabase.from("coding_bank_question").upsert({
      question_bank_id: question.id,
      starter_code: question.starterCode,
      program_type: question.programType,
      main_code: question.mainCode,
      check_penalty_per_attempt: question.deductionPerAttempt,
    });
    if (codingError) throw codingError;

    await syncTestCaseBank(question.id, question.testCases);
  }
}

// permanently deletes a bank question — cascades remove its own child rows
export async function deleteBankQuestion(id: string): Promise<void> {
  const { error } = await supabase.from("question_bank").delete().eq("id", id);
  if (error) throw error;
}

// fetches every tag this teacher has created, for the filter chips
export async function getBankTags(teacherId: string): Promise<BankTag[]> {
  const { data, error } = await supabase
    .from("question_bank_tags")
    .select("id, name")
    .eq("teacher_id", teacherId)
    .order("name");

  if (error) throw error;
  return data ?? [];
}

// creates a new tag the teacher can attach to bank questions
export async function createBankTag(teacherId: string, name: string): Promise<BankTag> {
  const { data, error } = await supabase
    .from("question_bank_tags")
    .insert({ teacher_id: teacherId, name })
    .select("id, name")
    .single();

  if (error) throw error;
  return data;
}

// attaches a tag to a bank question — only call this after the question is saved
export async function addTagToQuestion(bankQuestionId: string, tagId: string): Promise<void> {
  const { error } = await supabase
    .from("question_bank_tag_links")
    .upsert({ question_bank_id: bankQuestionId, tag_id: tagId });
  if (error) throw error;
}

// removes a tag from a bank question
export async function removeTagFromQuestion(bankQuestionId: string, tagId: string): Promise<void> {
  const { error } = await supabase
    .from("question_bank_tag_links")
    .delete()
    .eq("question_bank_id", bankQuestionId)
    .eq("tag_id", tagId);
  if (error) throw error;
}

export async function deleteBankTag(tagId: string): Promise<void> {
  const { error } = await supabase.from("question_bank_tags").delete().eq("id", tagId);
  if (error) throw error;
}