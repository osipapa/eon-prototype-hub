import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CHECK_HEIGHT, CHECK_VERSION, CHECK_WIDTH, injectCheckBridge } from "./checkBridge";
import { currentArgs, renderStory, stateCombos } from "./prototypes";

/* Automatic checks: render every state at phone width in light and dark,
   collect what the check bridge measures, and merge the same problem across
   renders. Results are saved per prototype (prototype_checks) so one teammate's
   run serves the whole team; a new hash means the HTML, the states, or the
   checks changed, and the next desktop that opens the prototype re-runs. */

export const CHECK_KINDS = [
  { kind: "overflow", title: "Sticks out at 360px" },
  { kind: "field", title: "Fields under 16px" },
  { kind: "target", title: "Tap targets under 44px" },
  { kind: "contrast", title: "Low contrast" },
];

// Words that suggest a state covers each case, matched against the declared
// control keys, labels, and options.
const STATE_KINDS = {
  empty: /empty|none|no[-_ ]|zero|blank|first[-_ ]?(run|time|use)/i,
  error: /error|fail|invalid|declin|denied|offline|problem|broken|expired/i,
  loading: /load|skeleton|pending|spinner|progress|busy|sync/i,
};

// Hidden renders get no modals or popups: an alert() there would stop the user.
const CHECK_SANDBOX = "allow-scripts allow-forms";
const THEMES = ["light", "dark"];

function cyrb53(text) {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    h1 = Math.imul(h1 ^ code, 2654435761);
    h2 = Math.imul(h2 ^ code, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

export function checksHash(story) {
  return cyrb53(JSON.stringify([
    CHECK_VERSION,
    story.prototype_html || `builtin:${story.slug}`,
    story.controls || [],
    story.defaults || {},
  ]));
}

export function missingStates(story) {
  const names = (story.controls || [])
    .flatMap((control) => [control.key, control.label, ...(control.options || [])])
    .filter(Boolean)
    .map(String);
  return Object.keys(STATE_KINDS).filter((kind) => !names.some((name) => STATE_KINDS[kind].test(name)));
}

export function issueCount(results) {
  if (!results) return 0;
  return (results.issues?.length || 0) + (results.missing?.length ? 1 : 0);
}

// Frames in a hidden tab never get their size, so renders wait for the tab.
function whenVisible(signal) {
  if (document.visibilityState === "visible") return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      if (document.visibilityState !== "visible" && !signal?.aborted) return;
      document.removeEventListener("visibilitychange", done);
      signal?.removeEventListener("abort", done);
      resolve();
    };
    document.addEventListener("visibilitychange", done);
    signal?.addEventListener("abort", done);
  });
}

function renderOnce(html, signal) {
  return new Promise((resolve) => {
    const frame = document.createElement("iframe");
    frame.setAttribute("sandbox", CHECK_SANDBOX);
    frame.setAttribute("aria-hidden", "true");
    frame.setAttribute("title", "Prototype check");
    frame.tabIndex = -1;
    frame.style.cssText = `position:fixed;top:0;left:-10000px;width:${CHECK_WIDTH}px;height:${CHECK_HEIGHT}px;border:0;pointer-events:none;`;
    let done = false;
    let settleTimer;
    const finish = (issues) => {
      if (done) return;
      done = true;
      clearTimeout(timeout);
      clearTimeout(settleTimer);
      window.removeEventListener("message", onMessage);
      signal?.removeEventListener("abort", onAbort);
      frame.remove();
      resolve(issues);
    };
    const onMessage = (event) => {
      if (event.source !== frame.contentWindow || event.data?.eon !== 1) return;
      if (event.data.type === "eon-check-ready") {
        // Give entrance animations and late layout a moment to settle.
        settleTimer = setTimeout(() => frame.contentWindow?.postMessage({ eon: 1, type: "eon-check-run" }, "*"), 450);
      } else if (event.data.type === "eon-check-result") {
        finish(Array.isArray(event.data.issues) ? event.data.issues : []);
      }
    };
    const onAbort = () => finish(null);
    const timeout = setTimeout(() => finish(null), 9000);
    window.addEventListener("message", onMessage);
    signal?.addEventListener("abort", onAbort);
    frame.srcdoc = injectCheckBridge(html);
    document.body.appendChild(frame);
  });
}

// Every state in light and dark, two renders at a time.
export async function runPrototypeChecks(story, media, { signal, onProgress } = {}) {
  const combos = stateCombos(story) || [{}];
  const jobs = combos.flatMap((combo) => THEMES.map((theme) => ({ combo, theme })));
  const merged = new Map();
  let failed = 0;
  let finished = 0;
  let next = 0;
  const worker = async () => {
    while (next < jobs.length && !signal?.aborted) {
      const job = jobs[next];
      next += 1;
      await whenVisible(signal);
      if (signal?.aborted) break;
      const issues = await renderOnce(renderStory(story, job.theme, media, currentArgs(story, job.combo)), signal);
      finished += 1;
      onProgress?.(finished, jobs.length);
      if (!issues) { failed += 1; continue; }
      issues.forEach((issue) => {
        const key = `${issue.kind}|${issue.selector}`;
        const where = { args: job.combo, theme: job.theme };
        const existing = merged.get(key);
        if (!existing) merged.set(key, { ...issue, where: [where] });
        else {
          existing.where.push(where);
          if (issue.kind === "contrast" && issue.value < existing.value) Object.assign(existing, { detail: issue.detail, value: issue.value });
        }
      });
    }
  };
  await Promise.all([worker(), worker()]);
  if (signal?.aborted) return null;
  const order = CHECK_KINDS.map((item) => item.kind);
  const issues = [...merged.values()].sort((a, b) =>
    order.indexOf(a.kind) - order.indexOf(b.kind) || b.where.length - a.where.length);
  return {
    version: CHECK_VERSION,
    width: CHECK_WIDTH,
    renders: jobs.length,
    failed,
    issues,
    missing: missingStates(story),
  };
}

/* Results for one prototype: the saved row when it matches the current hash,
   otherwise a fresh run (automatic on desktop). A failed save (for example,
   before the prototype_checks migration) keeps the run in this browser. */
export function usePrototypeChecks({ story, media, saved, onSave, auto }) {
  const hash = useMemo(() => (story ? checksHash(story) : null), [story]);
  const [local, setLocal] = useState(null);
  const [progress, setProgress] = useState(null);
  const controllerRef = useRef(null);
  const storyRef = useRef(story);
  const mediaRef = useRef(media);
  const saveRef = useRef(onSave);
  storyRef.current = story;
  mediaRef.current = media;
  saveRef.current = onSave;

  const current = saved?.hash === hash ? saved
    : local?.project_id === story?.id && local?.hash === hash ? local : null;

  const run = useCallback(async () => {
    const target = storyRef.current;
    if (!target) return;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const runHash = checksHash(target);
    setProgress({ done: 0, total: 0 });
    try {
      const results = await runPrototypeChecks(target, mediaRef.current, {
        signal: controller.signal,
        onProgress: (done, total) => { if (!controller.signal.aborted) setProgress({ done, total }); },
      });
      if (!results || controller.signal.aborted) return;
      const row = { project_id: target.id, hash: runHash, results, checked_at: new Date().toISOString() };
      setLocal(row);
      // A run where nothing loaded says nothing about the prototype; keep it
      // out of the team's results so the next open tries again.
      if (results.failed === results.renders) return;
      try { await saveRef.current?.(target.id, runHash, results); }
      catch (error) { console.warn("Check results stay in this browser until they can be saved.", error); }
    } finally {
      if (controllerRef.current === controller) {
        controllerRef.current = null;
        setProgress(null);
      }
    }
  }, []);

  // A different prototype (or a new version of this one) cancels a run.
  useEffect(() => () => controllerRef.current?.abort(), [story?.id, hash]);

  // Background tabs wait until they're looked at.
  useEffect(() => {
    if (!auto || !hash || current) return undefined;
    let timer;
    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (document.visibilityState === "visible" && !controllerRef.current) run();
      }, 1500);
    };
    const onVisibility = () => { if (document.visibilityState === "visible") schedule(); };
    schedule();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [auto, hash, current, run]);

  return {
    results: current?.results || null,
    checkedAt: current?.checked_at || null,
    // Results from an older version, shown while the new run is going.
    outdated: !current && saved?.results ? saved.results : null,
    running: progress,
    run,
  };
}
