import { useEffect, useState } from "react";

// One clock for every loading screen on the page. The first LoadingScreen to
// mount starts it; later ones read how far in they are, so the drafting
// animation plays once. The app also holds the loading screen up until the
// sequence has finished, so the mark is always seen complete.
export const LOADER_SEQUENCE_MS = 2000;

let startedAt = null;
const listeners = new Set();

/** Start the clock if needed; returns ms since it started. */
export function loaderElapsed() {
  if (startedAt === null) {
    startedAt = performance.now();
    // Tell holders after this render, not during it.
    queueMicrotask(() => listeners.forEach((notify) => notify()));
  }
  return Math.round(performance.now() - startedAt);
}

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** True from the moment a loading screen first shows until its sequence ends. */
export function useLoaderHold() {
  const [, rerender] = useState(0);
  const remaining = startedAt === null || reducedMotion() ? 0 : startedAt + LOADER_SEQUENCE_MS - performance.now();

  useEffect(() => {
    const notify = () => rerender((n) => n + 1);
    listeners.add(notify);
    return () => listeners.delete(notify);
  }, []);

  useEffect(() => {
    if (remaining <= 0) return undefined;
    const id = window.setTimeout(() => rerender((n) => n + 1), remaining);
    return () => window.clearTimeout(id);
  });

  return remaining > 0;
}
