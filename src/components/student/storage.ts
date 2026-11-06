const TOKEN_KEY = "classroom-survey-token";
const SUBMITTED_PREFIX = "classroom-survey-submitted:";

export interface StudentMemory {
  token?: string;
  submitted: Set<string>;
}

type StorageAccess = Pick<Storage, "getItem" | "setItem">;

export function getBrowserToken(
  storage: StorageAccess | null,
  memory: StudentMemory,
  createToken: () => string,
): string {
  if (memory.token) return memory.token;

  try {
    const stored = storage?.getItem(TOKEN_KEY);
    if (stored) {
      memory.token = stored;
      return stored;
    }
  } catch {
    // Storage can be blocked even when the browser exposes localStorage.
  }

  const token = createToken();
  memory.token = token;
  try {
    storage?.setItem(TOKEN_KEY, token);
  } catch {
    // Keep the token in memory for this page load.
  }
  return token;
}

export function hasSubmitted(
  storage: StorageAccess | null,
  memory: StudentMemory,
  surveyId: string,
): boolean {
  if (memory.submitted.has(surveyId)) return true;
  try {
    return storage?.getItem(SUBMITTED_PREFIX + surveyId) === "true";
  } catch {
    return false;
  }
}

export function rememberSubmission(
  storage: StorageAccess | null,
  memory: StudentMemory,
  surveyId: string,
): void {
  memory.submitted.add(surveyId);
  try {
    storage?.setItem(SUBMITTED_PREFIX + surveyId, "true");
  } catch {
    // The in-memory record still protects this page load.
  }
}

export function browserStorage(): StorageAccess | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function createRandomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}
