import type { FITBAnswer } from "../screens/examBuilder/examBuilderScreen.types";

// The answers that will actually be saved: edge spaces removed, blank rows dropped.
// A fill-in-the-blank question must keep at least one, or nobody could ever be marked correct.
export function cleanFitbAnswers(answers: FITBAnswer[]): FITBAnswer[] {
  return answers
    .map((a) => ({ id: a.id, text: a.text.trim() }))
    .filter((a) => a.text !== "");
}

// stops a save before anything is written when there is no usable answer
export function requireFitbAnswer(answers: FITBAnswer[]): FITBAnswer[] {
  const cleaned = cleanFitbAnswers(answers);
  if (cleaned.length === 0) {
    throw new Error("A fill-in-the-blank question needs at least one accepted answer.");
  }
  return cleaned;
}