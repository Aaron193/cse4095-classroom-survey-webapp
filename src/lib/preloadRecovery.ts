// Reload once when a deployed build has removed a lazy-loaded chunk.
const reloadKey = "classroom-survey:preload-reload-at";
const reloadWindowMs = 60_000;

export function handlePreloadError(event: Event): void {
  try {
    const now = Date.now();
    const lastReload = Number(sessionStorage.getItem(reloadKey));
    if (lastReload > 0 && now - lastReload < reloadWindowMs) return;

    // If storage is unavailable, let the error reach the boundary instead of risking a loop.
    sessionStorage.setItem(reloadKey, String(now));
    event.preventDefault();
    window.location.reload();
  } catch {
    // The error boundary offers a manual retry when automatic recovery is unavailable.
  }
}
