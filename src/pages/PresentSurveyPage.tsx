import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import QRCode from "qrcode";
import { Button } from "../components/ui/Button";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { ErrorState, LoadingState } from "../components/ui/States";
import { safeFilename } from "../components/results/resultsLogic";
import { closeSurvey, getSurvey } from "../lib/api";
import { getPublicSurveyUrl } from "../lib/publicUrl";
import type { SurveyDetail } from "../types/survey";
import "../components/present/present.css";

export default function PresentSurveyPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [survey, setSurvey] = useState<SurveyDetail | null>(null);
  const [count, setCount] = useState(0);
  const [qr, setQr] = useState("");
  const [error, setError] = useState("");
  const [pollFailed, setPollFailed] = useState(false);
  const [fullscreenError, setFullscreenError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [closing, setClosing] = useState(false);
  const [fullscreen, setFullscreen] = useState(
    Boolean(document.fullscreenElement),
  );
  const publicUrl =
    survey?.status === "active" && survey.public_slug
      ? getPublicSurveyUrl(survey.public_slug)
      : "";

  useEffect(() => {
    let cancelled = false;
    getSurvey(id)
      .then((data) => {
        if (!cancelled) {
          setSurvey(data);
          setCount(data.response_count);
        }
      })
      .catch((err) => {
        if (!cancelled)
          setError(
            (err as { message?: string }).message || "Could not load survey.",
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!publicUrl) return;
    let cancelled = false;
    QRCode.toDataURL(publicUrl, {
      width: 1200,
      margin: 4,
      errorCorrectionLevel: "M",
    })
      .then((data) => {
        if (!cancelled) setQr(data);
      })
      .catch(() => {
        if (!cancelled) setError("Could not generate the QR code.");
      });
    return () => {
      cancelled = true;
    };
  }, [publicUrl]);

  useEffect(() => {
    if (survey?.status !== "active") return;
    let timer: ReturnType<typeof setInterval> | undefined;
    let cancelled = false;
    let requestVersion = 0;

    async function poll() {
      const version = ++requestVersion;
      try {
        const next = await getSurvey(id);
        if (!cancelled && !document.hidden && version === requestVersion) {
          setSurvey(next);
          setCount(next.response_count);
          setPollFailed(false);
          if (next.status !== "active") setConfirming(false);
        }
      } catch {
        if (!cancelled && !document.hidden && version === requestVersion) {
          setPollFailed(true);
        }
      }
    }

    function visibilityChanged() {
      // Ignore responses started before a visibility change or a newer poll.
      requestVersion++;
      if (timer) clearInterval(timer);
      timer = undefined;
      if (!document.hidden) {
        void poll();
        timer = setInterval(() => void poll(), 5000);
      }
    }
    document.addEventListener("visibilitychange", visibilityChanged);
    visibilityChanged();
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      document.removeEventListener("visibilitychange", visibilityChanged);
    };
  }, [id, survey?.status]);

  useEffect(() => {
    const changed = () => {
      setFullscreen(Boolean(document.fullscreenElement));
      setFullscreenError(false);
    };
    document.addEventListener("fullscreenchange", changed);
    return () => document.removeEventListener("fullscreenchange", changed);
  }, []);

  async function toggleFullscreen() {
    setFullscreenError(false);
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      setFullscreenError(true);
    }
  }

  async function close() {
    setClosing(true);
    setError("");
    try {
      await closeSurvey(id);
      navigate(`/surveys/${id}/results`);
    } catch (err) {
      setError(
        (err as { message?: string }).message || "Could not close survey.",
      );
      setConfirming(false);
    } finally {
      setClosing(false);
    }
  }

  return (
    <main className="present-page">
      <Link className="present-back" to="/dashboard">
        ← Dashboard
      </Link>
      {loading && <LoadingState message="Loading survey..." />}
      {error && <ErrorState error={error} />}
      {survey && (
        <>
          <h1>{survey.title}</h1>
          {survey.status !== "active" ? (
            <div className="present-inactive">
              <p>This survey isn't active.</p>
              <Link to={`/surveys/${id}/results`}>View Results</Link> ·{" "}
              <Link to="/dashboard">Back to Dashboard</Link>
            </div>
          ) : (
            <>
              {publicUrl ? (
                <div className="present-join">
                  {qr && (
                    <img
                      className="present-qr"
                      src={qr}
                      alt="QR code for the student survey"
                    />
                  )}
                  <a className="present-url" href={publicUrl}>
                    {publicUrl}
                  </a>
                  <p className="present-count" aria-live="polite">
                    {count} {count === 1 ? "response" : "responses"}
                  </p>
                  {pollFailed && (
                    <p className="present-note" role="status">
                      Couldn’t update the count, retrying.
                    </p>
                  )}
                </div>
              ) : (
                <ErrorState error="This active survey has no public link." />
              )}
              <div className="present-actions">
                <Link
                  className="button button-primary"
                  to={`/surveys/${id}/results`}
                >
                  View Results
                </Link>
                <Button variant="danger" onClick={() => setConfirming(true)}>
                  Close Survey
                </Button>
                {qr && (
                  <a
                    className="button button-secondary"
                    href={qr}
                    download={`${safeFilename(survey.title)}-qr.png`}
                  >
                    Download QR Code
                  </a>
                )}
                <Button
                  variant="secondary"
                  onClick={() => void toggleFullscreen()}
                >
                  {fullscreen ? "Exit Fullscreen" : "Fullscreen"}
                </Button>
              </div>
              {fullscreenError && (
                <p className="present-note" role="status">
                  Fullscreen is unavailable in this browser.{" "}
                  <button
                    type="button"
                    onClick={() => setFullscreenError(false)}
                  >
                    Dismiss
                  </button>
                </p>
              )}
            </>
          )}
        </>
      )}
      <ConfirmDialog
        open={confirming}
        title="Close this survey?"
        confirmLabel="Close Survey"
        confirmVariant="danger"
        busy={closing}
        onConfirm={() => void close()}
        onCancel={() => setConfirming(false)}
      >
        <p>Students will no longer be able to submit responses.</p>
      </ConfirmDialog>
    </main>
  );
}
