import { useEffect, useLayoutEffect, useRef, useState } from "react";

/* A segmented control with more options than the canvas has room for.

   Collapsed, it shows the current selection centred with its neighbours
   peeking in and fading out at both edges, so a nine-state prototype costs
   about the width of three. Hover (or keyboard focus) opens it to full width.

   Opening never changes the room it takes in the bar. The outer element is a
   slot fixed at the collapsed width, and the pill inside grows out of it, over
   its neighbours. If the slot grew instead, the centred, wrapping bar would
   reflow and slide the pill out from under a still cursor, which closes it,
   which reflows the bar back: the pills traded places on their own.

   The control inside is untouched: this only windows and slides it, so the
   liquid indicator, selection, and arrow-key navigation keep working. */

const PEEK = 44;      // how much of the neighbours stays visible
const FADE = 28;      // width of the edge fade
const WORTH_IT = 28;  // below this saving, stay expanded and skip the effect
const RESERVED = 96;  // canvas width the open pill leaves free
const EDGE = 12;      // the open pill's closest approach to a canvas edge
const DURATION = 340; // --peek-duration in index.css

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export default function PeekSegmented({ value, optionsKey, surface, enabled = true, onOpenChange, children }) {
  const slotRef = useRef(null);
  const trackRef = useRef(null);
  const scrollRef = useRef(null);
  const closeTimer = useRef(0);
  const [metrics, setMetrics] = useState(null);
  // An open pill keeps the measurements it opened with. Picking another option
  // re-measures, and applying that while the cursor is still on the pill would
  // resize the slot and reflow the bar under it.
  const [opened, setOpened] = useState(null);
  // Closing, the pill shrinks back over the neighbours it covered, so it stays
  // above them until it is home.
  const [closing, setClosing] = useState(false);

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

      // The open pill floats over the bar and the zoom cluster, so the only
      // horizontal limit is the canvas itself.
      const zone = trackRef.current?.closest(".eon-canvas-zone");
      const room = Math.max(collapsed, (zone?.clientWidth ?? window.innerWidth) - RESERVED);
      const centre = activeRect.left - shellRect.left + activeRect.width / 2;
      const offset = Math.max(0, Math.min(full - collapsed, centre - collapsed / 2));
      setMetrics({
        full,
        expanded: Math.min(full, room),
        collapsed,
        offset,
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

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  const openPeek = () => {
    clearTimeout(closeTimer.current);
    setClosing(false);
    if (!metrics || opened) return;

    // Measured now, not with the metrics: another pill's selection can move
    // this slot without re-measuring this one.
    const slot = slotRef.current.getBoundingClientRect();
    const zone = slotRef.current.closest(".eon-canvas-zone")?.getBoundingClientRect()
      ?? { left: 0, right: window.innerWidth };
    const grow = metrics.expanded - metrics.collapsed;
    const maxScroll = metrics.full - metrics.expanded;
    // Grow by `left` to the left and the rest to the right. Growing left by
    // the strip's own offset leaves every label where it was, so nothing moves
    // under the cursor and the options that were peeking simply come into
    // view. Prefer an even split where scrolling allows it, and stay inside
    // the canvas.
    const lo = Math.max(0, grow - (zone.right - EDGE - slot.right));
    const hi = Math.max(lo, Math.min(grow, slot.left - zone.left - EDGE));
    const left = clamp(clamp(grow / 2, metrics.offset - maxScroll, metrics.offset), lo, hi);
    setOpened({ metrics, left, scroll: Math.round(clamp(metrics.offset - left, 0, maxScroll)) });
    onOpenChange?.(true);
  };

  const closePeek = () => {
    onOpenChange?.(false);
    if (!opened) return;
    setOpened(null);
    setClosing(true);
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setClosing(false), DURATION);
  };

  const shown = opened ? opened.metrics : metrics;
  const peeking = Boolean(shown) && !opened;
  const scrolls = Boolean(opened) && shown.expanded < shown.full;
  const rest = peeking ? -shown.offset : 0;
  const scroll = opened ? opened.scroll : 0;

  // The strip rests on a transform while collapsed and on the window's scroll
  // while open, since only a real scroll lets a long list be scrolled. Swap one
  // for the other without moving the strip, then let the transform ease home.
  useLayoutEffect(() => {
    const track = trackRef.current;
    const win = scrollRef.current;
    if (!track || !win) return;
    if (Math.abs(win.scrollLeft - scroll) > 0.5) {
      const at = new DOMMatrixReadOnly(getComputedStyle(track).transform).m41;
      track.style.transition = "none";
      track.style.transform = `translateX(${at - win.scrollLeft + scroll}px)`;
      win.scrollLeft = scroll;
      track.getBoundingClientRect();
      track.style.transition = "";
    }
    track.style.transform = rest ? `translateX(${rest}px)` : "";
  }, [rest, scroll]);

  // A selection made while open (arrow keys, or a click on a clipped option)
  // scrolls fully into view, by no more than it takes.
  useLayoutEffect(() => {
    const win = scrollRef.current;
    const active = trackRef.current?.querySelector('.eon-liquid-segment-button[aria-pressed="true"]');
    if (!scrolls || !win || !active) return;
    const from = active.getBoundingClientRect().left - trackRef.current.getBoundingClientRect().left;
    const to = from + active.offsetWidth;
    if (from < win.scrollLeft) win.scrollLeft = from;
    else if (to > win.scrollLeft + shown.expanded) win.scrollLeft = to - shown.expanded;
  }, [value]);

  return (
    <div
      ref={slotRef}
      className={`eon-peek-segment${shown ? " is-peekable" : ""}${opened ? " is-open" : ""}${closing ? " is-closing" : ""}${scrolls ? " is-scrolling" : ""}`}
      onMouseEnter={openPeek}
      onMouseLeave={closePeek}
      onFocusCapture={openPeek}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) closePeek();
      }}
      style={shown ? {
        width: shown.collapsed,
        "--fade-left": `${peeking ? shown.fadeLeft : 0}px`,
        "--fade-right": `${peeking ? shown.fadeRight : 0}px`,
        "--peek-surface": surface,
      } : undefined}
    >
      <div
        className="eon-peek-segment-pill"
        style={shown ? {
          width: opened ? shown.expanded : shown.collapsed,
          marginLeft: opened ? -opened.left : 0,
        } : undefined}
      >
        {/* The window is what the mask measures against. Masking the track would
            put the fade at the ends of the full-width strip, off screen, and
            masking the pill would dissolve its own surface. */}
        <div ref={scrollRef} className="eon-peek-segment-window">
          <div ref={trackRef} className="eon-peek-segment-track">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
