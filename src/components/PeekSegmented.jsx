import { useLayoutEffect, useRef, useState } from "react";

/* A segmented control with more options than the canvas has room for.

   Collapsed, it shows the current selection centred with its neighbours
   peeking in and fading out at both edges, so a nine-state prototype costs
   about the width of three. Hover (or keyboard focus) opens it to full width.

   The control inside is untouched: this only windows and slides it, so the
   liquid indicator, selection, and arrow-key navigation keep working. */

const PEEK = 44;      // how much of the neighbours stays visible
const FADE = 28;      // width of the edge fade
const WORTH_IT = 28;  // below this saving, stay expanded and skip the effect
const RESERVED = 96;   // the bar's own margins and padding

export default function PeekSegmented({ value, optionsKey, surface, enabled = true, onOpenChange, children }) {
  const trackRef = useRef(null);
  const scrollRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [metrics, setMetrics] = useState(null);

  const setOpenState = (next) => {
    setOpen(next);
    onOpenChange?.(next);
  };

  useLayoutEffect(() => {
    if (!enabled) { setMetrics(null); return undefined; }

    const measure = () => {
      const shell = trackRef.current?.firstElementChild;
      const active = trackRef.current?.querySelector('.eon-liquid-segment-button[aria-pressed="true"]');
      if (!shell || !active) return;

      const shellRect = shell.getBoundingClientRect();
      const activeRect = active.getBoundingClientRect();
      const full = shellRect.width;
      const collapsed = Math.min(full, activeRect.width + PEEK * 2);
      if (full - collapsed < WORTH_IT) { setMetrics(null); return; }

      // The bar lifts clear of the zoom cluster while it is open, so the only
      // horizontal limit is the canvas itself.
      const zone = trackRef.current?.closest(".eon-canvas-zone");
      const room = Math.max(collapsed, (zone?.clientWidth ?? window.innerWidth) - RESERVED);
      const expanded = Math.min(full, room);
      const centre = activeRect.left - shellRect.left + activeRect.width / 2;
      const offset = Math.max(0, Math.min(full - collapsed, centre - collapsed / 2));
      setMetrics({
        full,
        expanded,
        collapsed,
        offset,
        // Centring in the open box is a different sum from centring in the
        // collapsed window, so keep both.
        openOffset: Math.max(0, Math.min(full - expanded, centre - expanded / 2)),
        // Only fade the side that is actually hiding something, so a selection
        // at either end does not sit under its own gradient.
        fadeLeft: offset > 1 ? FADE : 0,
        fadeRight: offset < full - collapsed - 1 ? FADE : 0,
      });
    };

    measure();
    const observer = new ResizeObserver(measure);
    if (trackRef.current) observer.observe(trackRef.current);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [enabled, value, optionsKey]);

  const peeking = Boolean(metrics) && !open;
  const scrolls = Boolean(metrics) && open && metrics.expanded < metrics.full;

  // When even the expanded control does not fit, keep the selection in view
  // and let the rest scroll.
  useLayoutEffect(() => {
    if (!scrolls || !scrollRef.current || !metrics) return;
    scrollRef.current.scrollLeft = metrics.openOffset;
  }, [scrolls, metrics]);

  return (
    <div
      className={`eon-peek-segment${metrics ? " is-peekable" : ""}${open ? " is-open" : ""}${scrolls ? " is-scrolling" : ""}`}
      onMouseEnter={() => metrics && setOpenState(true)}
      onMouseLeave={() => setOpenState(false)}
      onFocusCapture={() => metrics && setOpenState(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpenState(false);
      }}
      style={metrics ? {
        width: open ? metrics.expanded : metrics.collapsed,
        "--fade-left": `${peeking ? metrics.fadeLeft : 0}px`,
        "--fade-right": `${peeking ? metrics.fadeRight : 0}px`,
        "--peek-surface": surface,
      } : undefined}
    >
      {/* The window is what the mask measures against. Masking the track would
          put the fade at the ends of the full-width strip, off screen, and
          masking the outer element would dissolve the pill's own surface. */}
      <div ref={scrollRef} className="eon-peek-segment-window">
        <div
          ref={trackRef}
          className="eon-peek-segment-track"
          style={peeking ? { transform: `translateX(${-metrics.offset}px)` } : undefined}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
