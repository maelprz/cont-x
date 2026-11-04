import type { MCQBuilderQuestion, CodingBuilderQuestion, FITBBuilderQuestion, CodingProgramType } from "../../screens/examBuilder/examBuilderScreen.types";

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

// default starter code shown when a question is set to C Program format
const DEFAULT_PROGRAM_STARTER_CODE = `#include <stdio.h>

int main() {
    // Write your code here

    return 0;
}
`;

// default starter code shown when a question is set to C Function format
const DEFAULT_FUNCTION_STARTER_CODE = `// Write your function here
int solve() {

    return 0;
}
`;

// default hidden main code that calls the student's function
const DEFAULT_FUNCTION_MAIN_CODE = `#include <stdio.h>

int main() {
    // Calls the student's function and prints the result
    printf("%d", solve());
    return 0;
}
`;

// returns the right starter code template for the given format
export function starterCodeFor(programType: CodingProgramType): string {
  return programType === "cFunction"
    ? DEFAULT_FUNCTION_STARTER_CODE
    : DEFAULT_PROGRAM_STARTER_CODE;
}

// returns the right hidden main code template for the given format
export function mainCodeFor(programType: CodingProgramType): string {
  return programType === "cFunction" ? DEFAULT_FUNCTION_MAIN_CODE : "";
}

// blank starting point for a brand new coding question
export function createBlankCodingQuestion(
  id: string,
  number: number,
  programType: CodingProgramType = "cProgram"
): CodingBuilderQuestion {
  return {
    id,
    number,
    title: "Untitled Question",
    type: "coding",
    points: 1,
    description: "Description of the question goes here.",
    starterCode: starterCodeFor(programType),
    testCases: [],
    programType,
    mainCode: mainCodeFor(programType),
    deductionPerAttempt: 0,
    referenceSolution: "",
  };
}

// blank starting point for a brand new fill-in-the-blank question, with one empty answer row
export function createBlankFitbQuestion(id: string, number: number): FITBBuilderQuestion {
  return {
    id,
    number,
    title: "Untitled Question",
    type: "fill-in-the-blank",
    points: 1,
    description: "Description of the question goes here.",
    acceptedAnswers: [{ id: crypto.randomUUID(), text: "" }],
    caseSensitive: false,
    ignoreExtraSpaces: true,
  };
}