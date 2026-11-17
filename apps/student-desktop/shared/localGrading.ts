import type { LocalRubric } from '../src/types/localGrading';

export function validateCodingRubric(rubric: LocalRubric): void {
  if (rubric.type !== 'coding') return;
  if (!rubric.programType || !Array.isArray(rubric.tests) || rubric.tests.length === 0) {
    throw new Error('This coding question has no complete grading tests. Ask your teacher to save its test cases and download the exam again.');
  }
}

export function gradeTextAnswer(rubric: LocalRubric, answer: string): number {
  if (rubric.type === 'mcq') return rubric.correctOptionIds?.includes(answer) ? rubric.maxPoints : 0;
  if (rubric.type !== 'fitb') throw new Error('Coding answers require execution.');
  const normalize = (value: string) => {
    let text = value.trim();
    if (rubric.ignoreExtraSpaces) text = text.replace(/\s+/gu, ' ');
    return rubric.caseSensitive ? text : text.toLowerCase();
  };
  const normalized = normalize(answer);
  return normalized && rubric.acceptedAnswers?.some((value) => normalize(value) === normalized) ? rubric.maxPoints : 0;
}

export function codingScore(passed: number, total: number, maxPoints: number, deduction: number): number {
  return Math.max(0, (total > 0 ? passed / total * maxPoints : 0) - deduction);
}
