import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  activateSurvey,
  archiveSurvey,
  closeSurvey,
  deleteSurvey,
  duplicateSurvey,
  listSurveys,
} from "../lib/api";
import type { AppError, SurveyStatus, SurveySummary } from "../types/survey";
import { Button } from "../components/ui/Button";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { EmptyState, ErrorState, LoadingState } from "../components/ui/States";
import { StatusBadge } from "../components/ui/StatusBadge";
import {
  actionsForStatus,
  filterAndSortSurveys,
  type SurveyAction,
} from "../components/dashboard/dashboardLogic";
import "../components/dashboard/dashboard.css";

const labels: Record<SurveyAction, string> = {
  edit: "Edit",
  activate: "Activate",
  present: "Present",
  results: "Results",
  close: "Close",
  duplicate: "Duplicate",
  archive: "Archive",
  delete: "Delete",
};

type ConfirmAction = "activate" | "close" | "archive" | "delete";

function errorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    "code" in error
  ) {
    return (error as AppError).message;
  }

  return "Something went wrong. Please try again.";
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [surveys, setSurveys] = useState<SurveySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState<{
    action: ConfirmAction;
    survey: SurveySummary;
  } | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<SurveyStatus | "all">("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const reload = useCallback(async () => {
    const data = await listSurveys();
    setSurveys(data);
  }, []);

  useEffect(() => {
    // Ignore the initial request if the page is no longer mounted.
    let mounted = true;
    listSurveys()
      .then((data) => {
        if (mounted) setSurveys(data);
      })
      .catch((err: unknown) => {
        if (mounted) setError(errorMessage(err));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  async function perform(
    action: ConfirmAction | "duplicate",
    survey: SurveySummary,
  ) {
    setBusy(true);
    setError("");

    try {
      let destination = "";

      if (action === "duplicate") {
        const copy = await duplicateSurvey(survey.id);
        destination = `/surveys/${copy.survey_id}/edit`;
      } else if (action === "activate") {
        await activateSurvey(survey.id);
        destination = `/surveys/${survey.id}/present`;
      } else if (action === "close") {
        await closeSurvey(survey.id);
      } else if (action === "archive") {
        await archiveSurvey(survey.id);
      } else {
        await deleteSurvey(survey.id);
      }

      setConfirmation(null);
      await reload();
      if (destination) navigate(destination);
    } catch (err) {
      setConfirmation(null);
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const visible = filterAndSortSurveys(surveys, { search, status, from, to });
  const active = surveys.find((survey) => survey.status === "active");

  return (
    <div className="dashboard">
      <div className="dashboard-heading">
        <h1>Dashboard</h1>
        <Link className="button button-primary" to="/surveys/new">
          New Survey
        </Link>
      </div>
      {error && <ErrorState error={error} />}
      {loading ? (
        <LoadingState message="Loading surveys..." />
      ) : (
        <>
          {surveys.length > 0 && (
            <div className="dashboard-filters">
              <label>
                Search by title
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
              <label>
                Status
                <select
                  value={status}
                  onChange={(event) =>
                    setStatus(event.target.value as SurveyStatus | "all")
                  }
                >
                  <option value="all">All</option>
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="closed">Closed</option>
                  <option value="archived">Archived</option>
                </select>
              </label>
              <label>
                Created from
                <input
                  type="date"
                  value={from}
                  onChange={(event) => setFrom(event.target.value)}
                />
              </label>
              <label>
                Created to
                <input
                  type="date"
                  value={to}
                  onChange={(event) => setTo(event.target.value)}
                />
              </label>
            </div>
          )}
          {surveys.length === 0 && !error ? (
            <EmptyState>
              <p>You have not created any surveys yet.</p>
              <Link className="button button-primary" to="/surveys/new">
                Create Your First Survey
              </Link>
            </EmptyState>
          ) : surveys.length > 0 && visible.length === 0 ? (
            <EmptyState>No surveys match your search.</EmptyState>
          ) : (
            <div className="dashboard-list">
              {visible.map((survey) => (
                <article className="dashboard-card" key={survey.id}>
                  <div className="dashboard-card-heading">
                    <h2>{survey.title}</h2>
                    <StatusBadge status={survey.status} />
                  </div>
                  <p>
                    Created:{" "}
                    {new Date(survey.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}{" "}
                    · {survey.response_count}{" "}
                    {survey.response_count === 1 ? "response" : "responses"}
                  </p>
                  <div className="dashboard-actions">
                    {actionsForStatus(survey.status).map((action) => {
                      const label = labels[action];
                      if (
                        action === "edit" ||
                        action === "present" ||
                        action === "results"
                      )
                        return (
                          <Link
                            key={action}
                            aria-label={`${label} ${survey.title}`}
                            className="button button-secondary"
                            to={`/surveys/${survey.id}/${action}`}
                          >
                            {label}
                          </Link>
                        );
                      return (
                        <Button
                          key={action}
                          variant={action === "delete" ? "danger" : "secondary"}
                          aria-label={`${label} ${survey.title}`}
                          disabled={busy}
                          onClick={() =>
                            action === "duplicate"
                              ? void perform(action, survey)
                              : setConfirmation({ action, survey })
                          }
                        >
                          {label}
                        </Button>
                      );
                    })}
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
      <ConfirmDialog
        open={confirmation !== null}
        title={
          confirmation
            ? `${labels[confirmation.action]} “${confirmation.survey.title}”?`
            : "Confirm action"
        }
        confirmLabel={confirmation ? labels[confirmation.action] : "Confirm"}
        confirmVariant={
          confirmation?.action === "delete" || confirmation?.action === "close"
            ? "danger"
            : "primary"
        }
        busy={busy}
        onCancel={() => setConfirmation(null)}
        onConfirm={() => {
          if (confirmation)
            void perform(confirmation.action, confirmation.survey);
        }}
      >
        {confirmation?.action === "activate" && (
          <p>
            {active
              ? `“${active.title}” is currently active and will be closed.`
              : "This survey will become active."}
          </p>
        )}
        {confirmation?.action === "close" && (
          <p>Students will no longer be able to submit responses.</p>
        )}
        {confirmation?.action === "archive" && (
          <p>The survey and its responses will be preserved.</p>
        )}
        {confirmation?.action === "delete" && (
          <p>
            {confirmation.survey.response_count > 0
              ? `This permanently deletes ${confirmation.survey.response_count} ${confirmation.survey.response_count === 1 ? "response" : "responses"}. Archive the survey instead to preserve them.`
              : "This permanently deletes the survey."}
          </p>
        )}
      </ConfirmDialog>
    </div>
  );
}
