import { describe, expect, it } from "vitest";
import type { SurveySummary } from "../../types/survey";
import { actionsForStatus, filterAndSortSurveys } from "./dashboardLogic";

function survey(
  id: string,
  title: string,
  status: SurveySummary["status"],
  created_at: string,
): SurveySummary {
  return {
    id,
    title,
    status,
    created_at,
    updated_at: created_at,
    description: null,
    public_slug: null,
    response_count: 0,
  };
}

const surveys = [
  survey("a", "Recursion Check", "draft", "2026-08-17T12:00:00"),
  survey("b", "Pointer Review", "closed", "2026-08-18T12:00:00"),
  survey("c", "Recursion Review", "archived", "2026-08-18T12:00:00"),
];

describe("dashboard actions", () => {
  it("matches the lifecycle for every status", () => {
    expect(actionsForStatus("draft")).toEqual([
      "edit",
      "activate",
      "duplicate",
      "archive",
      "delete",
    ]);
    expect(actionsForStatus("active")).toEqual(["present", "results", "close"]);
    expect(actionsForStatus("closed")).toEqual([
      "results",
      "duplicate",
      "archive",
      "delete",
    ]);
    expect(actionsForStatus("archived")).toEqual([
      "results",
      "duplicate",
      "delete",
    ]);
  });
});

describe("dashboard filtering and sorting", () => {
  it("combines case-insensitive title, status and inclusive date filters", () => {
    expect(
      filterAndSortSurveys(surveys, {
        search: " REVIEW ",
        status: "closed",
        from: "2026-08-18",
        to: "2026-08-18",
      }).map((item) => item.id),
    ).toEqual(["b"]);
  });

  it("sorts newest first with descending ID ties without mutating input", () => {
    expect(
      filterAndSortSurveys(surveys, {
        search: "",
        status: "all",
        from: "",
        to: "",
      }).map((item) => item.id),
    ).toEqual(["c", "b", "a"]);
    expect(surveys.map((item) => item.id)).toEqual(["a", "b", "c"]);
  });

  it("returns no matches for an excluding date range", () => {
    expect(
      filterAndSortSurveys(surveys, {
        search: "",
        status: "all",
        from: "2026-08-19",
        to: "",
      }),
    ).toEqual([]);
  });
});
