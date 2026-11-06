import type { AnswerInput, Question } from "../../types/survey";

export function validateAnswers(
  questions: Question[],
  selected: Record<string, string>,
): { missing: string[]; answers: AnswerInput[] } {
  const missing: string[] = [];
  const answers: AnswerInput[] = [];

  for (const question of questions) {
    const choiceId = selected[question.id];
    if (
      !choiceId ||
      !question.choices.some((choice) => choice.id === choiceId)
    ) {
      missing.push(question.id);
    } else {
      answers.push({ question_id: question.id, choice_id: choiceId });
    }
  }
  return { missing, answers };
}
