import { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import LoadingScreen from "../components/LoadingScreen";
import MirrorScreen from "../features/hub/MirrorScreen";
import { listAssets, listProjects, subscribeAssets, subscribeProjects } from "../lib/data";
import { parseMirrorParams } from "../lib/mirror";

function assetMap(rows) {
  return Object.fromEntries(rows.map((item) => [item.key, item.url]));
}

/* #/mirror/<session>: the phone end of "Open on your phone". Loads the team's
   prototypes and media through the signed-in session and keeps them live. */
export default function Mirror() {
  const { session } = useParams();
  const location = useLocation();
  const [initialView] = useState(() => parseMirrorParams(location.search));
  const [projects, setProjects] = useState(null);
  const [assets, setAssets] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    const loadProjects = () => listProjects().then((rows) => { if (alive) setProjects(rows); });
    const loadAssets = () => listAssets().then((rows) => { if (alive) setAssets(assetMap(rows)); });
    Promise.all([loadProjects(), loadAssets()]).catch((err) => {
      if (alive) setError(err?.message || "Couldn't load the prototype.");
    });
    const unsubProjects = subscribeProjects(() => loadProjects().catch(() => {}));
    const unsubAssets = subscribeAssets(() => loadAssets().catch(() => {}));
    return () => {
      alive = false;
      unsubProjects();
      unsubAssets();
    };
  }, []);

  if (error) {
    return (
      <div className="eon-mirror">
        <p className="eon-mirror-message">
          {error}
          <button type="button" onClick={() => window.location.reload()}>Try again</button>
        </p>
      </div>
    );
  }
  if (!projects) return <LoadingScreen>Loading prototype…</LoadingScreen>;
  return <MirrorScreen projects={projects} media={assets} sessionId={session} initialView={initialView} />;
}
