import { describe, expect, it, vi } from "vitest";
import {
  getBrowserToken,
  hasSubmitted,
  rememberSubmission,
  type StudentMemory,
} from "./storage";
import { validateAnswers } from "./validation";
import type { Question } from "../../types/survey";

function mockStorage() {
  const values = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      values.set(key, value);
    }),
  };
}

function memory(): StudentMemory {
  return { submitted: new Set() };
}

describe("student storage", () => {
  it("reuses a stored token across page loads and surveys", () => {
    const storage = mockStorage();
    const generate = vi.fn(() => "random-token");
    expect(getBrowserToken(storage, memory(), generate)).toBe("random-token");
    expect(getBrowserToken(storage, memory(), generate)).toBe("random-token");
    expect(generate).toHaveBeenCalledOnce();
  });

  it("remembers submitted surveys independently", () => {
    const storage = mockStorage();
    rememberSubmission(storage, memory(), "one");
    expect(hasSubmitted(storage, memory(), "one")).toBe(true);
    expect(hasSubmitted(storage, memory(), "two")).toBe(false);
  });

  it("falls back to memory when storage throws", () => {
    const storage = {
      getItem: vi.fn((): string | null => {
        throw new Error();
      }),
      setItem: vi.fn(() => {
        throw new Error();
      }),
    };
    const state = memory();
    const generate = vi.fn(() => "random-token");
    expect(getBrowserToken(storage, state, generate)).toBe("random-token");
    expect(getBrowserToken(storage, state, generate)).toBe("random-token");
    expect(generate).toHaveBeenCalledOnce();
    expect(hasSubmitted(storage, state, "one")).toBe(false);
    rememberSubmission(storage, state, "one");
    expect(hasSubmitted(storage, state, "one")).toBe(true);
    expect(hasSubmitted(storage, memory(), "one")).toBe(false);
  });
});

describe("validateAnswers", () => {
  const questions: Question[] = [
    {
      id: "q1",
      survey_id: "s",
      question_text: "One",
      question_type: "multiple_choice",
      position: 0,
      choices: [{ id: "c1", question_id: "q1", choice_text: "A", position: 0 }],
    },
    {
      id: "q2",
      survey_id: "s",
      question_text: "Two",
      question_type: "true_false",
      position: 1,
      choices: [
        { id: "c2", question_id: "q2", choice_text: "True", position: 0 },
      ],
    },
  ];
  it("returns missing questions in order, including invalid choices", () => {
    expect(validateAnswers(questions, { q1: "c2" })).toEqual({
      missing: ["q1", "q2"],
      answers: [],
    });
  });
  it("produces the wire-format answers in question order", () => {
    expect(validateAnswers(questions, { q2: "c2", q1: "c1" })).toEqual({
      missing: [],
      answers: [
        { question_id: "q1", choice_id: "c1" },
        { question_id: "q2", choice_id: "c2" },
      ],
    });
  });
});
