import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowLeftRight, X } from "lucide-react";
import { PROTOTYPE_SANDBOX, VIEWPORTS } from "./prototypes";
import { StateGrid } from "./PrototypeHub";
import { isBridgeMessage } from "./anchorBridge";
import { startPrototypeDrag } from "./SplitDropZones";

/* One prototype on the canvas: its frame at the shared device, zoom, and
   theme, or its grid of states. Split view shows two of these, each under a
   header. The active one owns the frame the hub talks to (pins, screenshots,
   the phone mirror); a click anywhere in the other one, the prototype
   included, makes it active. */
export default function CanvasPane({
  c, story, sourceProject, args, html, theme, viewport, zoom, onPinch, media, canvasBg,
  layout, gridBy, setupControlSource, active, frameRef, onScale, renderFrameOverlay,
  pane = null, children,
}) {
  const canvasRef = useRef(null);
  const localFrameRef = useRef(null);
  const [size, setSize] = useState({ width: 960, height: 640 });
  const vp = VIEWPORTS[viewport];
  // Listeners bind once; these keep them reading the latest props.
  const onPinchRef = useRef(onPinch);
  onPinchRef.current = onPinch;
  const layoutRef = useRef(layout);
  layoutRef.current = layout;
  const activateRef = useRef(null);
  activateRef.current = pane && !active ? pane.onActivate : null;

  // Measure before the first paint so a new pane never flashes at a wrong scale.
  useLayoutEffect(() => {
    const node = canvasRef.current;
    if (!node) return undefined;
    const update = (width, height) => setSize((current) => (
      current.width === width && current.height === height ? current : { width, height }));
    const rect = node.getBoundingClientRect();
    update(rect.width, rect.height);
    const observer = new ResizeObserver(([entry]) => update(entry.contentRect.width, entry.contentRect.height));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Single view keeps its familiar fit. A split pane is narrower and shorter,
  // so it also leaves room for the phone shell and the stage's padding (the
  // bottom of which is the pill bar's), or the frame would start out clipped
  // under the header or scrolling sideways.
  const shell = pane && viewport === "mobile" ? 34 : 0;
  const scale = Math.min(
    Math.max(0.2, (size.width - 64) / (vp.w + shell)),
    Math.max(0.2, (size.height - (pane ? 128 : 64)) / (vp.h + shell)),
    1,
  );
  useEffect(() => { if (active) onScale?.(scale); }, [active, scale, onScale]);

  // Pinching over the canvas around the frame. The frame swallows its own
  // wheel events, so the bridge forwards those (below).
  useEffect(() => {
    const node = canvasRef.current;
    if (!node || layout !== "single") return undefined;
    const onWheel = (event) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      onPinchRef.current?.(event.deltaY);
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [layout]);

  useEffect(() => {
    const onMessage = (event) => {
      if (!isBridgeMessage(event, localFrameRef.current)) return;
      if (event.data.type === "eon-anchor-zoom" && layoutRef.current === "single") onPinchRef.current?.(event.data.delta);
      else if (event.data.type === "eon-frame-pointer") activateRef.current?.();
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // A pane that stops being active drops the pin mode and tracking the hub
  // turned on in its frame.
  const wasActive = useRef(active);
  useEffect(() => {
    if (wasActive.current && !active) {
      const target = localFrameRef.current?.contentWindow;
      target?.postMessage({ eon: 1, type: "eon-anchor-mode", on: false }, "*");
      target?.postMessage({ eon: 1, type: "eon-anchor-query", selectors: [] }, "*");
    }
    wasActive.current = active;
  }, [active]);

  const setFrame = useCallback((node) => {
    localFrameRef.current = node;
    if (frameRef) frameRef.current = node;
  }, [frameRef]);

  const frameScale = scale * zoom;
  const frameWidth = vp.w * frameScale;
  const frameHeight = vp.h * frameScale;
  // The phone shell is drawn outside the frame box, so the stage has to leave
  // room for it or the rail clips against the canvas edge.
  const deviceMargin = viewport === "mobile" ? 34 * frameScale : 0;

  return (
    <div className={`eon-canvas-zone${pane ? " is-pane" : ""}${pane && active ? " is-active" : ""}`}
      style={pane ? { flex: `${pane.flex} 1 0%`, order: pane.side === "left" ? 0 : 2 } : undefined}
      onPointerDownCapture={pane && !active
        // The header has its own controls: its title activates, and dragging it
        // swaps sides without changing which pane is active.
        ? (event) => { if (!event.target.closest(".eon-pane-head")) pane.onActivate(); }
        : undefined}>
      {pane && <PaneHeader c={c} story={sourceProject} active={active} pane={pane} />}
      <section data-tutorial={active ? "prototype-canvas" : undefined} ref={canvasRef} className="eon-canvas"
        aria-label={`${story.title} prototype canvas`} style={{ background: canvasBg }}>
        {layout === "single" ? (
          <div className="eon-canvas-stage" style={{ width: Math.max(size.width, frameWidth + deviceMargin + 64), height: Math.max(size.height, frameHeight + deviceMargin + 64) }}>
            <div className={`eon-stage-frame${viewport === "mobile" ? " is-device" : ""}${viewport === "mobile" && media.iPhone ? " has-mockup" : ""}`}
              style={{ width: frameWidth, height: frameHeight, flexShrink: 0, position: "relative", "--device-scale": frameScale }}>
              {viewport === "mobile" && <DeviceShell frame={media.iPhone} scale={frameScale} />}
              <iframe data-tutorial={active ? "prototype-frame" : undefined} ref={setFrame} className="eon-prototype-frame"
                key={`${story.id}-${JSON.stringify(args)}-${theme}`}
                title={story.title} srcDoc={html}
                sandbox={PROTOTYPE_SANDBOX}
                referrerPolicy="no-referrer"
                allow="clipboard-read; clipboard-write"
                style={{ width: vp.w, height: vp.h, colorScheme: theme, transform: `scale(${frameScale})`, transformOrigin: "top left" }} />
              {renderFrameOverlay?.({ vp, frameScale })}
            </div>
          </div>
        ) : (
          <div className="eon-grid-stage">
            <StateGrid c={c} story={story} sourceProject={sourceProject} currentArgs={args} controlSource={setupControlSource}
              media={media} theme={theme} viewport={viewport} by={gridBy} />
          </div>
        )}
      </section>
      {children}
    </div>
  );
}

/* A pane's title bar: which prototype it is, whether it is the active one,
   and the two things you do to a pane. Drag it onto the other half to swap. */
function PaneHeader({ c, story, active, pane }) {
  const otherSide = pane.side === "left" ? "right" : "left";
  return (
    <div className={`eon-pane-head${active ? " is-active" : ""}`} draggable
      onDragStart={(event) => { startPrototypeDrag(event, story.id); pane.onDragStart?.(story.id); }}
      onDragEnd={pane.onDragEnd}
      style={{ background: c.nav, borderColor: c.border }}>
      <button type="button" className="eon-buttonish eon-pane-title" onClick={active ? undefined : pane.onActivate}
        aria-current={active ? "true" : undefined}
        aria-label={active ? `${story.title}, active pane` : `Make ${story.title} the active pane`}
        title={active ? "Comments, pins, and shortcuts follow this pane" : "Make this the active pane"}
        style={{ color: active ? c.text : c.muted }}>
        {pane.chip && <span className="eon-issue-chip" aria-hidden="true" style={{ "--status-color": pane.chip.color }}>{pane.chip.identifier}</span>}
        <span className="eon-pane-name">{story.title}</span>
      </button>
      <div className="eon-pane-actions">
        <button type="button" className="eon-buttonish eon-icon-button" onClick={pane.onSwap}
          aria-label={`Move ${story.title} to the ${otherSide}`} title="Swap sides" style={{ color: c.muted }}>
          <ArrowLeftRight size={14} aria-hidden="true" />
        </button>
        <button type="button" className="eon-buttonish eon-icon-button" onClick={pane.onClose}
          aria-label={`Close ${story.title}`} title="Close" style={{ color: c.muted }}>
          <X size={14} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

/* ---- Device shell for the mobile viewport. Drawn around the iframe with
   negative offsets so the frame box, the pin coordinates, and the scaling all
   stay exactly as they were: this is decoration, not layout.

   The media library's `iPhone` mockup takes over when it is there. It is a
   cut-out: the screen is transparent, so it lays over the iframe and its bezel
   masks the corners. PHONE_SCREEN_INSET is measured from that file, where the
   hole is 1206x2622 in a 1350x2760 image, exactly 3x an iPhone 17 Pro screen,
   which is why VIEWPORTS.mobile matches that device. Without the asset, the
   built-in bezel draws the same phone in CSS and stays sharp at any zoom. ---- */
const PHONE_SCREEN_INSET = { top: 0.025, right: 0.05333, bottom: 0.025, left: 0.05333 };

function DeviceShell({ frame, scale }) {
  const px = (value) => `${value * scale}px`;
  if (frame) {
    // Grow the image so its screen area lands exactly on the iframe.
    const width = 1 / (1 - PHONE_SCREEN_INSET.left - PHONE_SCREEN_INSET.right);
    const height = 1 / (1 - PHONE_SCREEN_INSET.top - PHONE_SCREEN_INSET.bottom);
    return (
      <img
        className="eon-device-png"
        src={frame}
        alt=""
        aria-hidden="true"
        style={{
          width: `${width * 100}%`,
          height: `${height * 100}%`,
          left: `${-PHONE_SCREEN_INSET.left * width * 100}%`,
          top: `${-PHONE_SCREEN_INSET.top * height * 100}%`,
        }}
      />
    );
  }
  return (
    <span
      className="eon-device-shell"
      aria-hidden="true"
      style={{
        inset: `-${px(15)}`,
        borderRadius: px(66),
        borderWidth: px(3),
        boxShadow: `inset 0 0 0 ${px(12)} #050505, 0 ${px(22)} ${px(60)} rgba(0,0,0,.42)`,
      }}
    >
      <span className="eon-device-island" style={{ top: px(24), width: px(122), height: px(35), borderRadius: px(20) }} />
      <span className="eon-device-key is-action" style={{ left: px(-4), top: px(120), width: px(4), height: px(34), borderRadius: px(3) }} />
      <span className="eon-device-key is-up" style={{ left: px(-4), top: px(178), width: px(4), height: px(62), borderRadius: px(3) }} />
      <span className="eon-device-key is-down" style={{ left: px(-4), top: px(254), width: px(4), height: px(62), borderRadius: px(3) }} />
      <span className="eon-device-key is-power" style={{ right: px(-4), top: px(196), width: px(4), height: px(96), borderRadius: px(3) }} />
    </span>
  );
}
