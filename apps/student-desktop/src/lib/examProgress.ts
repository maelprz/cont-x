type ExamQuestionRef = { id: string; type: "mcq" | "fitb" | "coding" };

export interface ExamAnswers {
  selectedOptions: Readonly<Record<string, string>>;
  textAnswers: Readonly<Record<string, string>>;
  codeByQuestion: Readonly<Record<string, string>>;
}

// Only the current question's answer type contributes; cleared/blank answers do not.
export function hasQuestionAnswer(question: ExamQuestionRef, answers: ExamAnswers): boolean {
  if (question.type === "mcq") return Boolean(answers.selectedOptions[question.id]);
  const value = question.type === "fitb"
    ? answers.textAnswers[question.id]
    : answers.codeByQuestion[question.id];
  return Boolean(value?.trim());
}

export function countAnsweredQuestions(questions: readonly ExamQuestionRef[], answers: ExamAnswers): number {
  return questions.filter((question) => hasQuestionAnswer(question, answers)).length;
}
