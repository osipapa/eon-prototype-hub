import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../lib/auth";
import PrototypeHub from "../features/hub/PrototypeWorkspace";
import {
  listProjects, patchProject as dbPatch, createProject, deleteProject, subscribeProjects,
  listAssets, upsertAsset, listComments, createComment, subscribeComments,
} from "../lib/data";

export default function Hub() {
  const { user, profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const { slug } = useParams();
  const [projects, setProjects] = useState(null);
  const [assets, setAssets] = useState({});
  const [comments, setComments] = useState([]);
  const timers = useRef({});
  const pending = useRef({});

  async function load() {
    const [p, a, c] = await Promise.all([
      listProjects(),
      listAssets(),
      listComments().catch((error) => {
        console.warn("Comments are unavailable until the comments migration is applied.", error);
        return [];
      }),
    ]);
    setProjects(p);
    setAssets(Object.fromEntries(a.map((x) => [x.key, x.url])));
    setComments(c);
  }

  async function loadComments() {
    setComments(await listComments());
  }

  useEffect(() => {
    load().catch(console.error);
    const unsub = subscribeProjects(() => load().catch(console.error));
    const unsubComments = subscribeComments(() => loadComments().catch(console.error));
    return () => { unsub(); unsubComments(); };
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
    const newSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    try {
      await createProject({
        team_id: profile.team_id, slug: newSlug, title, group_name: group,
        status: "Exploration", controls: [], defaults: {},
        sort_order: (projects?.length || 0),
      });
      await load();
      navigate(`/p/${newSlug}`);
    } catch (e) { alert(e.message); }
  }

  async function onCreateComment(projectId, body) {
    const text = body.trim();
    if (!text) return;
    const optimisticId = `pending-${crypto.randomUUID()}`;
    const optimistic = {
      id: optimisticId,
      project_id: projectId,
      team_id: profile.team_id,
      author_id: user.id,
      body: text,
      created_at: new Date().toISOString(),
      pending: true,
      author: { id: user.id, email: user.email, full_name: profile.full_name },
    };
    setComments((items) => [...items, optimistic]);
    try {
      const saved = await createComment({
        project_id: projectId,
        team_id: profile.team_id,
        author_id: user.id,
        body: text,
      });
      setComments((items) => items.map((item) => item.id === optimisticId ? saved : item));
    } catch (error) {
      setComments((items) => items.filter((item) => item.id !== optimisticId));
      throw error;
    }
  }

  async function onDeleteProject(id) {
    const p = projects.find((x) => x.id === id);
    if (!window.confirm(`Delete "${p?.title}"? This can't be undone.`)) return;
    try {
      await deleteProject(id);
      await load();
      if (p?.slug === slug) navigate("/", { replace: true });
    } catch (e) { alert(e.message); }
  }

  // Persist a new sidebar order; a story dropped into another group adopts it.
  async function onReorder(orderedIds, groupById = {}) {
    setProjects((ps) => orderedIds.map((id, i) => {
      const p = ps.find((x) => x.id === id);
      return { ...p, sort_order: i, group_name: groupById[id] ?? p.group_name };
    }));
    try {
      await Promise.all(orderedIds.map((id, i) =>
        dbPatch(id, { sort_order: i, ...(groupById[id] ? { group_name: groupById[id] } : {}) })));
    } catch (e) { console.error(e); load().catch(console.error); }
  }

  if (!projects) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#000", color: "#9094A5", fontFamily: "'DM Sans',sans-serif" }}>
        Loading prototypes…
      </div>
    );
  }

  const active = projects.find((p) => p.slug === slug);

  return (
    <PrototypeHub
      projects={projects}
      assets={assets}
      comments={comments}
      isAdmin={isAdmin}
      profile={profile}
      userEmail={user?.email}
      activeId={active?.id}
      onSelectStory={(p) => navigate(p?.slug ? `/p/${p.slug}` : "/")}
      onPatchProject={onPatchProject}
      onSetAsset={onSetAsset}
      onNewProject={onNewProject}
      onDeleteProject={onDeleteProject}
      onReorder={onReorder}
      onCreateComment={onCreateComment}
      onOpenAdmin={() => navigate("/admin")}
      onSignOut={signOut}
    />
  );
}
