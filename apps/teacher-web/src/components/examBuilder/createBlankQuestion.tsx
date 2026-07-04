import type { MCQBuilderQuestion, CodingBuilderQuestion } from "../../screens/examBuilder/examBuilderScreen.types";

// blank starting point for a brand new multiple-choice question
export function createBlankMCQuestion(id: string, number: number): MCQBuilderQuestion {
  return {
    id,
    number,
    title: "Untitled Question",
    type: "multiple-choice",
    points: 1,
    description: "Description of the question goes here.",
    options: [
      { id: crypto.randomUUID(), text: "Option 1", isCorrect: true },
      { id: crypto.randomUUID(), text: "Option 2", isCorrect: false },
    ],
  };
}

// blank starting point for a brand new coding question
export function createBlankCodingQuestion(id: string, number: number): CodingBuilderQuestion {
  return {
    id,
    number,
    title: "Untitled Question",
    type: "coding",
    points: 1,
    description: "Description of the question goes here.",
    starterCode: "",
    testCases: [],
    programType: "cProgram",
    mainCode: "",
    deductionPerAttempt: 0,
  };
}