import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { cacheEonLogo } from "../lib/branding";
import LoadingScreen from "../components/LoadingScreen";
import PrototypeHub from "../features/hub/PrototypeWorkspace";
import FirstRunTutorial from "../features/onboarding/FirstRunTutorial";
import {
  firstNameFor, TUTORIAL_METADATA_KEY, tutorialStorageKey, validTutorialPersona,
} from "../features/onboarding/tutorial";
import {
  listProjects, patchProject as dbPatch, createProject, deleteProject, subscribeProjects,
  listAssets, upsertAsset, subscribeAssets, listComments, createComment, subscribeComments,
  setCommentResolved, addCommentReaction, removeCommentReaction, listActivity, subscribeActivity,
} from "../lib/data";
import { joinTeamPresence } from "../lib/presence";

const SAVE_DEBOUNCE_MS = 600;
const SAVED_VISIBLE_MS = 1800;

function sortProjects(rows) {
  return [...rows].sort((a, b) =>
    (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.title.localeCompare(b.title));
}

function assetMap(rows) {
  const assets = Object.fromEntries(rows.map((item) => [item.key, item.url]));
  cacheEonLogo(assets.eonLogo);
  return assets;
}

function hasFields(value) {
  return Boolean(value && Object.keys(value).length);
}

function loadErrorMessage(error) {
  return error?.message || "Couldn't load the shared workspace. Check your connection and try again.";
}

// A table this build expects may not exist yet if its migration hasn't been
// applied to the shared project. Treat that as "empty" instead of a hard error.
function tableIsMissing(error, table) {
  return error?.code === "42P01"
    || error?.code === "PGRST205"
    || new RegExp(`${table}.*(does not exist|schema cache)`, "i").test(error?.message || "");
}

let toastSeq = 0;

export default function Hub() {
  const { user, profile, isAdmin, signOut, completeTutorial, saveTutorialPersona } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { slug } = useParams();
  const [projects, setProjects] = useState(null);
  const [assets, setAssets] = useState({});
  const [comments, setComments] = useState([]);
  const [activity, setActivity] = useState([]);
  const [viewers, setViewers] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const presenceRef = useRef(null);
  const [saveStates, setSaveStates] = useState({});
  const timers = useRef({});
  const savedTimers = useRef({});
  const pending = useRef({});
  const inFlight = useRef({});
  const tutorialResolved = useRef(false);
  const handledTutorialRequest = useRef(null);
  const [tutorialMode, setTutorialMode] = useState(null);
  const tutorialParams = new URLSearchParams(location.search);
  const tutorialQaRequested = tutorialParams.get("tutorial") === "1";
  const tutorialQaPersona = validTutorialPersona(tutorialParams.get("persona"));

  useEffect(() => {
    if (!projects || !user?.id) return;
    const remoteComplete = Boolean(user.user_metadata?.[TUTORIAL_METADATA_KEY]);
    const requestedAt = profile?.tutorial_requested_at || null;
    const requestedTime = Date.parse(requestedAt || "") || 0;
    const completedTime = Date.parse(profile?.tutorial_completed_at || "") || 0;
    let localComplete = false;
    try {
      localComplete = window.localStorage.getItem(tutorialStorageKey(user.id)) === "complete";
    } catch {
      // Auth metadata remains the cross-device source of truth if storage is unavailable.
    }

    if (tutorialQaRequested) {
      tutorialResolved.current = true;
      setTutorialMode((current) => current?.kind === "qa"
        ? current
        : { kind: "qa", persona: tutorialQaPersona });
      return;
    }

    if (tutorialMode) return;
    if (requestedAt && requestedAt !== handledTutorialRequest.current && requestedTime > completedTime) {
      handledTutorialRequest.current = requestedAt;
      tutorialResolved.current = true;
      setTutorialMode({ kind: "assigned", persona: validTutorialPersona(profile?.tutorial_persona) });
      return;
    }

    if (!tutorialResolved.current && !remoteComplete && !localComplete && !profile?.tutorial_completed_at) {
      tutorialResolved.current = true;
      setTutorialMode({ kind: "first-run", persona: validTutorialPersona(profile?.tutorial_persona) });
    }
  }, [profile, projects, tutorialMode, tutorialQaPersona, tutorialQaRequested, user]);

  const exitTutorial = (_reason, persona) => {
    if (["first-run", "assigned"].includes(tutorialMode?.kind) && user?.id) {
      try {
        window.localStorage.setItem(tutorialStorageKey(user.id), "complete");
      } catch {
        // Continue with auth metadata when private browsing blocks storage.
      }
      completeTutorial(persona).catch((error) => {
        console.error("Couldn't sync tutorial completion.", error);
      });
    }
    if (tutorialMode?.kind === "qa") {
      navigate(location.pathname || "/", { replace: true });
    }
    setTutorialMode(null);
  };

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

  async function loadActivity() {
    setActivity(await listActivity());
  }

  async function load() {
    setLoadError(null);
    try {
      const [projectRows, assetRows, commentRows, activityRows] = await Promise.all([
        listProjects(),
        listAssets(),
        listComments().catch((error) => {
          if (!tableIsMissing(error, "comments")) throw error;
          console.warn("Comments are unavailable until the comments migration is applied.", error);
          return [];
        }),
        listActivity().catch((error) => {
          if (!tableIsMissing(error, "activity")) throw error;
          console.warn("History is unavailable until the activity migration is applied.", error);
          return [];
        }),
      ]);
      mergeProjectRows(projectRows);
      setAssets(assetMap(assetRows));
      setComments(commentRows);
      setActivity(activityRows);
    } catch (error) {
      setLoadError(loadErrorMessage(error));
      throw error;
    }
  }

  // One activity stream feeds two features: the History tab (merge every row)
  // and live change toasts (a teammate's brand-new row, never your own).
  function applyActivityChange(payload) {
    const row = payload?.new;
    if (!row?.id) return;
    setActivity((current) => {
      const next = current.some((item) => item.id === row.id)
        ? current.map((item) => (item.id === row.id ? row : item))
        : [row, ...current];
      return next.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    });
    if (payload.eventType === "INSERT" && row.actor_id && row.actor_id !== user?.id) {
      const toast = { ...row, toastId: `t${++toastSeq}` };
      setToasts((current) => [...current, toast].slice(-4));
    }
  }

  const dismissToast = (toastId) =>
    setToasts((current) => current.filter((item) => item.toastId !== toastId));

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
            if (currentTime > incomingTime) return withLocalDraft(item);
            // Merge, don't replace: realtime UPDATE payloads omit large
            // (TOASTed) columns that didn't change — e.g. prototype_html when
            // only issue_url was edited. An absent key means "unchanged";
            // a present key (even null) is a real change.
            return withLocalDraft({ ...item, ...row });
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
    const unsubActivity = subscribeActivity(applyActivityChange);
    return () => {
      unsubProjects();
      unsubAssets();
      unsubComments();
      unsubActivity();
      Object.values(timers.current).forEach(clearTimeout);
      Object.values(savedTimers.current).forEach(clearTimeout);
    };
  }, []);

  // Live presence: join the team channel once we know who and where. The
  // tracked prototype updates as the active one changes (effect below).
  useEffect(() => {
    if (!user?.id || !profile?.team_id) return undefined;
    const handle = joinTeamPresence(
      profile.team_id,
      { id: user.id, name: profile.full_name, email: user.email },
      setViewers,
    );
    presenceRef.current = handle;
    return () => {
      handle.leave();
      presenceRef.current = null;
    };
  }, [user?.id, profile?.team_id, profile?.full_name, user?.email]);

  // Broadcast which prototype this browser is viewing so teammates see it.
  useEffect(() => {
    const activeId = projects?.find((project) => project.slug === slug)?.id
      || projects?.[0]?.id
      || null;
    presenceRef.current?.setProject(activeId);
  }, [projects, slug]);

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

  async function onCreateComment(projectId, body, imageUrl = null, anchor = null) {
    const text = body.trim();
    // A screenshot on its own is a complete comment.
    if (!text && !imageUrl) return;
    const optimisticId = `pending-${crypto.randomUUID()}`;
    const optimistic = {
      id: optimisticId,
      project_id: projectId,
      team_id: profile.team_id,
      author_id: user.id,
      body: text,
      image_url: imageUrl,
      anchor,
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
        image_url: imageUrl,
        anchor,
      });
      setComments((items) => items.map((item) => item.id === optimisticId ? saved : item));
    } catch (error) {
      setComments((items) => items.filter((item) => item.id !== optimisticId));
      throw error;
    }
  }

  async function onResolveComment(commentId, resolved) {
    // Optimistic flip; realtime refetch reconciles for everyone else.
    const before = comments;
    setComments((items) => items.map((item) => item.id === commentId
      ? { ...item, resolved_at: resolved ? new Date().toISOString() : null, resolved_by: resolved ? user.id : null }
      : item));
    try {
      const saved = await setCommentResolved(commentId, resolved);
      // The RPC returns the bare row; keep the joined author from state.
      setComments((items) => items.map((item) => item.id === commentId ? { ...item, ...saved } : item));
    } catch (error) {
      setComments(before);
      throw error;
    }
  }

  async function onToggleReaction(commentId, emoji) {
    const comment = comments.find((item) => item.id === commentId);
    if (!comment || String(commentId).startsWith("pending-")) return;
    const mine = (comment.reactions || []).some((item) => item.profile_id === user.id && item.emoji === emoji);
    const before = comments;
    setComments((items) => items.map((item) => item.id === commentId
      ? {
        ...item,
        reactions: mine
          ? (item.reactions || []).filter((r) => !(r.profile_id === user.id && r.emoji === emoji))
          : [...(item.reactions || []), { emoji, profile_id: user.id }],
      }
      : item));
    try {
      if (mine) await removeCommentReaction(commentId, user.id, emoji);
      else await addCommentReaction({ team_id: profile.team_id, comment_id: commentId, profile_id: user.id, emoji });
    } catch (error) {
      setComments(before);
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
    return <LoadingScreen>Loading prototypes…</LoadingScreen>;
  }

  const active = projects.find((project) => project.slug === slug);
  const currentProjectId = active?.id || projects[0]?.id;
  const coViewers = viewers.filter((viewer) =>
    viewer.id !== user?.id && viewer.project_id === currentProjectId);

  return (
    <>
      <PrototypeHub
        projects={projects}
        assets={assets}
        comments={comments}
        activity={activity}
        coViewers={coViewers}
        toasts={toasts}
        onDismissToast={dismissToast}
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
        onResolveComment={onResolveComment}
        onToggleReaction={onToggleReaction}
        onOpenAdmin={() => navigate("/admin")}
        onSignOut={signOut}
      />
      {tutorialMode && (
        <FirstRunTutorial
          firstName={firstNameFor(profile, user)}
          initialPersona={tutorialMode.persona}
          isQa={tutorialMode.kind === "qa"}
          onPersonaSelect={tutorialMode.kind === "qa" ? undefined : saveTutorialPersona}
          onExit={exitTutorial}
        />
      )}
    </>
  );
}
