// Provides common loading, error, and empty states.
import type { ReactNode } from "react";
import type { AppError } from "../../types/survey";

export function LoadingState({ message = "Loading..." }: { message?: string }) {
  return <p role="status">{message}</p>;
}

export function ErrorState({ error }: { error: AppError | string }) {
  return (
    <div role="alert" className="state-error">
      {typeof error === "string" ? error : error.message}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="empty-state">{children}</div>;
}
