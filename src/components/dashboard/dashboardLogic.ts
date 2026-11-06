import type { SurveyStatus, SurveySummary } from "../../types/survey";

export type SurveyAction =
  | "edit"
  | "activate"
  | "present"
  | "results"
  | "close"
  | "duplicate"
  | "archive"
  | "delete";

const actions: Record<SurveyStatus, SurveyAction[]> = {
  draft: ["edit", "activate", "duplicate", "archive", "delete"],
  active: ["present", "results", "close"],
  closed: ["results", "duplicate", "archive", "delete"],
  archived: ["results", "duplicate", "delete"],
};

export function actionsForStatus(status: SurveyStatus): SurveyAction[] {
  return actions[status];
}

export function filterAndSortSurveys(
  surveys: SurveySummary[],
  filters: {
    search: string;
    status: SurveyStatus | "all";
    from: string;
    to: string;
  },
): SurveySummary[] {
  const query = filters.search.trim().toLocaleLowerCase();
  return surveys
    .filter((survey) => {
      // Date controls and displayed dates use the browser's local calendar day.
      const date = new Date(survey.created_at);
      const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      return (
        survey.title.toLocaleLowerCase().includes(query) &&
        (filters.status === "all" || survey.status === filters.status) &&
        (!filters.from || day >= filters.from) &&
        (!filters.to || day <= filters.to)
      );
    })
    .sort(
      (a, b) =>
        Date.parse(b.created_at) - Date.parse(a.created_at) ||
        b.id.localeCompare(a.id),
    );
}
