import { afterEach, describe, expect, it, vi } from "vitest";
import { getPublicSurveyUrl } from "./publicUrl";
describe("getPublicSurveyUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });
  it("normalizes the configured base and encodes the slug", () => {
    vi.stubEnv("VITE_PUBLIC_SITE_URL", "https://example.com/base///");
    expect(getPublicSurveyUrl("a b")).toBe("https://example.com/base/s/a%20b");
  });
  it("uses the current origin for an empty configuration", () => {
    vi.stubEnv("VITE_PUBLIC_SITE_URL", " ");
    vi.stubGlobal("window", { location: { origin: "https://local.example" } });
    expect(getPublicSurveyUrl("abc")).toBe("https://local.example/s/abc");
  });
});
