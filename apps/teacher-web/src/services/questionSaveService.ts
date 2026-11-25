import { supabase } from './supabaseClient';
import { requireFitbAnswer } from '../lib/fitbAnswers';
import { DEFAULT_TEST_TIME_LIMIT_MS, validateQuestionForSave } from '../lib/questionValidation';
import { requireTopicIds } from './questionTopicService';
import type { BuilderQuestion } from '../screens/examBuilder/examBuilderScreen.types';

// One transaction owns the base question, topics and all type-specific data.
export async function saveQuestionWithDetails(
  question: BuilderQuestion,
  target: { examId: string } | { subjectId: string },
): Promise<void> {
  validateQuestionForSave(question);
  const topicIds = requireTopicIds(question.topicIds);
  const type = question.type === 'multiple-choice' ? 'mcq'
    : question.type === 'fill-in-the-blank' ? 'fitb' : 'coding';
  const details = question.type === 'multiple-choice' ? {
    rows: question.options.map(option => ({ id: option.id, option_text: option.text, is_correct: option.isCorrect })),
  } : question.type === 'fill-in-the-blank' ? {
    case_sensitive: question.caseSensitive, ignore_extra_spaces: question.ignoreExtraSpaces,
    rows: requireFitbAnswer(question.acceptedAnswers).map(answer => ({ id: answer.id, answer_text: answer.text })),
  } : {
    starter_code: question.starterCode, program_type: question.programType, main_code: question.mainCode,
    check_penalty_per_attempt: question.deductionPerAttempt, reference_solution: question.referenceSolution,
    rows: question.testCases.map(test => ({ id: test.id, input: test.input, expected_output: test.expectedOutput,
      is_hidden: test.isHidden, time_limit_ms: test.timeLimitMs ?? DEFAULT_TEST_TIME_LIMIT_MS })),
  };
  const { error } = await supabase.rpc('save_question_with_details', {
    ...('examId' in target ? { p_exam_id: target.examId } : { p_subject_id: target.subjectId }),
    p_question: {
      id: question.id, title: question.title, type, prompt: question.description,
      max_points: question.points, order_index: question.number - 1,
      ...(question.sectionId !== undefined ? { section_id: question.sectionId } : {}),
      ...(question.sourceBankQuestionId ? { source_bank_question_id: question.sourceBankQuestionId } : {}),
    },
    p_topic_ids: topicIds, p_details: details,
  });
  if (error) throw new Error(error.message);
}
