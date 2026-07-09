import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import PrototypeHub from "../features/hub/PrototypeHub";
import {
  listProjects, patchProject as dbPatch, createProject, subscribeProjects,
  listAssets, upsertAsset,
} from "../lib/data";

export default function Hub() {
  const { user, profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState(null);
  const [assets, setAssets] = useState({});
  const timers = useRef({});
  const pending = useRef({});

  async function load() {
    const [p, a] = await Promise.all([listProjects(), listAssets()]);
    setProjects(p);
    setAssets(Object.fromEntries(a.map((x) => [x.key, x.url])));
  }

  useEffect(() => {
    load().catch(console.error);
    const unsub = subscribeProjects(() => load().catch(console.error));
    return unsub;
  }, []);

  // Optimistic local update + debounced write to Supabase.
  function onPatchProject(id, patch) {
    setProjects((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    pending.current[id] = { ...(pending.current[id] || {}), ...patch };
    clearTimeout(timers.current[id]);
    timers.current[id] = setTimeout(async () => {
      const body = pending.current[id];
      pending.current[id] = {};
      try { await dbPatch(id, body); } catch (e) { console.error(e); }
    }, 600);
  }

  async function onSetAsset(key, url) {
    setAssets((a) => ({ ...a, [key]: url }));
    try { await upsertAsset(profile.team_id, { key, name: key, url }); } catch (e) { console.error(e); }
  }

  async function onNewProject() {
    const title = window.prompt("Prototype title");
    if (!title) return;
    const group = window.prompt("Group (e.g. Onboarding)", "General") || "General";
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    try {
      await createProject({
        team_id: profile.team_id, slug, title, group_name: group,
        status: "Exploration", controls: [], defaults: {}, notes: "",
        sort_order: (projects?.length || 0),
      });
      await load();
    } catch (e) { alert(e.message); }
  }

  if (!projects) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#000", color: "#9094A5", fontFamily: "'DM Sans',sans-serif" }}>
        Loading prototypes…
      </div>
    );
  }

  return (
    <PrototypeHub
      projects={projects}
      assets={assets}
      isAdmin={isAdmin}
      userEmail={user?.email}
      onPatchProject={onPatchProject}
      onSetAsset={onSetAsset}
      onNewProject={onNewProject}
      onOpenAdmin={() => navigate("/admin")}
      onSignOut={signOut}
    />
  );
}
