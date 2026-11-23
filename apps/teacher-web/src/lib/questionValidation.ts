import type { BuilderQuestion } from "../screens/examBuilder/examBuilderScreen.types";

export const DEFAULT_TEST_TIME_LIMIT_MS = 5000;
export const MAX_TEST_TIME_LIMIT_MS = 30000;

export function validateQuestionForSave(question: BuilderQuestion): void {
  if (question.type === "multiple-choice") {
    if (question.options.length < 2 || question.options.some((option) => !option.text.trim())) {
      throw new Error(`"${question.title || "Untitled question"}" needs at least two non-empty choices.`);
    }
    if (question.options.filter((option) => option.isCorrect).length !== 1) {
      throw new Error(`Select exactly one correct answer for "${question.title || "Untitled question"}".`);
    }
  }
  if (question.type === "coding") {
    for (const test of question.testCases) {
      const limit = test.timeLimitMs ?? DEFAULT_TEST_TIME_LIMIT_MS;
      if (!Number.isInteger(limit) || limit < 1 || limit > MAX_TEST_TIME_LIMIT_MS) {
        throw new Error(`Test time limits must be whole milliseconds from 1 to ${MAX_TEST_TIME_LIMIT_MS}.`);
      }
    }
  }
}
