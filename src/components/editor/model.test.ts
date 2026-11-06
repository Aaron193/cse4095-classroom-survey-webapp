import { describe, expect, it } from "vitest";
import {
  editorReducer,
  fromSurvey,
  hasErrors,
  newQuestion,
  toDraft,
  validate,
  type EditorState,
} from "./model";
import type { SurveyDetail } from "../../types/survey";

const state = (): EditorState => ({
  title: " Title ",
  description: "  ",
  questions: [
    {
      ...newQuestion("q", "a", "b"),
      text: " Question ",
      choices: [
        { id: "a", text: " Yes " },
        { id: "b", text: "No" },
      ],
    },
  ],
});

describe("editor model", () => {
  it("starts a question with two empty multiple choice answers", () => {
    expect(newQuestion("q", "a", "b")).toEqual({
      id: "q",
      text: "",
      type: "multiple_choice",
      choices: [
        { id: "a", text: "" },
        { id: "b", text: "" },
      ],
    });
  });
  it("preserves choices across type switches and serializes fixed true/false choices", () => {
    const original = state();
    const tf = editorReducer(original, {
      type: "questionType",
      id: "q",
      value: "true_false",
    });
    expect(toDraft(tf).questions[0].choices).toEqual(["True", "False"]);
    expect(
      editorReducer(tf, {
        type: "questionType",
        id: "q",
        value: "multiple_choice",
      }),
    ).toEqual(original);
    expect(toDraft(original)).toEqual({
      title: "Title",
      description: null,
      questions: [
        {
          question_text: "Question",
          question_type: "multiple_choice",
          choices: ["Yes", "No"],
        },
      ],
    });
  });
  it("reorders and deletes questions and choices without changing their content", () => {
    const original = state();
    const added = editorReducer(original, {
      type: "addQuestion",
      question: newQuestion("q2", "c", "d"),
    });
    const moved = editorReducer(added, {
      type: "moveQuestion",
      id: "q2",
      direction: -1,
    });
    expect(moved.questions.map((q) => q.id)).toEqual(["q2", "q"]);
    const choices = editorReducer(moved, {
      type: "moveChoice",
      id: "q",
      choiceId: "b",
      direction: -1,
    });
    expect(choices.questions[1].choices.map((c) => c.text)).toEqual([
      "No",
      " Yes ",
    ]);
    expect(
      editorReducer(choices, { type: "deleteChoice", id: "q", choiceId: "b" })
        .questions[1].choices,
    ).toHaveLength(1);
    expect(
      editorReducer(choices, { type: "deleteQuestion", id: "q2" }).questions,
    ).toEqual([choices.questions[1]]);
    expect(original.questions[0].choices[0].text).toBe(" Yes ");
  });
  it("validates missing fields, blank choices and trimmed case-insensitive duplicates", () => {
    expect(hasErrors(validate(state()))).toBe(false);
    const invalid: EditorState = {
      title: " ",
      description: "",
      questions: [
        {
          ...newQuestion("q", "a", "b"),
          choices: [
            { id: "a", text: " X " },
            { id: "b", text: "x" },
            { id: "c", text: " " },
          ],
        },
      ],
    };
    const errors = validate(invalid);
    expect(errors.title).toBeTruthy();
    expect(errors.items.q.text).toBeTruthy();
    expect(Object.keys(errors.items.q.choiceErrors)).toEqual(["a", "b", "c"]);
    expect(validate({ ...invalid, questions: [] }).questions).toBeTruthy();
    expect(
      validate({
        ...invalid,
        questions: [
          { ...invalid.questions[0], choices: [{ id: "a", text: "one" }] },
        ],
      }).items.q.choices,
    ).toBeTruthy();
  });
  it("loads server data without exposing fixed choices as editable", () => {
    const survey = {
      title: "T",
      description: null,
      questions: [
        {
          id: "q",
          question_text: "Q",
          question_type: "true_false",
          choices: [],
        },
      ],
    } as unknown as SurveyDetail;
    const loaded = fromSurvey(survey);
    expect(loaded.description).toBe("");
    expect(toDraft(loaded).questions[0].choices).toEqual(["True", "False"]);
  });
});
