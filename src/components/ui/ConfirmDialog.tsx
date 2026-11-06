// Provides an accessible confirmation dialog for instructor actions.
import { useEffect, useId, useRef, type ReactNode } from "react";
import { Button } from "./Button";

export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel = "Confirm",
  confirmVariant = "primary",
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel?: string;
  confirmVariant?: "primary" | "danger";
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onCancel();
      }}
    >
      <h2 id={titleId}>{title}</h2>
      <div id={descriptionId}>{children}</div>
      <div className="dialog-actions">
        <Button
          variant="secondary"
          autoFocus
          disabled={busy}
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button variant={confirmVariant} disabled={busy} onClick={onConfirm}>
          {busy ? "Working..." : confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}
