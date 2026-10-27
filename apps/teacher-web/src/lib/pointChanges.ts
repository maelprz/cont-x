import type { BuilderQuestion } from "../screens/examBuilder/examBuilderScreen.types";

// one question whose points differ from what is saved
export type PointChange = {
  label: string; // "Q2", from the question's position in the exam
  from: number;
  to: number;
};

// finds questions (among toCheck) that already exist in the exam and now have different points;
// brand-new questions are ignored, nobody has answered them yet
export function findPointChanges(
  toCheck: BuilderQuestion[],
  inExamOrder: BuilderQuestion[],
  saved: BuilderQuestion[],
): PointChange[] {
  return toCheck.flatMap((question) => {
    const before = saved.find((s) => s.id === question.id);
    if (!before || before.points === question.points) return [];
    const position = inExamOrder.findIndex((q) => q.id === question.id);
    return [{ label: `Q${position + 1}`, from: before.points, to: question.points }];
  });
}