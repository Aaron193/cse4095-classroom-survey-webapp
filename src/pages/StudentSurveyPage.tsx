import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { ErrorState, LoadingState } from "../components/ui/States";
import {
  browserStorage,
  createRandomToken,
  getBrowserToken,
  hasSubmitted,
  rememberSubmission,
  type StudentMemory,
} from "../components/student/storage";
import { validateAnswers } from "../components/student/validation";
import { getPublicSurvey, submitSurveyResponse } from "../lib/api";
import type { PublicSurvey } from "../types/survey";
import "../components/student/student.css";

type PageState =
  | { kind: "loading" }
  | { kind: "load-error" }
  | { kind: "not-found" }
  | { kind: "closed"; title: string }
  | { kind: "form"; survey: PublicSurvey }
  | { kind: "success" }
  | { kind: "submitted" };

const memory: StudentMemory = { submitted: new Set() };

function errorCode(error: unknown): string | undefined {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return error.code;
  }

  return undefined;
}

export default function StudentSurveyPage() {
  const { slug = "" } = useParams();
  const [page, setPage] = useState<PageState>({ kind: "loading" });
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [missing, setMissing] = useState<string[]>([]);
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const questionRefs = useRef<Record<string, HTMLFieldSetElement | null>>({});
  const requestRef = useRef(0);
  const focusEndState = useRef(false);

  const endStateHeading = useCallback((heading: HTMLHeadingElement | null) => {
    if (heading && focusEndState.current) {
      heading.focus();
      focusEndState.current = false;
    }
  }, []);

  const load = useCallback(async () => {
    const request = ++requestRef.current;
    setPage({ kind: "loading" });

    try {
      const result = await getPublicSurvey(slug);
      // Ignore results from a previous slug or an unmounted page.
      if (request !== requestRef.current) return;

      if (result.status === "not_found") setPage({ kind: "not-found" });
      else if (result.status === "closed")
        setPage({ kind: "closed", title: result.title });
      else if (hasSubmitted(browserStorage(), memory, result.survey.id))
        setPage({ kind: "submitted" });
      else setPage({ kind: "form", survey: result.survey });

      if (result.status === "active") document.title = result.survey.title;
      if (result.status === "closed") document.title = result.title;
    } catch {
      if (request === requestRef.current) setPage({ kind: "load-error" });
    }
  }, [slug]);

  useEffect(() => {
    const requests = requestRef;
    void Promise.resolve().then(load);

    return () => {
      requests.current++;
    };
  }, [load]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // The ref guards against a second tap before React updates the button.
    if (submittingRef.current || page.kind !== "form") return;

    const { missing: unanswered, answers } = validateAnswers(
      page.survey.questions,
      selected,
    );
    setMissing(unanswered);
    setSubmitError("");

    if (unanswered.length) {
      questionRefs.current[unanswered[0]]?.focus();
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);

    try {
      const storage = browserStorage();
      const token = getBrowserToken(storage, memory, createRandomToken);
      await submitSurveyResponse(page.survey.id, token, answers);
      rememberSubmission(storage, memory, page.survey.id);
      focusEndState.current = true;
      setPage({ kind: "success" });
    } catch (error) {
      const code = errorCode(error);

      if (code === "DUPLICATE_RESPONSE") {
        rememberSubmission(browserStorage(), memory, page.survey.id);
        focusEndState.current = true;
        setPage({ kind: "submitted" });
      } else if (code === "SURVEY_NOT_ACTIVE") {
        focusEndState.current = true;
        setPage({ kind: "closed", title: page.survey.title });
      } else {
        setSubmitError(
          code === "NETWORK_ERROR"
            ? "Could not connect. Check your internet connection and try again."
            : "Something went wrong. Please try again.",
        );
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <main className="student-page">
      {page.kind === "loading" && <LoadingState message="Loading survey..." />}
      {page.kind === "load-error" && (
        <>
          <ErrorState error="Could not load the survey. Please check your connection and try again." />
          <Button onClick={() => void load()}>Try Again</Button>
        </>
      )}
      {page.kind === "not-found" && (
        <>
          <h1>Survey not found</h1>
          <p>Check the link, or ask your instructor for the current one.</p>
        </>
      )}
      {page.kind === "closed" && (
        <>
          <h1 ref={endStateHeading} tabIndex={-1}>
            {page.title}
          </h1>
          <p>This survey is no longer accepting responses.</p>
        </>
      )}
      {page.kind === "success" && (
        <>
          <h1 ref={endStateHeading} tabIndex={-1}>
            Thank you!
          </h1>
          <p>Your response has been recorded.</p>
        </>
      )}
      {page.kind === "submitted" && (
        <>
          <h1 ref={endStateHeading} tabIndex={-1}>
            Already submitted
          </h1>
          <p>You have already submitted a response to this survey.</p>
        </>
      )}
      {page.kind === "form" && (
        <>
          <h1>{page.survey.title}</h1>
          {page.survey.description && (
            <p className="student-description">{page.survey.description}</p>
          )}
          <form className="student-form" noValidate onSubmit={submit}>
            {page.survey.questions.map((question, index) => (
              <fieldset
                key={question.id}
                className="student-question"
                tabIndex={-1}
                ref={(element) => {
                  questionRefs.current[question.id] = element;
                }}
                aria-describedby={
                  missing.includes(question.id)
                    ? `error-${question.id}`
                    : undefined
                }
              >
                <legend>
                  {index + 1}. {question.question_text}
                </legend>
                {missing.includes(question.id) && (
                  <p className="student-required" id={`error-${question.id}`}>
                    Please answer this question.
                  </p>
                )}
                <div className="student-choices">
                  {question.choices.map((choice) => (
                    <label className="student-choice" key={choice.id}>
                      <input
                        type="radio"
                        name={question.id}
                        value={choice.id}
                        checked={selected[question.id] === choice.id}
                        required
                        onChange={() => {
                          setSelected((previous) => ({
                            ...previous,
                            [question.id]: choice.id,
                          }));
                          setMissing((previous) =>
                            previous.filter((id) => id !== question.id),
                          );
                        }}
                      />
                      <span>{choice.choice_text}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
            {submitError && <ErrorState error={submitError} />}
            <Button
              className="student-submit"
              type="submit"
              disabled={submitting}
            >
              {submitting ? "Submitting..." : "Submit"}
            </Button>
          </form>
        </>
      )}
    </main>
  );
}
