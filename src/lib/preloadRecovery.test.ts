import { afterEach, describe, expect, it, vi } from "vitest";
import { handlePreloadError } from "./preloadRecovery";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("preload recovery", () => {
  it("reloads once per time window and lets repeated errors propagate", () => {
    let lastReload: string | null = null;
    const reload = vi.fn();

    vi.useFakeTimers();
    vi.setSystemTime(100_000);
    vi.stubGlobal("sessionStorage", {
      getItem: () => lastReload,
      setItem: (_key: string, value: string) => {
        lastReload = value;
      },
    });
    vi.stubGlobal("window", { location: { reload } });

    const first = new Event("vite:preloadError", { cancelable: true });
    handlePreloadError(first);
    expect(first.defaultPrevented).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);

    const repeated = new Event("vite:preloadError", { cancelable: true });
    handlePreloadError(repeated);
    expect(repeated.defaultPrevented).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(60_000);
    handlePreloadError(new Event("vite:preloadError", { cancelable: true }));
    expect(reload).toHaveBeenCalledTimes(2);
  });

  it("does not reload if storage is unavailable", () => {
    const reload = vi.fn();
    vi.stubGlobal("sessionStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
    });
    vi.stubGlobal("window", { location: { reload } });

    const event = new Event("vite:preloadError", { cancelable: true });
    handlePreloadError(event);
    expect(event.defaultPrevented).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });
});
