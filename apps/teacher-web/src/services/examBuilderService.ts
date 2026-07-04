import {supabase} from "./supabaseClient";
import type { BuilderQuestion, MCQBuilderQuestion, CodingBuilderQuestion, CodingProgramType } from "../screens/examBuilder/examBuilderScreen.types";

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
    test_cases: TestCaseRow[];
  } | null;
};

// the exam row plus all of its questions, exactly as fetched
type ExamBuilderRow = {
  id: string;
  title: string;
  exam_code: string | null;
  status: "draft" | "active" | "ended";
  questions: QuestionRow[];
};

// the shape the builder screen actually needs to render
export interface ExamBuilderData {
  id: string;
  title: string;
  examCode: string | null;
  status: "draft" | "active" | "ended";
  questions: BuilderQuestion[];
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
      title,
      exam_code,
      status,
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
          test_cases ( id, input, expected_output, is_hidden )
        )
      )
    `,
    )
    .eq("id", examId)
    .order("order_index", { referencedTable: "questions" }) // keep questions in builder order
    .single();

  if (error) throw error; // let the hook decide how to show this error

  const row = data as unknown as ExamBuilderRow;

  return {
    id: row.id,
    title: row.title,
    examCode: row.exam_code,
    status: row.status,
    questions: row.questions
      .map(mapQuestionRow)
      .filter((q): q is BuilderQuestion => q !== null), // drop unsupported/bad rows
  };
}