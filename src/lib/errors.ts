// Maps backend and network errors to safe messages for the interface.
import type { AppError, AppErrorCode } from "../types/survey";

const messages: Record<AppErrorCode, string> = {
  AUTH_REQUIRED: "Please sign in to continue.",
  FORBIDDEN: "This account isn't an instructor.",
  NOT_FOUND: "This survey could not be found.",
  INVALID_INPUT: "Please check the information provided and try again.",
  INVALID_STATE: "This action is not available for the current survey status.",
  SURVEY_NOT_ACTIVE: "This survey is no longer accepting responses.",
  DUPLICATE_RESPONSE: "You have already submitted a response to this survey.",
  INVALID_QUESTION: "A question is invalid. Please refresh and try again.",
  INVALID_CHOICE: "An answer is invalid. Please refresh and try again.",
  MISSING_REQUIRED_ANSWER: "Please answer every question.",
  NETWORK_ERROR:
    "Could not connect. Check your internet connection and try again.",
  UNEXPECTED_ERROR: "Something went wrong. Please try again.",
};

export function appError(code: AppErrorCode): AppError {
  return { code, message: messages[code] };
}

export function mapError(error: unknown): AppError {
  if (typeof error === "object" && error !== null) {
    const value = error as {
      message?: unknown;
      code?: unknown;
      name?: unknown;
      status?: unknown;
    };
    if (typeof value.code === "string" && Object.hasOwn(messages, value.code))
      return appError(value.code as AppErrorCode);
    if (
      typeof value.message === "string" &&
      Object.hasOwn(messages, value.message)
    )
      return appError(value.message as AppErrorCode);
    if (
      value.name === "TypeError" ||
      value.name === "AbortError" ||
      value.code === "FETCH_ERROR" ||
      value.status === 0 ||
      (typeof value.message === "string" &&
        /^(?:TypeError: )?(failed to fetch|fetch failed|networkerror|network request failed)/i.test(
          value.message,
        ))
    )
      return appError("NETWORK_ERROR");
  }
  return appError("UNEXPECTED_ERROR");
}
