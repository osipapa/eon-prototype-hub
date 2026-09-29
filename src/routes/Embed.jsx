import { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import LoadingScreen from "../components/LoadingScreen";
import EmbedView from "../features/hub/EmbedView";
import { getEmbedPrototype, parseEmbedParams } from "../lib/embed";
import { supabase } from "../lib/supabase";

/* #/embed/<slug>, and #/p/<slug> inside another page: one prototype, no
   sign-in. Viewers usually aren't signed in, so realtime can't reach them;
   the embed catches up whenever its page comes back into view instead. */
export default function Embed() {
  const { slug } = useParams();
  const location = useLocation();
  const [initialView] = useState(() => parseEmbedParams(location.search));
  // undefined while loading, null when there's no such prototype.
  const [prototype, setPrototype] = useState(undefined);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    const load = () => {
      if (!supabase) { setError("The hub isn't connected to its backend."); return; }
      getEmbedPrototype(slug)
        .then((row) => {
          if (!alive) return;
          setError(null);
          // Same content keeps the same object, so the frame doesn't reload.
          setPrototype((current) => (JSON.stringify(current) === JSON.stringify(row) ? current : row));
        })
        .catch(() => { if (alive) setError("Couldn't load this prototype."); });
    };
    load();
    const onVisible = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [slug]);

  if (error || prototype === null) {
    return (
      <div className="eon-mirror">
        <p className="eon-mirror-message">
          {error || "This prototype isn't in the hub. It may have been renamed or deleted."}
          {error
            ? <button type="button" onClick={() => window.location.reload()}>Try again</button>
            : <a href={`${window.location.origin}${import.meta.env.BASE_URL}`} target="_blank" rel="noopener noreferrer">Open Eon Design Hub</a>}
        </p>
      </div>
    );
  }
  if (!prototype) return <LoadingScreen>Loading prototype…</LoadingScreen>;
  return <EmbedView prototype={prototype} initialView={initialView} />;
}
