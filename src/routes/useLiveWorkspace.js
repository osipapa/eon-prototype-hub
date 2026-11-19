import { useCallback, useEffect, useRef, useState } from "react";
import { fetchProjectBySlug, fetchProjectHtml, listAssets, listProjects, subscribeAssets, subscribeProjects } from "../lib/data";
import { carryHtml, withFetchedHtml } from "../lib/projectHtml";

function assetMap(rows) {
  return Object.fromEntries(rows.map((item) => [item.key, item.url]));
}

/* The team's prototypes and media through the signed-in session, kept live.
   For the pages that show one prototype and nothing else: the list comes
   without HTML, and only the prototype on screen loads its own. `openingSlug`
   is the one the page opens on, fetched alongside the list. A teammate's save
   reloads the list, which marks the shown prototype's HTML stale; the screen
   then asks for it again through needHtml and keeps the old one up meanwhile. */
export default function useLiveWorkspace(openingSlug) {
  const [projects, setProjects] = useState(null);
  const [assets, setAssets] = useState({});
  const [error, setError] = useState(null);
  const alive = useRef(true);
  const loads = useRef({});
  const latest = useRef(null);
  latest.current = projects;

  const needHtml = useCallback((id) => {
    if (loads.current[id]) return;
    loads.current[id] = true;
    fetchProjectHtml(id)
      .then((fresh) => {
        if (alive.current) setProjects((current) => current?.map((project) =>
          (project.id === id ? withFetchedHtml(project, fresh) : project)) ?? current);
      })
      .catch((err) => {
        // A refresh that fails keeps the version already on screen.
        const loaded = latest.current?.find((project) => project.id === id)?.prototype_html !== undefined;
        if (alive.current && !loaded) setError(err?.message || "Couldn't load the prototype.");
      })
      .finally(() => { delete loads.current[id]; });
  }, []);

  useEffect(() => {
    alive.current = true;
    const merge = (rows, fetched) => setProjects((current) => rows.map((row) => {
      const carried = carryHtml(row, current?.find((item) => item.id === row.id));
      return fetched?.id === row.id ? withFetchedHtml(carried, fetched) : carried;
    }));
    const loadProjects = (opening) => Promise.all([listProjects(), opening])
      .then(([rows, fetched]) => { if (alive.current) merge(rows, fetched); });
    const loadAssets = () => listAssets().then((rows) => { if (alive.current) setAssets(assetMap(rows)); });
    const opening = openingSlug ? fetchProjectBySlug(openingSlug).catch(() => null) : null;
    Promise.all([loadProjects(opening), loadAssets()]).catch((err) => {
      if (alive.current) setError(err?.message || "Couldn't load the prototype.");
    });
    const unsubProjects = subscribeProjects(() => loadProjects(null).catch(() => {}));
    const unsubAssets = subscribeAssets(() => loadAssets().catch(() => {}));
    return () => {
      alive.current = false;
      unsubProjects();
      unsubAssets();
    };
  }, []);

  return { projects, assets, error, needHtml };
}
