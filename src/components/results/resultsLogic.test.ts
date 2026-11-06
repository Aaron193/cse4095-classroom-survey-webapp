import { describe, expect, it } from "vitest";
import type { ExportData, SurveyResults } from "../../types/survey";
import { buildCsv, chartData, csvCell, safeFilename } from "./resultsLogic";

describe("CSV export", () => {
  it("escapes quotes, commas and newlines and neutralizes formula prefixes", () => {
    expect(csvCell('=SUM("a,b")\nnext')).toBe('"\'=SUM(""a,b"")\nnext"');
    for (const prefix of ["=", "+", "-", "@"])
      expect(csvCell(`${prefix}test`)).toBe(`'${prefix}test`);
  });
  it("keeps headers with no responses and preserves Unicode", () => {
    const data: ExportData = {
      survey_id: "s",
      title: "日本語",
      questions: [{ question_id: "q", question_text: "¿Qué, sí?" }],
      responses: [],
    };
    expect(buildCsv(data)).toBe(
      '\uFEFFsurvey_title,response_id,submitted_at,"¿Qué, sí?"\r\n',
    );
    data.responses.push({
      response_id: "r",
      submitted_at: "today",
      answers: [{ question_id: "q", choice_text: "✓" }],
    });
    expect(buildCsv(data)).toContain("日本語,r,today,✓\r\n");
  });
  it("makes a usable filename", () =>
    expect(safeFilename("A/B: C")).toBe("A_B_ C"));
});

describe("chart data", () => {
  it("handles zero and incomplete answers and rounds per question", () => {
    const question: SurveyResults["questions"][number] = {
      question_id: "q",
      question_text: "Q",
      response_count: 0,
      choices: [
        { choice_id: "c", choice_text: "Yes", count: 0, percentage: 99 },
      ],
    };
    expect(chartData(question)[0].percentage).toBe(0);
    question.response_count = 3;
    question.choices[0].count = 1;
    expect(chartData(question)[0].percentage).toBe(33.3);
  });
});
