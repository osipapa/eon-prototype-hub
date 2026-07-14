import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../lib/auth";
import PrototypeHub from "../features/hub/PrototypeWorkspace";
import {
  listProjects, patchProject as dbPatch, createProject, deleteProject, subscribeProjects,
  listAssets, upsertAsset, subscribeAssets, listComments, createComment, subscribeComments,
} from "../lib/data";

const SAVE_DEBOUNCE_MS = 600;
const SAVED_VISIBLE_MS = 1800;

function sortProjects(rows) {
  return [...rows].sort((a, b) =>
    (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.title.localeCompare(b.title));
}

function assetMap(rows) {
  return Object.fromEntries(rows.map((item) => [item.key, item.url]));
}

function hasFields(value) {
  return Boolean(value && Object.keys(value).length);
}

function loadErrorMessage(error) {
  return error?.message || "Couldn't load the shared workspace. Check your connection and try again.";
}

function commentsTableIsMissing(error) {
  return error?.code === "42P01"
    || error?.code === "PGRST205"
    || /comments.*(does not exist|schema cache)/i.test(error?.message || "");
}

export default function Hub() {
  const { user, profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const { slug } = useParams();
  const [projects, setProjects] = useState(null);
  const [assets, setAssets] = useState({});
  const [comments, setComments] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [saveStates, setSaveStates] = useState({});
  const timers = useRef({});
  const savedTimers = useRef({});
  const pending = useRef({});
  const inFlight = useRef({});

  // Server rows stay authoritative except for fields this browser is actively
  // saving. This prevents a realtime refresh from erasing optimistic typing.
  function withLocalDraft(project) {
    return {
      ...project,
      ...(inFlight.current[project.id] || {}),
      ...(pending.current[project.id] || {}),
    };
  }

  function mergeProjectRows(rows) {
    setProjects(sortProjects(rows.map(withLocalDraft)));
  }

  async function refreshProjects() {
    mergeProjectRows(await listProjects());
  }

  async function refreshAssets() {
    setAssets(assetMap(await listAssets()));
  }

  async function loadComments() {
    setComments(await listComments());
  }

  async function load() {
    setLoadError(null);
    try {
      const [projectRows, assetRows, commentRows] = await Promise.all([
        listProjects(),
        listAssets(),
        listComments().catch((error) => {
          if (!commentsTableIsMissing(error)) throw error;
          console.warn("Comments are unavailable until the comments migration is applied.", error);
          return [];
        }),
      ]);
      mergeProjectRows(projectRows);
      setAssets(assetMap(assetRows));
      setComments(commentRows);
    } catch (error) {
      setLoadError(loadErrorMessage(error));
      throw error;
    }
  }

  function reportRefreshError(error) {
    console.error(error);
    setLoadError(loadErrorMessage(error));
  }

  function clearProjectDraft(id) {
    clearTimeout(timers.current[id]);
    clearTimeout(savedTimers.current[id]);
    delete timers.current[id];
    delete savedTimers.current[id];
    delete pending.current[id];
    delete inFlight.current[id];
    setSaveStates((states) => {
      if (!(id in states)) return states;
      const next = { ...states };
      delete next[id];
      return next;
    });
  }

  function applyProjectChange(payload) {
    const event = payload?.eventType;
    const row = payload?.new;

    if ((event === "INSERT" || event === "UPDATE") && row?.id) {
      setProjects((current) => {
        if (!current) return current;
        const found = current.some((item) => item.id === row.id);
        const next = found
          ? current.map((item) => {
            if (item.id !== row.id) return item;
            const currentTime = Date.parse(item.updated_at || "") || 0;
            const incomingTime = Date.parse(row.updated_at || "") || 0;
            // Supabase events can arrive after a newer fetch or save response.
            // Ignore an older server snapshot, while still applying local drafts.
            return withLocalDraft(currentTime > incomingTime ? item : row);
          })
          : [...current, withLocalDraft(row)];
        return sortProjects(next);
      });
      return;
    }

    if (event === "DELETE" && payload?.old?.id) {
      const id = payload.old.id;
      clearProjectDraft(id);
      setProjects((current) => current?.filter((item) => item.id !== id) ?? current);
      return;
    }

    // Fallback for incomplete realtime payloads or future event shapes.
    refreshProjects().catch(reportRefreshError);
  }

  useEffect(() => {
    load().catch(() => {});
    const unsubProjects = subscribeProjects(applyProjectChange);
    const unsubAssets = subscribeAssets(() => refreshAssets().catch(reportRefreshError));
    const unsubComments = subscribeComments(() => loadComments().catch(reportRefreshError));
    return () => {
      unsubProjects();
      unsubAssets();
      unsubComments();
      Object.values(timers.current).forEach(clearTimeout);
      Object.values(savedTimers.current).forEach(clearTimeout);
    };
  }, []);

  function markSaved(id) {
    clearTimeout(savedTimers.current[id]);
    setSaveStates((states) => ({ ...states, [id]: "saved" }));
    savedTimers.current[id] = setTimeout(() => {
      setSaveStates((states) => states[id] === "saved"
        ? { ...states, [id]: "idle" }
        : states);
    }, SAVED_VISIBLE_MS);
  }

  function scheduleSave(id, delay = SAVE_DEBOUNCE_MS) {
    clearTimeout(timers.current[id]);
    timers.current[id] = setTimeout(() => flushProjectPatch(id), delay);
  }

  async function flushProjectPatch(id) {
    clearTimeout(timers.current[id]);
    delete timers.current[id];
    if (inFlight.current[id]) return;

    const body = pending.current[id];
    if (!hasFields(body)) return;

    pending.current[id] = {};
    inFlight.current[id] = body;
    setSaveStates((states) => ({ ...states, [id]: "saving" }));

    try {
      const saved = await dbPatch(id, body);
      setProjects((current) => current?.map((project) =>
        project.id === id
          ? { ...saved, ...(pending.current[id] || {}) }
          : project) ?? current);
      delete inFlight.current[id];

      if (hasFields(pending.current[id])) {
        scheduleSave(id, 0);
      } else {
        markSaved(id);
      }
    } catch (error) {
      // Keep both the failed patch and any newer edits available for Retry.
      delete inFlight.current[id];
      pending.current[id] = { ...body, ...(pending.current[id] || {}) };
      setSaveStates((states) => ({ ...states, [id]: "error" }));
      console.error(error);
    }
  }

  function retryProjectSave(id) {
    if (!id || !hasFields(pending.current[id])) return;
    clearTimeout(savedTimers.current[id]);
    setSaveStates((states) => ({ ...states, [id]: "saving" }));
    scheduleSave(id, 0);
  }

  // Optimistic local update + serialized, debounced write to Supabase.
  function onPatchProject(id, patch) {
    setProjects((rows) => rows?.map((project) =>
      project.id === id ? { ...project, ...patch } : project) ?? rows);
    pending.current[id] = { ...(pending.current[id] || {}), ...patch };
    clearTimeout(savedTimers.current[id]);
    setSaveStates((states) => ({ ...states, [id]: "saving" }));
    scheduleSave(id);
  }

  async function onSetAsset(key, url) {
    setAssets((current) => ({ ...current, [key]: url }));
    try {
      await upsertAsset(profile.team_id, { key, name: key, url });
    } catch (error) {
      reportRefreshError(error);
    }
  }

  // Called by the workspace's new-prototype dialog; errors propagate back to
  // it so they show inline instead of an alert.
  async function onNewProject({ title, group, html }) {
    const newSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
      || `prototype-${Date.now().toString(36)}`;
    const created = await createProject({
      team_id: profile.team_id, slug: newSlug, title, group_name: group || "General",
      status: "Exploration", controls: [], defaults: {},
      prototype_html: html || null,
      sort_order: (projects?.length || 0),
      ...(profile?.id ? { created_by: profile.id } : {}),
    });
    setProjects((rows) => sortProjects([...(rows || []).filter((item) => item.id !== created.id), created]));
    navigate(`/p/${newSlug}`);
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
    const project = projects.find((item) => item.id === id);
    try {
      await deleteProject(id);
      clearProjectDraft(id);
      setProjects((rows) => rows.filter((item) => item.id !== id));
      if (project?.slug === slug) navigate("/", { replace: true });
    } catch (error) {
      throw error;
    }
  }

  // Persist a new sidebar order; a story dropped into another group adopts it.
  async function onReorder(orderedIds, groupById = {}) {
    setProjects((rows) => orderedIds.map((id, index) => {
      const project = rows.find((item) => item.id === id);
      return { ...project, sort_order: index, group_name: groupById[id] ?? project.group_name };
    }));
    try {
      await Promise.all(orderedIds.map((id, index) =>
        dbPatch(id, { sort_order: index, ...(groupById[id] ? { group_name: groupById[id] } : {}) })));
    } catch (error) {
      console.error(error);
      refreshProjects().catch(reportRefreshError);
    }
  }

  const retryLoad = () => load().catch(() => {});

  if (!projects) {
    if (loadError) {
      return (
        <div role="alert" style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#000", color: "#fff", fontFamily: "'DM Sans',sans-serif", padding: 24 }}>
          <div style={{ maxWidth: 420, textAlign: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Couldn't load the workspace</div>
            <p style={{ margin: "8px 0 18px", color: "#9094A5", fontSize: 13, lineHeight: 1.5 }}>{loadError}</p>
            <button onClick={retryLoad} style={{ minHeight: 40, padding: "0 16px", border: 0, borderRadius: 10, background: "#EDD2F6", color: "#000", cursor: "pointer", fontWeight: 600 }}>
              Try again
            </button>
          </div>
        </div>
      );
    }
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#000", color: "#9094A5", fontFamily: "'DM Sans',sans-serif" }}>
        Loading prototypes…
      </div>
    );
  }

  const active = projects.find((project) => project.slug === slug);
  const currentProjectId = active?.id || projects[0]?.id;

  return (
    <PrototypeHub
      projects={projects}
      assets={assets}
      comments={comments}
      isAdmin={isAdmin}
      profile={profile}
      userEmail={user?.email}
      activeId={active?.id}
      saveState={saveStates[currentProjectId] || "idle"}
      onRetrySave={() => retryProjectSave(currentProjectId)}
      loadError={loadError}
      onRetryLoad={retryLoad}
      onSelectStory={(project) => navigate(project?.slug ? `/p/${project.slug}` : "/")}
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
