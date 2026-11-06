import { describe, expect, it } from "vitest";
import {
  activateSurvey,
  archiveSurvey,
  closeSurvey,
  deleteSurvey,
  duplicateSurvey,
  getResponseCount,
  getSurvey,
  getSurveyExport,
  getSurveyResults,
  saveDraft,
} from "./api";

describe("instructor survey IDs", () => {
  it("returns NOT_FOUND for malformed IDs before making a request", async () => {
    const invalid = "not-a-uuid";
    const calls = [
      () => getSurvey(invalid),
      () => getResponseCount(invalid),
      () => saveDraft(invalid, { title: "", description: null, questions: [] }),
      () => duplicateSurvey(invalid),
      () => activateSurvey(invalid),
      () => closeSurvey(invalid),
      () => archiveSurvey(invalid),
      () => deleteSurvey(invalid),
      () => getSurveyResults(invalid),
      () => getSurveyExport(invalid),
    ];
    for (const call of calls) {
      await expect(call()).rejects.toMatchObject({ code: "NOT_FOUND" });
    }
  });
});
