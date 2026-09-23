import { useEffect, useMemo, useRef, useState } from "react";
import { MIRROR_PING_MS, openMirrorChannel } from "@/lib/mirror";
import { injectAnchorBridge } from "./anchorBridge";
import { PROTOTYPE_SANDBOX, currentArgs, effectiveStory, renderStory } from "./prototypes";

/* Phone side of the mirror: the prototype full screen and nothing else. It
   starts on the view the QR code held, then follows the desktop tab that
   showed the code, including what's done inside the prototype, and sends its
   own taps, typing, and scrolling back. New HTML arrives through the projects
   list the route keeps live, so an upload on the desktop shows up here too. */
export default function MirrorScreen({ projects, media, sessionId, initialView, transport = "supabase" }) {
  const [view, setView] = useState(initialView);
  const [generation, setGeneration] = useState(0);
  const [linked, setLinked] = useState(false);
  const [notice, setNotice] = useState(null);
  const frameRef = useRef(null);
  const channelRef = useRef(null);
  // Interactions wait here until the frame's bridge says it's ready.
  const readyRef = useRef(false);
  const pendingRef = useRef([]);

  const replay = (events) => {
    // Spaced out, so transitions a tap starts can settle before the next one.
    events.forEach((event, index) => window.setTimeout(() => {
      frameRef.current?.contentWindow?.postMessage({ eon: 1, type: "eon-sync-apply", event }, "*");
    }, index * 120));
  };

  useEffect(() => {
    const channel = openMirrorChannel(sessionId, {
      transport,
      onMessage: (event, payload) => {
        if (event === "view" && payload?.slug) {
          const { log, ...next } = payload;
          setView(next);
          setLinked(true);
          if (Array.isArray(log)) {
            // A fresh frame, then everything the desktop did since it loaded.
            pendingRef.current = log;
            if (readyRef.current) setGeneration((current) => current + 1);
          }
        } else if (event === "input" && payload) {
          if (readyRef.current) replay([payload]);
          else pendingRef.current = [...pendingRef.current, payload];
        }
      },
    });
    channelRef.current = channel;
    channel.send("hello");
    const ping = window.setInterval(() => channel.send("here"), MIRROR_PING_MS);
    return () => {
      window.clearInterval(ping);
      channel.close();
      channelRef.current = null;
    };
  }, [sessionId, transport]);

  useEffect(() => {
    const onMessage = (event) => {
      if (event.source !== frameRef.current?.contentWindow || event.data?.eon !== 1) return;
      if (event.data.type === "eon-anchor-ready") {
        readyRef.current = true;
        frameRef.current.contentWindow.postMessage({ eon: 1, type: "eon-sync", on: true }, "*");
        replay(pendingRef.current);
        pendingRef.current = [];
      } else if (event.data.type === "eon-sync-event") {
        channelRef.current?.send("input", event.data.event);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // Say once that the phone is following, then get out of the way.
  useEffect(() => {
    if (!linked) return undefined;
    setNotice("Following your desktop");
    const timer = window.setTimeout(() => setNotice(null), 2400);
    return () => window.clearTimeout(timer);
  }, [linked]);

  const project = projects.find((item) => item.slug === view.slug) || null;
  const story = useMemo(() => effectiveStory(project), [project]);
  const args = useMemo(() => (story ? currentArgs(story, view.args) : {}), [story, view.args]);
  const html = useMemo(
    () => (story ? injectAnchorBridge(renderStory(story, view.theme, media, args)) : ""),
    [story, view.theme, media, args],
  );
  const frameKey = project ? `${project.id}-${view.theme}-${JSON.stringify(args)}-${generation}` : "none";
  // A new frame isn't ready until its bridge says so.
  useEffect(() => { readyRef.current = false; }, [frameKey, html]);

  useEffect(() => {
    document.title = story ? `${story.title} · Eon` : "Eon Design Hub";
  }, [story]);

  const dark = view.theme !== "light";
  const message = !view.slug ? "Waiting for your desktop…"
    : !project ? "This prototype isn't in your workspace, or it was deleted."
    : null;

  return (
    <div className={`eon-mirror${dark ? "" : " is-light"}`}>
      {html && (
        <iframe
          ref={frameRef}
          key={frameKey}
          className="eon-mirror-frame"
          title={story.title}
          sandbox={PROTOTYPE_SANDBOX}
          referrerPolicy="no-referrer"
          srcDoc={html}
        />
      )}
      {message && <p className="eon-mirror-message">{message}</p>}
      {notice && <p className="eon-mirror-notice" role="status">{notice}</p>}
    </div>
  );
}
