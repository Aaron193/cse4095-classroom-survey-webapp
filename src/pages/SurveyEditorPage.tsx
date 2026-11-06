import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { ErrorState, LoadingState } from "../components/ui/States";
import {
  editorReducer,
  fromSurvey,
  hasErrors,
  newQuestion,
  toDraft,
  validate,
  type Action,
  type EditorState,
} from "../components/editor/model";
import { activateSurvey, getSurvey, listSurveys, saveDraft } from "../lib/api";
import { mapError } from "../lib/errors";
import type { AppError, QuestionType, SurveyDetail } from "../types/survey";
import "../components/editor/editor.css";

const id = () => crypto.randomUUID();
const makeQuestion = () => newQuestion(id(), id(), id());
const initialState = (): EditorState => ({
  title: "",
  description: "",
  questions: [makeQuestion()],
});

export default function SurveyEditorPage() {
  const { id: routeId } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState(initialState);
  const [baseline, setBaseline] = useState(() => JSON.stringify(state));
  const [survey, setSurvey] = useState<SurveyDetail | null>(null);
  const [loading, setLoading] = useState(Boolean(routeId));
  const [loadError, setLoadError] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [confirmActivation, setConfirmActivation] = useState<string | null>(
    null,
  );
  const skipLoad = useRef<string | null>(null);
  const dirty = JSON.stringify(state) !== baseline;
  const errors = validate(state);

  useEffect(() => {
    if (!routeId || skipLoad.current === routeId) {
      skipLoad.current = null;
      return;
    }
    let cancelled = false;

    getSurvey(routeId)
      .then((data) => {
        if (cancelled) return;

        const next = fromSurvey(data);
        setSurvey(data);
        setState(next);
        setBaseline(JSON.stringify(next));
        setLoading(false);
      })
      .catch((reason) => {
        if (!cancelled) {
          setError(mapError(reason));
          setLoadError(true);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [routeId]);

  useEffect(() => {
    if (!dirty) return;

    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function change(action: Action) {
    setState((current) => editorReducer(current, action));
    setSaved(false);
  }

  function changeAndFocus(action: Action, inputId: string) {
    change(action);
    // Wait for React to render newly added or reordered inputs.
    requestAnimationFrame(() => document.getElementById(inputId)?.focus());
  }

  async function persist(): Promise<string> {
    const result = await saveDraft(routeId ?? null, toDraft(state));

    // The save replaces question IDs, so use only the server's fresh copy.
    if (!routeId) {
      skipLoad.current = result.survey_id;
      navigate(`/surveys/${result.survey_id}/edit`, { replace: true });
    }

    const fresh = await getSurvey(result.survey_id);
    const next = fromSurvey(fresh);
    setSurvey(fresh);
    setState(next);
    setBaseline(JSON.stringify(next));
    setSaved(true);
    return result.survey_id;
  }

  async function submit(activate: boolean, confirmed = false) {
    setShowValidation(true);
    setError(null);
    const validation = validate(state);
    if (hasErrors(validation)) {
      let target = validation.title ? "survey-title" : "add-question";

      if (!validation.title && !validation.questions) {
        for (const question of state.questions) {
          const questionErrors = validation.items[question.id];
          if (questionErrors.text) {
            target = `question-${question.id}`;
            break;
          }

          const invalidChoice = question.choices.find(
            (choice) => questionErrors.choiceErrors[choice.id],
          );
          if (invalidChoice || questionErrors.choices) {
            // A missing choice has no input to focus, so focus its add button.
            target = invalidChoice
              ? `choice-${invalidChoice.id}`
              : `add-choice-${question.id}`;
            break;
          }
        }
      }

      requestAnimationFrame(() => document.getElementById(target)?.focus());
      return;
    }

    setBusy(true);
    try {
      if (activate && !confirmed) {
        const active = (await listSurveys()).find(
          (item) => item.status === "active" && item.id !== routeId,
        );
        if (active) {
          setConfirmActivation(active.title);
          return;
        }
      }

      const savedId = await persist();
      if (activate) {
        await activateSurvey(savedId);
        navigate(`/surveys/${savedId}/present`);
      }
    } catch (reason) {
      setError(mapError(reason));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <LoadingState message="Loading survey..." />;
  if (error?.code === "NOT_FOUND" && loadError)
    return (
      <>
        <h1>Survey not found</h1>
        <p>This survey could not be found.</p>
        <Link to="/dashboard">Back to dashboard</Link>
      </>
    );
  if (error && loadError)
    return (
      <>
        <ErrorState error={error} />
        <p>
          <Link to="/dashboard">Back to dashboard</Link>
        </p>
      </>
    );
  if (survey && survey.status !== "draft")
    return (
      <>
        <h1>Only drafts can be edited</h1>
        <p>Duplicate this survey from the dashboard to make changes.</p>
        <p>
          <Link to={`/surveys/${survey.id}/results`}>View results</Link>
        </p>
        <Link to="/dashboard">Back to dashboard</Link>
      </>
    );

  return (
    <div className="editor">
      <h1>{routeId ? "Edit survey" : "New survey"}</h1>
      {error && <ErrorState error={error} />}
      {showValidation && hasErrors(errors) && (
        <div className="state-error" role="alert">
          Please correct the highlighted fields before saving or activating.
        </div>
      )}
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void submit(false);
        }}
      >
        <fieldset disabled={busy} className="editor-fields">
          <label htmlFor="survey-title">Survey title</label>
          <input
            id="survey-title"
            value={state.title}
            onChange={(event) =>
              change({ type: "title", value: event.target.value })
            }
            aria-invalid={showValidation && Boolean(errors.title)}
            aria-describedby={
              showValidation && errors.title ? "title-error" : undefined
            }
          />
          {showValidation && errors.title && (
            <p className="editor-error" id="title-error">
              {errors.title}
            </p>
          )}
          <label htmlFor="survey-description">Description (optional)</label>
          <textarea
            id="survey-description"
            rows={3}
            value={state.description}
            onChange={(event) =>
              change({ type: "description", value: event.target.value })
            }
          />
          <h2>Questions</h2>
          {showValidation && errors.questions && (
            <p className="editor-error" role="alert">
              {errors.questions}
            </p>
          )}
          {state.questions.map((question, index) => {
            const questionErrors = errors.items[question.id];
            const textId = `question-${question.id}`;
            return (
              <section
                className="editor-card"
                key={question.id}
                aria-labelledby={`${textId}-heading`}
              >
                <h3 id={`${textId}-heading`}>Question {index + 1}</h3>
                <label htmlFor={textId}>Question text</label>
                <input
                  id={textId}
                  value={question.text}
                  onChange={(event) =>
                    change({
                      type: "questionText",
                      id: question.id,
                      value: event.target.value,
                    })
                  }
                  aria-invalid={showValidation && Boolean(questionErrors.text)}
                  aria-describedby={
                    showValidation && questionErrors.text
                      ? `${textId}-error`
                      : undefined
                  }
                />
                {showValidation && questionErrors.text && (
                  <p className="editor-error" id={`${textId}-error`}>
                    {questionErrors.text}
                  </p>
                )}
                <label htmlFor={`${textId}-type`}>Type</label>
                <select
                  id={`${textId}-type`}
                  value={question.type}
                  onChange={(event) =>
                    change({
                      type: "questionType",
                      id: question.id,
                      value: event.target.value as QuestionType,
                    })
                  }
                >
                  <option value="multiple_choice">Multiple Choice</option>
                  <option value="true_false">True / False</option>
                </select>
                <h4>Choices</h4>
                {question.type === "true_false" ? (
                  <p>
                    True
                    <br />
                    False
                  </p>
                ) : (
                  <>
                    {showValidation && questionErrors.choices && (
                      <p className="editor-error">{questionErrors.choices}</p>
                    )}
                    {question.choices.map((choice, choiceIndex) => {
                      const choiceInput = `choice-${choice.id}`;
                      const choiceError =
                        questionErrors.choiceErrors[choice.id];
                      return (
                        <div className="editor-choice" key={choice.id}>
                          <label htmlFor={choiceInput}>
                            Choice {choiceIndex + 1}
                          </label>
                          <input
                            id={choiceInput}
                            value={choice.text}
                            onChange={(event) =>
                              change({
                                type: "choiceText",
                                id: question.id,
                                choiceId: choice.id,
                                value: event.target.value,
                              })
                            }
                            aria-invalid={
                              showValidation && Boolean(choiceError)
                            }
                            aria-describedby={
                              showValidation && choiceError
                                ? `${choiceInput}-error`
                                : undefined
                            }
                          />
                          {showValidation && choiceError && (
                            <p
                              className="editor-error"
                              id={`${choiceInput}-error`}
                            >
                              {choiceError}
                            </p>
                          )}
                          <div className="editor-actions">
                            <Button
                              variant="secondary"
                              disabled={choiceIndex === 0 || busy}
                              onClick={() =>
                                changeAndFocus(
                                  {
                                    type: "moveChoice",
                                    id: question.id,
                                    choiceId: choice.id,
                                    direction: -1,
                                  },
                                  choiceInput,
                                )
                              }
                            >
                              Move up
                            </Button>
                            <Button
                              variant="secondary"
                              disabled={
                                choiceIndex === question.choices.length - 1 ||
                                busy
                              }
                              onClick={() =>
                                changeAndFocus(
                                  {
                                    type: "moveChoice",
                                    id: question.id,
                                    choiceId: choice.id,
                                    direction: 1,
                                  },
                                  choiceInput,
                                )
                              }
                            >
                              Move down
                            </Button>
                            <Button
                              variant="secondary"
                              disabled={busy}
                              onClick={() =>
                                change({
                                  type: "deleteChoice",
                                  id: question.id,
                                  choiceId: choice.id,
                                })
                              }
                            >
                              Delete choice
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                    <Button
                      variant="secondary"
                      disabled={busy}
                      id={`add-choice-${question.id}`}
                      onClick={() => {
                        const choice = { id: id(), text: "" };
                        changeAndFocus(
                          { type: "addChoice", id: question.id, choice },
                          `choice-${choice.id}`,
                        );
                      }}
                    >
                      + Add choice
                    </Button>
                  </>
                )}
                <div className="editor-actions">
                  <Button
                    variant="secondary"
                    disabled={index === 0 || busy}
                    onClick={() =>
                      changeAndFocus(
                        {
                          type: "moveQuestion",
                          id: question.id,
                          direction: -1,
                        },
                        textId,
                      )
                    }
                  >
                    Move question up
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={index === state.questions.length - 1 || busy}
                    onClick={() =>
                      changeAndFocus(
                        { type: "moveQuestion", id: question.id, direction: 1 },
                        textId,
                      )
                    }
                  >
                    Move question down
                  </Button>
                  <Button
                    variant="danger"
                    disabled={busy}
                    onClick={() =>
                      question.text.trim()
                        ? setDeleteId(question.id)
                        : change({ type: "deleteQuestion", id: question.id })
                    }
                  >
                    Delete question
                  </Button>
                </div>
              </section>
            );
          })}
          <div>
            <Button
              variant="secondary"
              disabled={busy}
              id="add-question"
              onClick={() => {
                const question = makeQuestion();
                changeAndFocus(
                  { type: "addQuestion", question },
                  `question-${question.id}`,
                );
              }}
            >
              + Add question
            </Button>
          </div>
          <div className="editor-actions">
            <Button type="submit" disabled={busy}>
              Save Draft
            </Button>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => void submit(true)}
            >
              Activate
            </Button>
          </div>
          <p role="status">{busy ? "Saving..." : saved ? "Saved" : ""}</p>
        </fieldset>
      </form>
      <ConfirmDialog
        open={deleteId !== null}
        title="Delete question?"
        confirmLabel="Delete question"
        confirmVariant="danger"
        onCancel={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) change({ type: "deleteQuestion", id: deleteId });
          setDeleteId(null);
        }}
      >
        This will remove the question and its choices.
      </ConfirmDialog>
      <ConfirmDialog
        open={confirmActivation !== null}
        title="Close the active survey?"
        confirmLabel="Activate survey"
        onCancel={() => setConfirmActivation(null)}
        onConfirm={() => {
          setConfirmActivation(null);
          void submit(true, true);
        }}
      >
        Activating this survey will close “{confirmActivation}”.
      </ConfirmDialog>
    </div>
  );
}
