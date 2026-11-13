import { useEffect, useMemo } from "react";
import { useSystemTheme } from "@/lib/systemTheme";
import { PROTOTYPE_SANDBOX, currentArgs, effectiveStory, insetCropStyle, renderStory } from "./prototypes";

/* A prototype alone in its own tab, filling the window: no hub, no device
   frame. Its theme is the device's light or dark setting, and it changes with
   it. New HTML arrives through the projects list the route keeps live. */
export default function FullScreen({ projects, media, view }) {
  const theme = useSystemTheme();
  const project = projects.find((item) => item.slug === view.slug) || null;
  const story = useMemo(() => effectiveStory(project), [project]);
  const args = useMemo(() => (story ? currentArgs(story, view.args) : {}), [story, view.args]);
  const html = useMemo(() => (story ? renderStory(story, theme, media, args) : ""), [story, theme, media, args]);
  const crop = useMemo(() => insetCropStyle(html), [html]);

  useEffect(() => {
    document.title = story ? `${story.title} · Eon` : "Eon Design Hub";
  }, [story]);

  return (
    <div className={`eon-mirror${theme === "light" ? " is-light" : ""}`}>
      {html
        ? <iframe className="eon-mirror-frame" style={crop} title={story.title} sandbox={PROTOTYPE_SANDBOX} referrerPolicy="no-referrer" srcDoc={html} />
        : <p className="eon-mirror-message">This prototype isn't in your workspace, or it was deleted.</p>}
    </div>
  );
}
