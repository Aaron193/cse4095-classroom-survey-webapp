import { describe, expect, it } from "vitest";
import { mapError } from "./errors";

describe("mapError", () => {
  it("maps database exception messages to safe messages", () => {
    expect(mapError({ message: "FORBIDDEN" })).toEqual({
      code: "FORBIDDEN",
      message: "This account isn't an instructor.",
    });
    expect(mapError({ message: "DUPLICATE_RESPONSE" }).code).toBe(
      "DUPLICATE_RESPONSE",
    );
  });

  it("maps network errors and hides unexpected details", () => {
    expect(mapError(new TypeError("Failed to fetch")).code).toBe(
      "NETWORK_ERROR",
    );
    expect(mapError({ message: "private database details" })).toEqual({
      code: "UNEXPECTED_ERROR",
      message: "Something went wrong. Please try again.",
    });
  });
});
