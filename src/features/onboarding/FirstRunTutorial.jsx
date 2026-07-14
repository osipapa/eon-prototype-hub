import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight, Check, ChevronLeft, MessageSquare, Monitor, PanelLeftOpen,
  SlidersHorizontal, Sparkles, X,
} from "lucide-react";
import { createTutorialSteps } from "./tutorial";
import "./tutorial.css";

const ICONS = {
  library: PanelLeftOpen,
  prototype: Monitor,
  review: MessageSquare,
  sliders: SlidersHorizontal,
  sparkles: Sparkles,
};

const FOCUSABLE = "button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), iframe, [tabindex]:not([tabindex='-1'])";
const EDGE = 12;
const GAP = 14;

export default function FirstRunTutorial({ firstName, isQa = false, onExit }) {
  const steps = useMemo(() => createTutorialSteps(firstName), [firstName]);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [coachSize, setCoachSize] = useState({ width: 330, height: 210 });
  const [closing, setClosing] = useState(false);
  const coachRef = useRef(null);
  const targetRef = useRef(null);
  const previousFocusRef = useRef(null);
  const exitTimerRef = useRef(null);
  const step = steps[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === steps.length - 1;
  const Icon = ICONS[step.icon] || Sparkles;

  const requestExit = useCallback((reason) => {
    if (closing) return;
    setClosing(true);
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    exitTimerRef.current = window.setTimeout(() => onExit?.(reason), reduceMotion ? 0 : 150);
  }, [closing, onExit]);

  const locateTarget = useCallback(() => {
    const target = findVisibleTarget(step.targets);
    targetRef.current = target;
    if (!target) {
      setTargetRect(null);
      return;
    }

    const raw = target.getBoundingClientRect();
    if (raw.top < 0 || raw.bottom > window.innerHeight || raw.left < 0 || raw.right > window.innerWidth) {
      target.scrollIntoView({
        block: "nearest",
        inline: "nearest",
        behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      });
    }

    const pad = step.key === "prototype" ? 6 : 8;
    setTargetRect(rectWithPadding(target.getBoundingClientRect(), pad));
  }, [step]);

  const closeWorkspaceDrawers = () => {
    document.querySelectorAll(".eon-sidebar[role='dialog'] [data-drawer-close], .eon-inspector[role='dialog'] [data-drawer-close]")
      .forEach((button) => button.click());
  };

  const goToStep = (nextIndex) => {
    closeWorkspaceDrawers();
    setStepIndex(Math.max(0, Math.min(nextIndex, steps.length - 1)));
  };

  const goForward = useCallback(() => {
    if (isLast) requestExit("complete");
    else goToStep(stepIndex + 1);
  }, [isLast, requestExit, stepIndex]);

  useEffect(() => {
    previousFocusRef.current = document.activeElement;
    return () => {
      window.clearTimeout(exitTimerRef.current);
      previousFocusRef.current?.focus?.();
    };
  }, []);

  useEffect(() => {
    let followFrame;
    let followTimer;
    const frame = window.requestAnimationFrame(() => {
      const reveal = step.key === "library"
        ? { panel: '[data-tutorial="prototype-library"]', trigger: '[data-tutorial="nav-toggle"]' }
        : step.key === "review"
          ? { panel: '[data-tutorial="review-panel"]', trigger: '[data-tutorial="review-toggle"]' }
          : null;
      if (reveal && !findVisibleTarget([reveal.panel])) {
        const trigger = findVisibleTarget([reveal.trigger]);
        if (trigger?.getAttribute("aria-pressed") !== "true") trigger?.click();
        followFrame = window.requestAnimationFrame(locateTarget);
        const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
        followTimer = window.setTimeout(locateTarget, reduceMotion ? 0 : 260);
        return;
      }
      locateTarget();
    });
    const afterInteraction = () => window.requestAnimationFrame(locateTarget);
    const onGeometryChange = () => locateTarget();
    window.addEventListener("resize", onGeometryChange);
    window.addEventListener("scroll", onGeometryChange, true);
    document.addEventListener("click", afterInteraction, true);

    const mutationObserver = typeof MutationObserver !== "undefined"
      ? new MutationObserver(() => window.requestAnimationFrame(locateTarget))
      : null;
    mutationObserver?.observe(document.body, { childList: true, subtree: true });

    const targetObserver = targetRef.current && typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(locateTarget)
      : null;
    if (targetObserver && targetRef.current) targetObserver.observe(targetRef.current);

    return () => {
      window.cancelAnimationFrame(frame);
      if (followFrame) window.cancelAnimationFrame(followFrame);
      if (followTimer) window.clearTimeout(followTimer);
      window.removeEventListener("resize", onGeometryChange);
      window.removeEventListener("scroll", onGeometryChange, true);
      document.removeEventListener("click", afterInteraction, true);
      mutationObserver?.disconnect();
      targetObserver?.disconnect();
    };
  }, [locateTarget, step.key]);

  useEffect(() => {
    const coach = coachRef.current;
    if (!coach || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setCoachSize((current) => current.width === width && current.height === height
        ? current
        : { width, height });
    });
    observer.observe(coach);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const focusTimer = window.setTimeout(() => {
      coachRef.current?.querySelector("[data-tutorial-autofocus]")?.focus();
    }, 60);
    return () => window.clearTimeout(focusTimer);
  }, [stepIndex]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        requestExit("dismiss");
        return;
      }
      const isTyping = ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName);
      if (!isTyping && event.key === "ArrowRight") {
        event.preventDefault();
        goForward();
        return;
      }
      if (!isTyping && event.key === "ArrowLeft" && stepIndex > 0) {
        event.preventDefault();
        goToStep(stepIndex - 1);
        return;
      }
      if (event.key !== "Tab") return;
      const controls = tutorialFocusables(coachRef.current, targetRef.current);
      if (!controls.length) return;
      const currentIndex = controls.indexOf(document.activeElement);
      if (event.shiftKey && currentIndex <= 0) {
        event.preventDefault();
        controls.at(-1)?.focus();
      } else if (!event.shiftKey && (currentIndex === controls.length - 1 || currentIndex === -1)) {
        event.preventDefault();
        controls[0]?.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goForward, requestExit, stepIndex]);

  const position = placeCoach(targetRect, step.placement, coachSize);
  const hole = targetRect && scrimGeometry(targetRect);

  return (
    <div className={`eon-coach-root${targetRect ? " is-ready" : ""}${closing ? " is-closing" : ""}`}>
      {hole && (
        <>
          <div className="eon-coach-scrim is-top" style={hole.top} />
          <div className="eon-coach-scrim is-left" style={hole.left} />
          <div className="eon-coach-scrim is-right" style={hole.right} />
          <div className="eon-coach-scrim is-bottom" style={hole.bottom} />
          <div className="eon-coach-spotlight" style={hole.spotlight} aria-hidden="true" />
        </>
      )}

      <section
        ref={coachRef}
        className="eon-coach-card"
        data-side={position.side}
        style={{ left: position.left, top: position.top }}
        role="dialog"
        aria-labelledby="eon-coach-title"
        aria-describedby="eon-coach-description"
      >
        <header className="eon-coach-header">
          <span className="eon-coach-icon" aria-hidden="true"><Icon size={15} /></span>
          <span className="eon-coach-eyebrow">{step.eyebrow}</span>
          {isQa && <span className="eon-coach-qa" aria-label="QA preview. Completion state will not change.">QA</span>}
          <button className="eon-coach-close" type="button" onClick={() => requestExit("dismiss")} aria-label="Close walkthrough">
            <X size={17} aria-hidden="true" />
          </button>
        </header>

        <div className="eon-coach-copy" key={step.key} aria-live="polite">
          <h1 id="eon-coach-title">{step.title}</h1>
          <p id="eon-coach-description">{step.body}</p>
          {step.interactive && (
            <span className="eon-coach-try"><Sparkles size={12} aria-hidden="true" /> Try the highlighted area now</span>
          )}
        </div>

        <footer className="eon-coach-footer">
          <div className="eon-coach-progress" aria-label={`Step ${stepIndex + 1} of ${steps.length}`}>
            <span>{stepIndex + 1}/{steps.length}</span>
            <div aria-hidden="true">{steps.map((item, index) => <i key={item.key} className={index === stepIndex ? "is-active" : index < stepIndex ? "is-complete" : ""} />)}</div>
          </div>
          <div className="eon-coach-actions">
            {isFirst ? (
              <button className="eon-coach-button is-quiet" type="button" onClick={() => requestExit("skip")}>Skip</button>
            ) : (
              <button className="eon-coach-button is-secondary" type="button" onClick={() => goToStep(stepIndex - 1)} aria-label="Previous tutorial step">
                <ChevronLeft size={16} aria-hidden="true" />
              </button>
            )}
            <button data-tutorial-autofocus className="eon-coach-button is-primary" type="button" onClick={goForward}>
              {isLast ? "Done" : isFirst ? "Start" : "Next"}
              {isLast ? <Check size={16} aria-hidden="true" /> : <ArrowRight size={16} aria-hidden="true" />}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}

function findVisibleTarget(selectors = []) {
  for (const selector of selectors) {
    const nodes = [...document.querySelectorAll(selector)];
    const visible = nodes.find((node) => {
      const rect = node.getBoundingClientRect();
      const style = window.getComputedStyle(node);
      return rect.width > 0 && rect.height > 0
        && rect.bottom > 0 && rect.right > 0
        && rect.top < window.innerHeight && rect.left < window.innerWidth
        && style.display !== "none" && style.visibility !== "hidden";
    });
    if (visible) return visible;
  }
  return null;
}

function rectWithPadding(rect, padding) {
  const left = Math.max(4, rect.left - padding);
  const top = Math.max(4, rect.top - padding);
  const right = Math.min(window.innerWidth - 4, rect.right + padding);
  const bottom = Math.min(window.innerHeight - 4, rect.bottom + padding);
  return { left, top, right, bottom, width: right - left, height: bottom - top };
}

function scrimGeometry(rect) {
  return {
    top: { left: 0, top: 0, width: "100vw", height: rect.top },
    left: { left: 0, top: rect.top, width: rect.left, height: rect.height },
    right: { left: rect.right, top: rect.top, width: Math.max(0, window.innerWidth - rect.right), height: rect.height },
    bottom: { left: 0, top: rect.bottom, width: "100vw", height: Math.max(0, window.innerHeight - rect.bottom) },
    spotlight: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
  };
}

function placeCoach(rect, preferred, size) {
  const width = Math.min(size.width || 330, window.innerWidth - EDGE * 2);
  const height = Math.min(size.height || 210, window.innerHeight - EDGE * 2);
  if (!rect) return { left: Math.max(EDGE, (window.innerWidth - width) / 2), top: Math.max(EDGE, (window.innerHeight - height) / 2), side: "center" };

  const candidates = [preferred, "bottom", "top", "right", "left"].filter((item, index, list) => item && list.indexOf(item) === index);
  for (const side of candidates) {
    if (side === "bottom" && window.innerHeight - rect.bottom >= height + GAP) {
      return { left: clamp(rect.left + rect.width / 2 - width / 2, EDGE, window.innerWidth - width - EDGE), top: rect.bottom + GAP, side };
    }
    if (side === "top" && rect.top >= height + GAP) {
      return { left: clamp(rect.left + rect.width / 2 - width / 2, EDGE, window.innerWidth - width - EDGE), top: rect.top - height - GAP, side };
    }
    if (side === "right" && window.innerWidth - rect.right >= width + GAP) {
      return { left: rect.right + GAP, top: clamp(rect.top + rect.height / 2 - height / 2, EDGE, window.innerHeight - height - EDGE), side };
    }
    if (side === "left" && rect.left >= width + GAP) {
      return { left: rect.left - width - GAP, top: clamp(rect.top + rect.height / 2 - height / 2, EDGE, window.innerHeight - height - EDGE), side };
    }
  }

  return {
    left: clamp(window.innerWidth - width - EDGE, EDGE, window.innerWidth - width - EDGE),
    top: clamp(rect.top + 16, EDGE, window.innerHeight - height - EDGE),
    side: "inside",
  };
}

function tutorialFocusables(coach, target) {
  const items = [];
  if (target?.matches?.(FOCUSABLE)) items.push(target);
  if (target) items.push(...target.querySelectorAll(FOCUSABLE));
  if (coach) items.push(...coach.querySelectorAll(FOCUSABLE));
  return [...new Set(items)].filter((node) => {
    const rect = node.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}
