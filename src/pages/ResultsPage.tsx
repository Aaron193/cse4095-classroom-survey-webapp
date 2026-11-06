import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ResponsiveContainer } from "recharts";
import { ResultsBarChart } from "../components/results/ResultsBarChart";
import { Button } from "../components/ui/Button";
import { ErrorState, LoadingState } from "../components/ui/States";
import { StatusBadge } from "../components/ui/StatusBadge";
import {
  buildCsv,
  chartData,
  safeFilename,
} from "../components/results/resultsLogic";
import { getSurvey, getSurveyExport, getSurveyResults } from "../lib/api";
import type { SurveyDetail, SurveyResults } from "../types/survey";
import "../components/results/results.css";

export default function ResultsPage() {
  const { id = "" } = useParams();
  const [survey, setSurvey] = useState<SurveyDetail | null>(null);
  const [results, setResults] = useState<SurveyResults | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  const [exporting, setExporting] = useState(false);

  const refresh = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const [nextSurvey, nextResults] = await Promise.all([
        getSurvey(id),
        getSurveyResults(id),
      ]);
      setSurvey(nextSurvey);
      setResults(nextResults);
    } catch (err) {
      setError(
        (err as { message?: string }).message || "Could not load results.",
      );
    } finally {
      setBusy(false);
    }
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getSurvey(id), getSurveyResults(id)])
      .then(([nextSurvey, nextResults]) => {
        if (!cancelled) {
          setSurvey(nextSurvey);
          setResults(nextResults);
        }
      })
      .catch((err) => {
        if (!cancelled)
          setError(
            (err as { message?: string }).message || "Could not load results.",
          );
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function exportCsv() {
    setExporting(true);
    setError("");
    try {
      const data = await getSurveyExport(id);
      const url = URL.createObjectURL(
        new Blob([buildCsv(data)], { type: "text/csv;charset=utf-8" }),
      );
      const link = document.createElement("a");
      link.href = url;
      const today = new Date();
      const date = [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, "0"),
        String(today.getDate()).padStart(2, "0"),
      ].join("-");
      link.download = `${safeFilename(data.title)}-${date}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(
        (err as { message?: string }).message || "Could not export results.",
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="results-page">
      <Link to="/dashboard">← Back to Dashboard</Link>
      {error && <ErrorState error={error} />}
      {!results || !survey ? (
        busy ? (
          <LoadingState message="Loading results..." />
        ) : null
      ) : (
        <>
          <header className="results-heading">
            <div>
              <h1>{results.title}</h1>
              <StatusBadge status={survey.status} />{" "}
              <strong>
                {results.response_count}{" "}
                {results.response_count === 1 ? "response" : "responses"}
              </strong>
            </div>
          </header>
          <div className="results-actions">
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => void refresh()}
            >
              {busy ? "Refreshing..." : "Refresh"}
            </Button>
            <Button
              variant="secondary"
              disabled={exporting}
              onClick={() => void exportCsv()}
            >
              {exporting ? "Exporting..." : "Export CSV"}
            </Button>
            {survey.status === "active" && (
              <Link
                className="button button-primary"
                to={`/surveys/${id}/present`}
              >
                Present QR
              </Link>
            )}
          </div>
          {results.response_count === 0 && (
            <p className="results-empty">
              No responses yet. Display the QR code so students can join.
            </p>
          )}
          {results.questions.map((question) => (
            <section className="results-question" key={question.question_id}>
              <h2>{question.question_text}</h2>
              {question.response_count === 0 && (
                <p>No answers to this question yet.</p>
              )}
              {chartData(question).map((choice) => (
                <div className="results-choice" key={choice.choice_id}>
                  <div className="results-choice-label">
                    <span>{choice.choice_text}</span>
                    <strong>
                      {choice.count} · {choice.percentage.toFixed(1)}%
                    </strong>
                  </div>
                  <div aria-hidden="true" className="results-bar">
                    <ResponsiveContainer width="100%" height={20}>
                      <ResultsBarChart percentage={choice.percentage} />
                    </ResponsiveContainer>
                  </div>
                </div>
              ))}
            </section>
          ))}
        </>
      )}
    </div>
  );
}
