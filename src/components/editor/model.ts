import type {
  DraftInput,
  QuestionType,
  SurveyDetail,
} from "../../types/survey";

export type EditorChoice = { id: string; text: string };
export type EditorQuestion = {
  id: string;
  text: string;
  type: QuestionType;
  choices: EditorChoice[];
};
export type EditorState = {
  title: string;
  description: string;
  questions: EditorQuestion[];
};
export type Action =
  | { type: "title"; value: string }
  | { type: "description"; value: string }
  | { type: "addQuestion"; question: EditorQuestion }
  | { type: "deleteQuestion"; id: string }
  | { type: "moveQuestion"; id: string; direction: -1 | 1 }
  | { type: "questionText"; id: string; value: string }
  | { type: "questionType"; id: string; value: QuestionType }
  | { type: "addChoice"; id: string; choice: EditorChoice }
  | { type: "deleteChoice"; id: string; choiceId: string }
  | { type: "choiceText"; id: string; choiceId: string; value: string }
  | { type: "moveChoice"; id: string; choiceId: string; direction: -1 | 1 };

export function newQuestion(
  id: string,
  first: string,
  second: string,
): EditorQuestion {
  return {
    id,
    text: "",
    type: "multiple_choice",
    choices: [
      { id: first, text: "" },
      { id: second, text: "" },
    ],
  };
}

export function fromSurvey(survey: SurveyDetail): EditorState {
  return {
    title: survey.title,
    description: survey.description ?? "",
    questions: survey.questions.map((q) => ({
      id: q.id,
      text: q.question_text,
      type: q.question_type,
      choices:
        q.question_type === "multiple_choice"
          ? q.choices.map((c) => ({ id: c.id, text: c.choice_text }))
          : [
              { id: `${q.id}-1`, text: "" },
              { id: `${q.id}-2`, text: "" },
            ],
    })),
  };
}

function move<T extends { id: string }>(
  items: T[],
  id: string,
  direction: -1 | 1,
): T[] {
  const index = items.findIndex((item) => item.id === id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= items.length) return items;
  const result = [...items];
  [result[index], result[target]] = [result[target], result[index]];
  return result;
}

export function editorReducer(state: EditorState, action: Action): EditorState {
  if (action.type === "title" || action.type === "description")
    return { ...state, [action.type]: action.value };
  if (action.type === "addQuestion")
    return { ...state, questions: [...state.questions, action.question] };
  if (action.type === "deleteQuestion")
    return {
      ...state,
      questions: state.questions.filter((q) => q.id !== action.id),
    };
  if (action.type === "moveQuestion")
    return {
      ...state,
      questions: move(state.questions, action.id, action.direction),
    };
  return {
    ...state,
    questions: state.questions.map((q) => {
      if (q.id !== action.id) return q;
      switch (action.type) {
        case "questionText":
          return { ...q, text: action.value };
        case "questionType":
          return { ...q, type: action.value };
        case "addChoice":
          return { ...q, choices: [...q.choices, action.choice] };
        case "deleteChoice":
          return {
            ...q,
            choices: q.choices.filter((c) => c.id !== action.choiceId),
          };
        case "choiceText":
          return {
            ...q,
            choices: q.choices.map((c) =>
              c.id === action.choiceId ? { ...c, text: action.value } : c,
            ),
          };
        case "moveChoice":
          return {
            ...q,
            choices: move(q.choices, action.choiceId, action.direction),
          };
      }
    }),
  };
}

export type Validation = {
  title?: string;
  questions?: string;
  items: Record<
    string,
    { text?: string; choices?: string; choiceErrors: Record<string, string> }
  >;
};
export function validate(state: EditorState): Validation {
  const result: Validation = { items: {} };
  if (!state.title.trim()) result.title = "Enter a survey title.";
  if (!state.questions.length) result.questions = "Add at least one question.";
  for (const question of state.questions) {
    const errors: Validation["items"][string] = { choiceErrors: {} };
    if (!question.text.trim()) errors.text = "Enter question text.";
    if (question.type === "multiple_choice") {
      if (question.choices.filter((c) => c.text.trim()).length < 2)
        errors.choices = "Enter at least two nonblank choices.";
      const counts = new Map<string, number>();
      for (const choice of question.choices) {
        const value = choice.text.trim().toLowerCase();
        if (value) counts.set(value, (counts.get(value) ?? 0) + 1);
      }
      for (const choice of question.choices) {
        const value = choice.text.trim().toLowerCase();
        if (!value)
          errors.choiceErrors[choice.id] = "Enter a choice or remove it.";
        else if ((counts.get(value) ?? 0) > 1)
          errors.choiceErrors[choice.id] = "Choices must be unique.";
      }
    }
    result.items[question.id] = errors;
  }
  return result;
}

export function hasErrors(errors: Validation): boolean {
  return Boolean(
    errors.title ||
    errors.questions ||
    Object.values(errors.items).some(
      (e) => e.text || e.choices || Object.keys(e.choiceErrors).length,
    ),
  );
}

export function toDraft(state: EditorState): DraftInput {
  return {
    title: state.title.trim(),
    description: state.description.trim() || null,
    questions: state.questions.map((q) => ({
      question_text: q.text.trim(),
      question_type: q.type,
      choices:
        q.type === "true_false"
          ? ["True", "False"]
          : q.choices.map((c) => c.text.trim()),
    })),
  };
}
