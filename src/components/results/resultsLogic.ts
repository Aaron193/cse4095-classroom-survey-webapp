import type { ExportData, SurveyResults } from "../../types/survey";

export function csvCell(value: string): string {
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function buildCsv(data: ExportData): string {
  const rows = [
    [
      "survey_title",
      "response_id",
      "submitted_at",
      ...data.questions.map((q) => q.question_text),
    ],
    ...data.responses.map((response) => {
      const answers = new Map(
        response.answers.map((answer) => [
          answer.question_id,
          answer.choice_text,
        ]),
      );
      return [
        data.title,
        response.response_id,
        response.submitted_at,
        ...data.questions.map((q) => answers.get(q.question_id) ?? ""),
      ];
    }),
  ];
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`;
}

export function safeFilename(title: string): string {
  return (
    title
      .trim()
      .replace(/[<>:"/\\|?*]/g, "_")
      .split("")
      .map((char) => (char.charCodeAt(0) < 32 ? "_" : char))
      .join("")
      .replace(/\.+$/, "")
      .trim() || "survey"
  );
}

export function chartData(question: SurveyResults["questions"][number]) {
  return question.choices.map((choice) => ({
    ...choice,
    percentage: question.response_count
      ? Math.round((choice.count / question.response_count) * 1000) / 10
      : 0,
  }));
}
