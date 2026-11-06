// Displays a survey status using both text and color.
import type { SurveyStatus } from "../../types/survey";

export function StatusBadge({ status }: { status: SurveyStatus }) {
  return (
    <span className={`badge badge-${status}`}>
      {status[0].toUpperCase() + status.slice(1)}
    </span>
  );
}
