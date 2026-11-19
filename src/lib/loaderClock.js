import { useEffect, useState } from "react";

// One clock for every loading screen on the page. The first LoadingScreen to
// mount starts it; later ones read how far in they are, so the drafting
// animation plays once. The app keeps one loading screen over the page while
// any loading screen is showing and until the sequence has finished, so the
// mark is always seen complete and the handover to the page is one animated
// exit, not a cut.
export const LOADER_SEQUENCE_MS = 2000;
export const LOADER_EXIT_MS = 850;

let startedAt = null;
let showing = 0;
const listeners = new Set();
const notifyAll = () => queueMicrotask(() => listeners.forEach((notify) => notify()));

/** Start the clock if needed; returns ms since it started. */
export function loaderElapsed() {
  if (startedAt === null) {
    startedAt = performance.now();
    // Tell the app after this render, not during it.
    notifyAll();
  }
  return Math.round(performance.now() - startedAt);
}

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** A page-level loading screen reports that it is on screen. */
export function useLoaderPresence(enabled = true) {
  useEffect(() => {
    if (!enabled) return undefined;
    showing += 1;
    notifyAll();
    return () => {
      showing -= 1;
      notifyAll();
    };
  }, [enabled]);
}

/** True while a loading screen is showing or its opening sequence is still playing. */
export function useLoaderUp() {
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

  return showing > 0 || remaining > 0;
}
