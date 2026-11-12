import { useEffect, useState } from "react";
import { listAssets, listProjects, subscribeAssets, subscribeProjects } from "../lib/data";

function assetMap(rows) {
  return Object.fromEntries(rows.map((item) => [item.key, item.url]));
}

/* The team's prototypes and media through the signed-in session, kept live.
   For the pages that show one prototype and nothing else. */
export default function useLiveWorkspace() {
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

  return { projects, assets, error };
}
