import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, QrCode } from "lucide-react";
import { renderSVG } from "uqr";
import { MIRROR_PING_MS, mirrorSessionId, mirrorUrl, openMirrorChannel } from "@/lib/mirror";
import { copyText } from "@/lib/uiState";

const ACTIVE_KEY = "eon-mirror-active";

// Interactions since the canvas last loaded, for a phone that joins late.
// Only the latest scroll and value per element matter; taps keep their order.
function addToLog(log, event) {
  const next = event.kind === "click" ? log : log.filter((item) => item.kind !== event.kind || item.selector !== event.selector);
  return [...next, event].slice(-200);
}

function wasActive() {
  try { return window.sessionStorage.getItem(ACTIVE_KEY) === "1"; }
  catch { return false; }
}

/* Desktop side of the phone mirror: a QR button in the toolbar. Opening it
   starts sharing this tab's view (prototype, state, theme) and what you do in
   the prototype (taps, typing, scrolling), both ways; a phone that scans the
   code follows along for as long as the tab stays open. */
export default function PhoneMirrorButton({ c, view, frameRef, transport = "supabase" }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(wasActive);
  const [sessionId] = useState(mirrorSessionId);
  const [lastSeen, setLastSeen] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [copied, setCopied] = useState(false);
  const wrapRef = useRef(null);
  const channelRef = useRef(null);
  const logRef = useRef([]);
  const viewRef = useRef(view);
  viewRef.current = view;
  const viewKey = JSON.stringify(view);

  useEffect(() => {
    if (!active) return undefined;
    const channel = openMirrorChannel(sessionId, {
      transport,
      onMessage: (event, payload) => {
        if (event === "input") {
          // The phone did something: do it here too.
          logRef.current = addToLog(logRef.current, payload);
          frameRef?.current?.contentWindow?.postMessage({ eon: 1, type: "eon-sync-apply", event: payload }, "*");
          return;
        }
        if (event !== "hello" && event !== "here") return;
        setLastSeen(Date.now());
        // A phone that just joined gets the view plus everything done since it loaded.
        if (event === "hello") channel.send("view", { ...viewRef.current, log: logRef.current });
      },
    });
    channelRef.current = channel;
    channel.send("view", viewRef.current);
    const tick = window.setInterval(() => setNow(Date.now()), 2000);
    return () => {
      window.clearInterval(tick);
      channel.close();
      channelRef.current = null;
    };
  }, [active, sessionId, transport]);

  useEffect(() => { channelRef.current?.send("view", viewRef.current); }, [viewKey]);

  // The canvas reports interactions once asked to. Each fresh load (a new
  // state, theme, or HTML) starts clean on both screens.
  useEffect(() => {
    if (!active) return undefined;
    const enable = () => frameRef?.current?.contentWindow?.postMessage({ eon: 1, type: "eon-sync", on: true }, "*");
    const onMessage = (event) => {
      const frame = frameRef?.current;
      if (!frame || event.source !== frame.contentWindow || event.data?.eon !== 1) return;
      if (event.data.type === "eon-anchor-ready") {
        logRef.current = [];
        enable();
        channelRef.current?.send("view", { ...viewRef.current, log: [] });
      } else if (event.data.type === "eon-sync-event") {
        logRef.current = addToLog(logRef.current, event.data.event);
        channelRef.current?.send("input", event.data.event);
      }
    };
    window.addEventListener("message", onMessage);
    enable();
    return () => {
      window.removeEventListener("message", onMessage);
      frameRef?.current?.contentWindow?.postMessage({ eon: 1, type: "eon-sync", on: false }, "*");
    };
  }, [active, frameRef]);

  useEffect(() => {
    if (!open) return undefined;
    const dismiss = (event) => {
      if (event.key === "Escape") { setOpen(false); return; }
      if (event.type === "pointerdown" && !wrapRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("keydown", dismiss);
    document.addEventListener("pointerdown", dismiss);
    return () => {
      document.removeEventListener("keydown", dismiss);
      document.removeEventListener("pointerdown", dismiss);
    };
  }, [open]);

  const connected = active && now - lastSeen < MIRROR_PING_MS * 2.5;
  const url = mirrorUrl(sessionId, view, { preview: transport === "local" });
  const qr = useMemo(
    () => renderSVG(url, { ecc: "M", border: 2, pixelSize: 4, whiteColor: "#FFFFFF", blackColor: "#000000" }),
    [url],
  );

  const toggle = () => {
    setOpen((value) => !value);
    if (active) return;
    setActive(true);
    try { window.sessionStorage.setItem(ACTIVE_KEY, "1"); }
    catch { /* The mirror still works for this page load. */ }
  };

  const copy = async () => {
    await copyText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div ref={wrapRef} className="eon-mirror-wrap">
      <button className="eon-buttonish eon-icon-button eon-mirror-button" onClick={toggle}
        aria-label={connected ? "Open on your phone, phone connected" : "Open on your phone"}
        aria-expanded={open} aria-haspopup="dialog" title="Open on your phone"
        style={{ color: connected ? c.brand : c.muted, boxShadow: "var(--shadow-surface)" }}>
        <QrCode size={16} />
        {connected && <span className="eon-mirror-live" style={{ background: c.brand, boxShadow: `0 0 0 2px ${c.nav}` }} aria-hidden="true" />}
      </button>
      {open && (
        <div className="eon-mirror-popover" role="dialog" aria-label="Open on your phone"
          style={{ background: c.panel, borderColor: c.border, color: c.text }}>
          <div className="eon-mirror-qr" dangerouslySetInnerHTML={{ __html: qr }} />
          <strong>Open on your phone</strong>
          <p style={{ color: c.muted }}>Scan with your phone's camera. It shows this prototype full screen and mirrors what you do on either screen.</p>
          <div className="eon-mirror-status" role="status" style={{ color: connected ? c.text : c.muted }}>
            <span className="eon-mirror-dot" style={{ background: connected ? c.brand : c.muted }} aria-hidden="true" />
            {connected ? "Phone connected" : "Waiting for your phone…"}
          </div>
          <button className="eon-buttonish eon-secondary-button" onClick={copy}
            style={{ borderColor: c.border, background: "transparent", color: c.secondary }}>
            {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied" : "Copy link"}
          </button>
        </div>
      )}
    </div>
  );
}
