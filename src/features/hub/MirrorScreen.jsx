import { useEffect, useMemo, useState } from "react";
import { MIRROR_PING_MS, openMirrorChannel } from "@/lib/mirror";
import { PROTOTYPE_SANDBOX, currentArgs, effectiveStory, renderStory } from "./prototypes";

/* Phone side of the mirror: the prototype full screen and nothing else. It
   starts on the view the QR code held, then follows the desktop tab that
   showed the code. New HTML arrives through the projects list the route keeps
   live, so an upload on the desktop shows up here too. */
export default function MirrorScreen({ projects, media, sessionId, initialView, transport = "supabase" }) {
  const [view, setView] = useState(initialView);
  const [linked, setLinked] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    const channel = openMirrorChannel(sessionId, {
      transport,
      onMessage: (event, payload) => {
        if (event !== "view" || !payload?.slug) return;
        setView(payload);
        setLinked(true);
      },
    });
    channel.send("hello");
    const ping = window.setInterval(() => channel.send("here"), MIRROR_PING_MS);
    return () => {
      window.clearInterval(ping);
      channel.close();
    };
  }, [sessionId, transport]);

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
    () => (story ? renderStory(story, view.theme, media, args) : ""),
    [story, view.theme, media, args],
  );

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
          key={`${project.id}-${view.theme}-${JSON.stringify(args)}`}
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
