import type { BuilderPool, BuilderQuestion, BuilderSection } from "../screens/examBuilder/examBuilderScreen.types";

// Puts questions and pools in section order and renumbers the questions 1..n to match, so the
// stored order_index (and every screen that sorts by it) follows the sections. Within a section,
// questions keep their own order and pools come after them. Exams without sections are returned
// untouched.
export function applySectionLayout(
  questions: BuilderQuestion[],
  pools: BuilderPool[],
  sections: BuilderSection[],
): { questions: BuilderQuestion[]; pools: BuilderPool[] } {
  if (sections.length === 0) return { questions, pools };

  const rank = new Map(sections.map((section, index) => [section.id, index]));
  // anything without a known section sorts first, so it stays visible instead of vanishing
  const rankOf = (sectionId: string | null | undefined): number =>
    sectionId != null && rank.has(sectionId) ? (rank.get(sectionId) as number) : -1;

  const sortedQuestions = [...questions]
    .sort((a, b) => rankOf(a.sectionId) - rankOf(b.sectionId) || a.number - b.number)
    .map((question, index) => (question.number === index + 1 ? question : { ...question, number: index + 1 }));

  const sortedPools = [...pools].sort((a, b) => rankOf(a.sectionId) - rankOf(b.sectionId));

  return { questions: sortedQuestions, pools: sortedPools };
}