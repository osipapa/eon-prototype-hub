import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight, Check, ChevronLeft, Copy, LayoutGrid, Link2, MessageSquare,
  Search, SlidersHorizontal, Sparkles, Upload, X,
} from "lucide-react";
import { createTutorialSteps } from "./tutorial";
import "./tutorial.css";

const ICONS = {
  check: Check,
  message: MessageSquare,
  search: Search,
  sliders: SlidersHorizontal,
  sparkles: Sparkles,
  upload: Upload,
};

const FOCUSABLE = "button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";

export default function FirstRunTutorial({ firstName, isQa = false, onExit }) {
  const steps = useMemo(() => createTutorialSteps(firstName), [firstName]);
  const [stepIndex, setStepIndex] = useState(0);
  const [closing, setClosing] = useState(false);
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);
  const exitTimerRef = useRef(null);
  const step = steps[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === steps.length - 1;
  const Icon = ICONS[step.icon] || Sparkles;

  const requestExit = (reason) => {
    if (closing) return;
    setClosing(true);
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    exitTimerRef.current = window.setTimeout(() => onExit?.(reason), reduceMotion ? 0 : 170);
  };

  const goForward = () => {
    if (isLast) requestExit("complete");
    else setStepIndex((current) => Math.min(current + 1, steps.length - 1));
  };

  useEffect(() => {
    previousFocusRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => {
      dialogRef.current?.querySelector("[data-tutorial-autofocus]")?.focus();
    }, 40);

    return () => {
      window.clearTimeout(focusTimer);
      window.clearTimeout(exitTimerRef.current);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus?.();
    };
  }, []);

  useEffect(() => {
    if (dialogRef.current) dialogRef.current.scrollTop = 0;
  }, [stepIndex]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        requestExit("dismiss");
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        goForward();
        return;
      }
      if (event.key === "ArrowLeft" && stepIndex > 0) {
        event.preventDefault();
        setStepIndex((current) => Math.max(0, current - 1));
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const controls = [...dialogRef.current.querySelectorAll(FOCUSABLE)];
      if (!controls.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [stepIndex, isLast, closing]);

  return (
    <div className={`eon-tutorial-overlay${closing ? " is-closing" : ""}`}>
      <section
        ref={dialogRef}
        className={`eon-tutorial-dialog${isFirst ? " is-welcome" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="eon-tutorial-title"
        aria-describedby="eon-tutorial-description"
      >
        <header className="eon-tutorial-header">
          <div className="eon-tutorial-brand">
            <span className="eon-tutorial-brand-mark" aria-hidden="true"><Sparkles size={15} /></span>
            <span>Quick start</span>
            {isQa && <span className="eon-tutorial-qa" aria-label="QA preview. Completion state will not change.">QA preview</span>}
          </div>
          <button className="eon-tutorial-icon-button" type="button" onClick={() => requestExit("dismiss")} aria-label="Close walkthrough">
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div className="eon-tutorial-body">
          <TutorialVisual kind={step.visual} icon={Icon} />

          <div className="eon-tutorial-copy" key={step.key} aria-live="polite">
            <span className="eon-tutorial-eyebrow">{step.eyebrow}</span>
            <h1 id="eon-tutorial-title">{step.title}</h1>
            <p id="eon-tutorial-description">{step.body}</p>

            {step.tips && (
              <ul className="eon-tutorial-tips">
                {step.tips.map((tip) => (
                  <li key={tip}><span aria-hidden="true"><Check size={12} /></span>{tip}</li>
                ))}
              </ul>
            )}

            {step.callout && (
              <div className="eon-tutorial-callout">
                <Sparkles size={14} aria-hidden="true" />
                <span>{step.callout}</span>
              </div>
            )}
          </div>
        </div>

        <footer className="eon-tutorial-footer">
          <div className="eon-tutorial-progress" aria-label={`Step ${stepIndex + 1} of ${steps.length}`}>
            <span className="eon-tutorial-progress-label">{stepIndex + 1} of {steps.length}</span>
            <span className="eon-tutorial-dots" aria-hidden="true">
              {steps.map((item, index) => <i key={item.key} className={index === stepIndex ? "is-active" : index < stepIndex ? "is-complete" : ""} />)}
            </span>
          </div>

          <div className="eon-tutorial-actions">
            {isFirst ? (
              <button className="eon-tutorial-button is-quiet" type="button" onClick={() => requestExit("skip")}>Skip tour</button>
            ) : (
              <button className="eon-tutorial-button is-secondary" type="button" onClick={() => setStepIndex((current) => Math.max(0, current - 1))}>
                <ChevronLeft size={16} aria-hidden="true" /> Back
              </button>
            )}
            <button data-tutorial-autofocus className="eon-tutorial-button is-primary" type="button" onClick={goForward}>
              {isLast ? "Open workspace" : isFirst ? "Show me around" : "Next"}
              {isLast ? <Check size={16} aria-hidden="true" /> : <ArrowRight size={16} aria-hidden="true" />}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}

function TutorialVisual({ kind, icon: Icon }) {
  return (
    <div className={`eon-tutorial-visual is-${kind}`} aria-hidden="true">
      <span className="eon-tutorial-orb eon-tutorial-orb--one" />
      <span className="eon-tutorial-orb eon-tutorial-orb--two" />
      <div className="eon-tutorial-visual-card">
        <div className="eon-tutorial-visual-topbar">
          <span className="eon-tutorial-window-dots"><i /><i /><i /></span>
          <span className="eon-tutorial-visual-pill" />
        </div>
        <div className="eon-tutorial-visual-layout">
          <div className="eon-tutorial-visual-sidebar">
            <span className="is-wide" /><span /><span className="is-active" /><span /><span />
          </div>
          <div className="eon-tutorial-visual-canvas">
            <span className="eon-tutorial-visual-icon"><Icon size={25} /></span>
            <VisualDetails kind={kind} />
          </div>
        </div>
      </div>
    </div>
  );
}

function VisualDetails({ kind }) {
  if (kind === "controls") {
    return <div className="eon-tutorial-micro-controls"><span><LayoutGrid size={12} /> All states</span><i /><i className="is-selected" /><i /></div>;
  }
  if (kind === "review") {
    return <div className="eon-tutorial-micro-thread"><span /><span className="is-mine" /><span /></div>;
  }
  if (kind === "build") {
    return <div className="eon-tutorial-micro-build"><span><Upload size={12} /> HTML</span><span><Copy size={12} /> Setup prompt</span></div>;
  }
  if (kind === "library") {
    return <div className="eon-tutorial-micro-search"><Search size={12} /><span>Search prototypes</span></div>;
  }
  if (kind === "ready") {
    return <div className="eon-tutorial-micro-ready"><Check size={17} /><span>Ready to explore</span></div>;
  }
  return <div className="eon-tutorial-micro-welcome"><Link2 size={13} /><MessageSquare size={13} /><SlidersHorizontal size={13} /></div>;
}
