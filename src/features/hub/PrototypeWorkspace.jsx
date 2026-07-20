import { useEffect, useMemo, useRef, useState } from "react";
import { fetchLinearIssue, uploadCommentImage, MAX_COMMENT_IMAGE_BYTES } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FigmaIcon, LinearIcon } from "@/components/BrandIcons";
import {
  AlertCircle, ArrowDown, ArrowUp, Check, ChevronDown, Circle, Copy,
  ExternalLink, History, ImagePlus, LayoutGrid, Link2, Loader2, LogOut,
  Pin, Maximize2, MessageSquare, Minus, Monitor, Laptop,
  MoreHorizontal, Moon, PanelLeftClose, PanelLeftOpen, PanelRightClose,
  PanelRightOpen, Pencil, Plus, Search, Send, Shield, SlidersHorizontal, Smartphone, SmilePlus, Square, Sun,
  Tablet, Trash2, Upload, X,
} from "lucide-react";
import {
  CANVAS_PRESETS, HUB, STATUS_COLOR, VIEWPORTS, currentArgs,
  parsePrototypeConfig, renderStory,
} from "./prototypes";
import {
  FigmaEmbed, LinearCard, MediaManager, StateGrid,
  UploadPanel, figmaMeta,
} from "./PrototypeHub";
import { buildSetupPrompt } from "./setupPrompt";
import {
  anchorMatchesState, anchorPoint, anchorStateLabel, injectAnchorBridge, isBridgeMessage,
} from "./anchorBridge";
import { pickHtmlFile, supportsFileLink, watchFile } from "@/lib/localFile";

const VP_ICON = { desktop: Monitor, laptop: Laptop, tablet: Tablet, mobile: Smartphone };
const PROTOTYPE_SANDBOX = "allow-scripts allow-forms allow-modals allow-popups allow-downloads";

function linearIdentifier(project) {
  return project?.issue_url?.match(/\/issue\/([A-Za-z][A-Za-z0-9]*-\d+)/i)?.[1] || project?.issue_id || null;
}

export default function PrototypeWorkspace({
  projects, assets = {}, comments = [], activity = [], coViewers = [],
  toasts = [], onDismissToast, isAdmin, profile, userEmail,
  activeId, onSelectStory,
  onPatchProject, onSetAsset, onNewProject, onDeleteProject, onReorder,
  onCreateComment, onResolveComment, onToggleReaction, onOpenAdmin, onSignOut,
  saveState = "idle", onRetrySave, loadError, onRetryLoad,
}) {
  const [hubTheme, setHubTheme] = useStoredState("eon-hub-theme", "dark");
  const [protoTheme, setProtoTheme] = useStoredState("eon-prototype-theme", "dark");
  const [view, setView] = useState("stories");
  const [viewport, setViewport] = useStoredState("eon-viewport", "laptop");
  const [layout, setLayout] = useStoredState("eon-layout", "single");
  const [gridBy, setGridBy] = useState("states");
  const [query, setQuery] = useState("");
  const [canvasBg, setCanvasBg] = useStoredState("eon-canvas-background", "#808080");
  const [liveArgs, setLiveArgs] = useState({});
  const [showUpload, setShowUpload] = useState(false);
  const [dragId, setDragId] = useState(null);
  const [dropTargetId, setDropTargetId] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [renamingGroup, setRenamingGroup] = useState(null);
  const [storyMenuId, setStoryMenuId] = useState(null);
  const [editFigma, setEditFigma] = useState(false);
  const [editLinear, setEditLinear] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [linearByProject, setLinearByProject] = useState({});
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [navOpen, setNavOpen] = useState(() => window.innerWidth > 900);
  const [inspectorOpen, setInspectorOpen] = useState(() => window.innerWidth > 1180);
  const [compare, setCompare] = useState(false);
  const [splitRatio, setSplitRatio] = useState(0.5);
  const [splitDragging, setSplitDragging] = useState(false);
  const [inspectorTab, setInspectorTab] = useState("comments");
  const [copiedReviewLink, setCopiedReviewLink] = useState(false);
  const [reviewLinkCopyError, setReviewLinkCopyError] = useState("");
  const [reviewLocationKey, setReviewLocationKey] = useState(() => window.location.hash);
  const [breakpoints, setBreakpoints] = useState({ navDrawer: false, inspectorDrawer: false, noCompare: false, compactControls: false });
  const [anchorMode, setAnchorMode] = useState(false);
  const [pendingAnchor, setPendingAnchor] = useState(null);
  const [ringOpen, setRingOpen] = useState(false);
  const [pinWriteOpen, setPinWriteOpen] = useState(false);
  const [anchorRects, setAnchorRects] = useState({});
  const [activeAnchorId, setActiveAnchorId] = useState(null);
  const frameRef = useRef(null);
  const seenStorageKey = `eon-review-seen:${profile?.id || "anonymous"}`;
  const [seenComments, setSeenComments] = useState(() => readStoredJson(seenStorageKey));
  // Live local file link: one at a time, tied to the prototype it was linked
  // from. Session-scoped — file handles can't be restored after a reload.
  const [fileLink, setFileLink] = useState(null); // {handle, name, projectId, lastModified, lastSyncAt}
  const [autoPublish, setAutoPublish] = useState(true);
  const [localHtml, setLocalHtml] = useState(null);
  const [fileLinkError, setFileLinkError] = useState("");
  const autoPublishRef = useRef(autoPublish);
  autoPublishRef.current = autoPublish;
  const patchProjectRef = useRef(onPatchProject);
  patchProjectRef.current = onPatchProject;
  const compareRef = useRef(null);
  const canvasRef = useRef(null);
  const newDialogReturnFocusRef = useRef(null);
  const [canvasSize, setCanvasSize] = useState({ width: 960, height: 640 });

  const c = HUB[hubTheme];
  const story = projects.find((item) => item.id === activeId) || projects[0];
  const media = assets;

  useEffect(() => {
    const update = () => setBreakpoints({
      navDrawer: window.matchMedia("(max-width: 900px)").matches,
      inspectorDrawer: window.matchMedia("(max-width: 1180px)").matches,
      noCompare: window.matchMedia("(max-width: 899px)").matches,
      compactControls: window.matchMedia("(max-width: 680px)").matches,
    });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    const node = canvasRef.current;
    if (!node) return undefined;
    const observer = new ResizeObserver(([entry]) => {
      setCanvasSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [view, navOpen, inspectorOpen]);

  // While the linked prototype is active, render straight from the local file
  // (every editor save shows instantly, publish toggle or not).
  const isLiveLinked = Boolean(fileLink && localHtml != null && fileLink.projectId === story?.id);
  const sourceHtml = isLiveLinked ? localHtml : story?.prototype_html;
  const cfg = useMemo(() => parsePrototypeConfig(sourceHtml), [sourceHtml]);
  const effStory = useMemo(() => {
    if (!story) return story;
    const controls = story.controls?.length ? story.controls : (cfg.controls || []);
    return {
      ...story,
      ...(isLiveLinked ? { prototype_html: localHtml } : {}),
      controls,
      defaults: { ...(cfg.defaults || {}), ...(story.defaults || {}) },
    };
  }, [story, cfg, isLiveLinked, localHtml]);
  const setupControlSource = story?.controls?.length
    ? "stored project controls (these override embedded eon-config controls)"
    : cfg.controls?.length ? "embedded eon-config" : "none";
  const args = useMemo(
    () => (effStory ? currentArgs(effStory, liveArgs[effStory.id]) : {}),
    [effStory, liveArgs],
  );
  const vp = VIEWPORTS[viewport];
  const html = useMemo(
    () => (effStory ? injectAnchorBridge(renderStory(effStory, protoTheme, media, args)) : ""),
    [effStory, args, protoTheme, media],
  );
  const scale = useMemo(() => Math.min(
    Math.max(0.2, (canvasSize.width - 64) / vp.w),
    Math.max(0.2, (canvasSize.height - 64) / vp.h),
    1,
  ), [canvasSize, vp]);

  const unreadByProject = useMemo(() => {
    const counts = {};
    comments.forEach((comment) => {
      if (comment.author_id === profile?.id) return;
      if (new Date(comment.created_at).getTime() > Number(seenComments[comment.project_id] || 0)) {
        counts[comment.project_id] = (counts[comment.project_id] || 0) + 1;
      }
    });
    return counts;
  }, [comments, profile?.id, seenComments]);

  const commentCountByProject = useMemo(() => comments.reduce((counts, comment) => {
    counts[comment.project_id] = (counts[comment.project_id] || 0) + 1;
    return counts;
  }, {}), [comments]);

  const linearProjectKey = useMemo(
    () => projects.map((item) => `${item.id}:${linearIdentifier(item) || ""}`).join("|"),
    [projects],
  );

  const groups = useMemo(() => {
    const q = query.toLowerCase();
    const grouped = {};
    projects
      .filter((item) => item.title.toLowerCase().includes(q) || (item.group_name || "").toLowerCase().includes(q))
      .forEach((item) => { (grouped[item.group_name || "General"] ||= []).push(item); });
    return grouped;
  }, [projects, query]);

  const storyComments = useMemo(
    () => comments.filter((comment) => comment.project_id === story?.id),
    [comments, story?.id],
  );

  const storyActivity = useMemo(
    () => activity.filter((item) => item.project_id === story?.id),
    [activity, story?.id],
  );

  /* ---- Anchored comments: pins on the prototype canvas ---- */

  // Open anchored comments get stable numbers in thread order; the canvas
  // shows the subset placed in the state currently on screen.
  const anchoredPins = useMemo(() => {
    let number = 0;
    return storyComments
      .filter((comment) => comment.anchor && !comment.resolved_at)
      .map((comment) => ({ comment, number: ++number }));
  }, [storyComments]);
  const pinNumberById = useMemo(
    () => Object.fromEntries(anchoredPins.map(({ comment, number }) => [comment.id, number])),
    [anchoredPins],
  );
  const visiblePins = useMemo(
    () => anchoredPins.filter(({ comment }) => anchorMatchesState(comment.anchor, viewport, args, protoTheme)),
    [anchoredPins, viewport, args, protoTheme],
  );
  const watchedSelectors = useMemo(() => {
    const selectors = new Set();
    visiblePins.forEach(({ comment }) => comment.anchor.selector && selectors.add(comment.anchor.selector));
    if (pendingAnchor?.selector) selectors.add(pendingAnchor.selector);
    return [...selectors];
  }, [visiblePins, pendingAnchor?.selector]);
  const postToFrame = (message) => frameRef.current?.contentWindow?.postMessage({ eon: 1, ...message }, "*");

  // One listener covers the bridge's whole vocabulary. The iframe remounts on
  // state changes, so "ready" re-syncs mode + watched selectors every time.
  useEffect(() => {
    const onMessage = (event) => {
      if (!isBridgeMessage(event, frameRef.current)) return;
      const message = event.data;
      if (message.type === "eon-anchor-ready") {
        postToFrame({ type: "eon-anchor-mode", on: anchorMode });
        postToFrame({ type: "eon-anchor-query", selectors: watchedSelectors });
      } else if (message.type === "eon-anchor-rects") {
        setAnchorRects(message.rects || {});
      } else if (message.type === "eon-anchor-cancel") {
        setAnchorMode(false);
      } else if (message.type === "eon-anchor-click") {
        setPendingAnchor({
          selector: message.selector || null,
          rel_x: message.rel_x, rel_y: message.rel_y,
          x_pct: message.x_pct, y_pct: message.y_pct,
          viewport, args, theme: protoTheme,
        });
        setAnchorMode(false);
        // The quick-comment ring opens at the pin; "Write…" swaps it for an
        // inline composer in place.
        setPinWriteOpen(false);
        setRingOpen(true);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [anchorMode, watchedSelectors, viewport, args, protoTheme]);

  useEffect(() => { postToFrame({ type: "eon-anchor-mode", on: anchorMode }); }, [anchorMode]);
  useEffect(() => { postToFrame({ type: "eon-anchor-query", selectors: watchedSelectors }); }, [watchedSelectors]);

  // Placement is a single-view affair; leaving it cancels cleanly.
  const canPlacePin = view === "stories" && layout === "single" && !(compare && !breakpoints.noCompare);
  useEffect(() => { if (!canPlacePin) setAnchorMode(false); }, [canPlacePin]);
  useEffect(() => {
    if (!anchorMode && !ringOpen && !pinWriteOpen) return undefined;
    const onKey = (event) => {
      if (event.key !== "Escape") return;
      setAnchorMode(false);
      if (ringOpen || pinWriteOpen) {
        setRingOpen(false);
        setPinWriteOpen(false);
        setPendingAnchor(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [anchorMode, ringOpen, pinWriteOpen]);

  // Ring choices: post the preset instantly at the pin, or write in place.
  const quickComment = (body) => {
    const anchor = pendingAnchor;
    setRingOpen(false);
    setPinWriteOpen(false);
    setPendingAnchor(null);
    Promise.resolve(onCreateComment(story.id, body, null, anchor)).catch(() => {
      // Couldn't post — keep the pin and fall back to the composer, which has error UI.
      setPendingAnchor(anchor);
      setInspectorTab("comments");
      setInspectorOpen(true);
    });
  };
  const writeComment = () => {
    setRingOpen(false);
    setPinWriteOpen(true);
  };
  const cancelRing = () => {
    setRingOpen(false);
    setPinWriteOpen(false);
    setPendingAnchor(null);
  };

  // A pending pin describes one exact canvas state; changing state discards it.
  useEffect(() => {
    setPendingAnchor((current) =>
      current && !anchorMatchesState(current, viewport, args, protoTheme) ? null : current);
  }, [viewport, args, protoTheme]);
  useEffect(() => { setPendingAnchor(null); setActiveAnchorId(null); setAnchorMode(false); }, [story?.id]);

  // Restore the exact canvas state a pin was placed in.
  const jumpToAnchor = (comment) => {
    const anchor = comment.anchor;
    if (!anchor) return;
    setLayout("single");
    if (VIEWPORTS[anchor.viewport]) setViewport(anchor.viewport);
    if (["light", "dark"].includes(anchor.theme)) setProtoTheme(anchor.theme);
    if (anchor.args && story) setLiveArgs((current) => ({ ...current, [story.id]: { ...current[story.id], ...anchor.args } }));
    setActiveAnchorId(comment.id);
  };

  useEffect(() => {
    if (!story?.id || !inspectorOpen || inspectorTab !== "comments" || storyComments.length === 0) return;
    const latest = Math.max(...storyComments.map((comment) => new Date(comment.created_at).getTime()));
    setSeenComments((current) => {
      if (Number(current[story.id] || 0) >= latest) return current;
      const next = { ...current, [story.id]: latest };
      window.localStorage.setItem(seenStorageKey, JSON.stringify(next));
      return next;
    });
  }, [story?.id, storyComments, inspectorOpen, inspectorTab, seenStorageKey]);

  useEffect(() => {
    if (!storyMenuId) return undefined;
    const dismiss = (event) => {
      if (event.key === "Escape") setStoryMenuId(null);
      if (event.type === "pointerdown" && !event.target.closest(`[data-story-menu="${storyMenuId}"]`)) setStoryMenuId(null);
    };
    document.addEventListener("keydown", dismiss);
    document.addEventListener("pointerdown", dismiss);
    return () => {
      document.removeEventListener("keydown", dismiss);
      document.removeEventListener("pointerdown", dismiss);
    };
  }, [storyMenuId]);

  useEffect(() => {
    if (!(breakpoints.navDrawer || breakpoints.inspectorDrawer)) return undefined;
    const closeOnEscape = (event) => {
      if (event.key !== "Escape") return;
      if (breakpoints.inspectorDrawer && inspectorOpen) setInspectorOpen(false);
      else if (breakpoints.navDrawer && navOpen) setNavOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [breakpoints, inspectorOpen, navOpen]);

  useEffect(() => {
    const revealTutorialTarget = (event) => {
      const { panel, tab } = event.detail || {};
      if (panel === "library") {
        setNavOpen(true);
        if (breakpoints.navDrawer) setInspectorOpen(false);
      }
      if (panel === "review") {
        setInspectorOpen(true);
        if (breakpoints.inspectorDrawer) setNavOpen(false);
      }
      if (tab === "details") setInspectorTab("linear");
      else if (["comments", "linear"].includes(tab)) setInspectorTab(tab);
    };
    window.addEventListener("eon:tutorial:reveal", revealTutorialTarget);
    return () => window.removeEventListener("eon:tutorial:reveal", revealTutorialTarget);
  }, [breakpoints.inspectorDrawer, breakpoints.navDrawer]);

  useEffect(() => {
    const syncLocation = () => setReviewLocationKey(window.location.hash);
    window.addEventListener("hashchange", syncLocation);
    return () => window.removeEventListener("hashchange", syncLocation);
  }, []);

  useEffect(() => {
    if (!story?.id) return;
    const raw = window.location.hash.split("?")[1];
    if (!raw) return;
    const params = new URLSearchParams(raw);
    const nextViewport = params.get("viewport");
    const nextTheme = params.get("theme");
    const nextLayout = params.get("layout");
    const nextGrid = params.get("grid");
    const nextCanvas = params.get("canvas");
    const nextZoom = Number(params.get("zoom"));
    const nextTab = params.get("inspect");
    if (VIEWPORTS[nextViewport]) setViewport(nextViewport);
    if (["light", "dark"].includes(nextTheme)) setProtoTheme(nextTheme);
    if (["single", "grid"].includes(nextLayout)) setLayout(nextLayout);
    if (["states", "themes", "screens"].includes(nextGrid)) setGridBy(nextGrid);
    if (/^#[0-9a-f]{6}$/i.test(nextCanvas || "")) setCanvasBg(nextCanvas);
    if (Number.isFinite(nextZoom) && nextZoom >= 0.25 && nextZoom <= 4) setZoom(nextZoom);
    if (nextTab === "details") setInspectorTab("linear");
    else if (["comments", "linear"].includes(nextTab)) setInspectorTab(nextTab);
    const linkedArgs = {};
    params.forEach((value, key) => {
      if (!key.startsWith("arg.")) return;
      try { linkedArgs[key.slice(4)] = JSON.parse(value); }
      catch { linkedArgs[key.slice(4)] = value; }
    });
    if (Object.keys(linkedArgs).length) {
      setLiveArgs((current) => ({ ...current, [story.id]: { ...current[story.id], ...linkedArgs } }));
    }
  }, [story?.id, reviewLocationKey]);

  useEffect(() => {
    const linkedProjects = projects
      .map((item) => ({ projectId: item.id, identifier: linearIdentifier(item) }))
      .filter((item) => item.identifier);
    let stale = false;
    setLinearByProject({});
    if (!linkedProjects.length) return () => { stale = true; };

    Promise.all(linkedProjects.map(async ({ projectId, identifier }) => [
      projectId,
      await fetchLinearIssue(identifier),
    ])).then((entries) => {
      if (!stale) setLinearByProject(Object.fromEntries(entries));
    });
    return () => { stale = true; };
  }, [linearProjectKey]);

  useEffect(() => {
    setStoryMenuId(null);
    setEditFigma(false);
    setEditLinear(false);
  }, [story?.id]);

  // Watch the linked file. Keeps running (and publishing) even while another
  // prototype is selected, so background syncs aren't lost.
  useEffect(() => {
    if (!fileLink?.handle) return undefined;
    const { handle, projectId, lastModified } = fileLink;
    return watchFile(
      handle,
      lastModified,
      (content, mtime) => {
        setLocalHtml(content);
        setFileLink((current) => (current?.handle === handle
          ? { ...current, lastModified: mtime, lastSyncAt: Date.now() }
          : current));
        if (autoPublishRef.current) patchProjectRef.current(projectId, { prototype_html: content });
      },
      () => {
        setFileLinkError("Lost access to the linked file — it may have been moved or deleted. Link it again to resume.");
        setFileLink(null);
        setLocalHtml(null);
      },
    );
  }, [fileLink?.handle]);

  const linkLocalFile = async () => {
    setFileLinkError("");
    try {
      const picked = await pickHtmlFile();
      if (!picked) return;
      setLocalHtml(picked.content);
      setFileLink({
        handle: picked.handle, name: picked.name, projectId: story.id,
        lastModified: picked.lastModified, lastSyncAt: Date.now(),
      });
      if (autoPublishRef.current) patchProjectRef.current(story.id, { prototype_html: picked.content });
    } catch (error) {
      setFileLinkError(error?.message || "Couldn't read that file.");
    }
  };
  const unlinkLocalFile = () => {
    setFileLink(null);
    setLocalHtml(null);
    setFileLinkError("");
  };
  const publishLocalFile = () => {
    if (fileLink && localHtml != null) patchProjectRef.current(fileLink.projectId, { prototype_html: localHtml });
  };

  if (!story) {
    return (
      <div className={`${hubTheme === "dark" ? "" : "light"} eon-empty-workspace`} style={{ background: c.bg, color: c.text }}>
        <div className="eon-empty-workspace-card" style={{ background: c.panel, boxShadow: hubShadow(c) }}>
          <span className="eon-empty-workspace-icon" style={{ background: c.active, color: c.brand }}><Plus size={20} /></span>
          <h1>No prototypes yet</h1>
          <p style={{ color: c.muted }}>Create the first shared review space for your team.</p>
          <Button className="eon-buttonish" onClick={(event) => { newDialogReturnFocusRef.current = event.currentTarget; setShowNewDialog(true); }} style={{ minHeight: 40, background: c.primary, color: c.primaryText }}>New prototype</Button>
        </div>
        {showNewDialog && (
          <NewPrototypeDialog c={c} groups={[]} restoreFocus={newDialogReturnFocusRef.current} onClose={() => setShowNewDialog(false)} onCreate={onNewProject} />
        )}
      </div>
    );
  }

  // States always leads; StateGrid explains itself when none are declared.
  const gridOptions = ["states", "themes", "screens"];
  const effGridBy = gridOptions.includes(gridBy) ? gridBy : gridOptions[0];
  const effCompare = compare && !breakpoints.noCompare;
  const [sc0, sc1] = STATUS_COLOR[story.status] || STATUS_COLOR.Exploration;
  const linearId = linearIdentifier(story);
  const liveLinear = linearByProject[story.id] || null;
  const frameScale = scale * zoom;
  const frameWidth = vp.w * frameScale;
  const frameHeight = vp.h * frameScale;

  const setArg = (key, value) => setLiveArgs((previous) => ({
    ...previous,
    [story.id]: { ...previous[story.id], [key]: value },
  }));
  const patch = (field, value) => onPatchProject(story.id, { [field]: value });
  const openFull = () => {
    const wrapper = sandboxedFullView(html, story.title);
    const url = URL.createObjectURL(new Blob([wrapper], { type: "text/html" }));
    window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const copyReviewLink = async () => {
    const params = new URLSearchParams({
      viewport,
      theme: protoTheme,
      layout,
      grid: effGridBy,
      canvas: canvasBg,
      zoom: String(zoom),
      inspect: inspectorTab,
    });
    Object.entries(args).forEach(([key, value]) => params.set(`arg.${key}`, JSON.stringify(value)));
    const route = story.slug ? `#/p/${story.slug}` : (window.location.hash.split("?")[0] || "#/");
    const url = `${window.location.origin}${window.location.pathname}${route}?${params.toString()}`;
    setReviewLinkCopyError("");
    try {
      await copyText(url);
      setCopiedReviewLink(true);
      window.setTimeout(() => setCopiedReviewLink(false), 1600);
    } catch {
      setReviewLinkCopyError("Couldn't copy automatically. Check your browser's clipboard permission.");
    }
  };
  const commitRename = (id, value) => {
    const title = value.trim();
    const previous = projects.find((item) => item.id === id)?.title;
    if (title && title !== previous) onPatchProject(id, { title });
    setRenamingId(null);
  };
  // Renaming a group moves every prototype in it to the new group name.
  const commitGroupRename = (group, value) => {
    const name = value.trim();
    if (name && name !== group) {
      projects
        .filter((item) => (item.group_name || "General") === group)
        .forEach((item) => onPatchProject(item.id, { group_name: name }));
    }
    setRenamingGroup(null);
  };
  const copySetupPrompt = async () => {
    try {
      await copyText(buildSetupPrompt({
        project: story,
        controls: effStory?.controls,
        defaults: effStory?.defaults,
        currentArgs: args,
        assets,
        theme: protoTheme,
        viewport,
        controlSource: setupControlSource,
      }));
      setCopiedPrompt(true);
      window.setTimeout(() => setCopiedPrompt(false), 1600);
    } catch { /* Clipboard may be blocked by the browser. */ }
  };
  const handleDrop = (targetId) => {
    setDropTargetId(null);
    if (!dragId || dragId === targetId || !onReorder) return;
    const ordered = projects.map((item) => item.id).filter((id) => id !== dragId);
    ordered.splice(ordered.indexOf(targetId), 0, dragId);
    const targetGroup = projects.find((item) => item.id === targetId)?.group_name;
    onReorder(ordered, targetGroup ? { [dragId]: targetGroup } : {});
    setDragId(null);
  };
  const moveStory = (id, direction) => {
    const ordered = projects.map((item) => item.id);
    const from = ordered.indexOf(id);
    const to = Math.min(ordered.length - 1, Math.max(0, from + direction));
    if (from < 0 || from === to || !onReorder) return;
    [ordered[from], ordered[to]] = [ordered[to], ordered[from]];
    onReorder(ordered);
  };

  // Divider drag for the compare split; iframes get pointer-events:none while
  // dragging (via .is-dragging) so the drag survives crossing them.
  const startSplitDrag = (event) => {
    event.preventDefault();
    const rect = compareRef.current?.getBoundingClientRect();
    if (!rect) return;
    setSplitDragging(true);
    const move = (pointer) => {
      const ratio = (pointer.clientX - rect.left) / rect.width;
      setSplitRatio(Math.min(0.75, Math.max(0.25, ratio)));
    };
    const up = () => {
      setSplitDragging(false);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  const nudgeSplit = (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    setSplitRatio((value) => Math.min(0.75, Math.max(0.25, value + (event.key === "ArrowRight" ? 0.05 : -0.05))));
  };

  const segmented = (options, value, onPick, disabled = false) => (
    <div className="eon-segmented" style={{ display: "flex", gap: 3, padding: 3, borderRadius: 10, background: c.raised, opacity: disabled ? 0.45 : 1 }}>
      {options.map((option) => {
        const selected = value === option;
        return (
          <button className="eon-buttonish" key={option} onClick={() => onPick(option)} aria-pressed={selected} disabled={disabled}
            style={{ minHeight: 32, padding: "5px 10px", border: 0, borderRadius: 7, background: selected ? c.selected : "transparent", color: selected ? c.selectedText : c.secondary, cursor: disabled ? "not-allowed" : "pointer", fontSize: 12, fontWeight: selected ? 600 : 400, textTransform: "capitalize" }}>
            {option}
          </button>
        );
      })}
    </div>
  );

  return (
    <div data-tutorial="workspace" className={`${hubTheme === "dark" ? "" : "light"} eon-workspace`} style={{ background: c.bg, color: c.text }}>
      {((breakpoints.navDrawer && navOpen) || (breakpoints.inspectorDrawer && inspectorOpen)) && (
        <button className="eon-drawer-scrim" aria-label="Close open panel" onClick={() => {
          if (breakpoints.inspectorDrawer && inspectorOpen) setInspectorOpen(false);
          else setNavOpen(false);
        }} />
      )}

      {navOpen && (
        <WorkspaceSidebar
          c={c} media={media} view={view} setView={setView} query={query} setQuery={setQuery}
          groups={groups} activeId={story.id} onSelect={onSelectStory} isAdmin={isAdmin} currentUserId={profile?.id}
          onNewProject={(event) => { newDialogReturnFocusRef.current = event.currentTarget; setShowNewDialog(true); }} dragId={dragId} setDragId={setDragId}
          dropTargetId={dropTargetId} setDropTargetId={setDropTargetId} handleDrop={handleDrop}
          renamingId={renamingId} setRenamingId={setRenamingId} commitRename={commitRename}
          renamingGroup={renamingGroup} setRenamingGroup={setRenamingGroup} commitGroupRename={commitGroupRename}
          storyMenuId={storyMenuId} setStoryMenuId={setStoryMenuId}
          onDeleteProject={(id, restoreFocus) => {
            const project = projects.find((item) => item.id === id);
            if (project) setDeleteCandidate({ project, restoreFocus });
          }}
          moveStory={moveStory} projectOrder={projects.map((item) => item.id)}
          copiedPrompt={copiedPrompt} copySetupPrompt={copySetupPrompt} userEmail={userEmail}
          onOpenAdmin={onOpenAdmin} onSignOut={onSignOut}
          linearByProject={linearByProject}
          unreadByProject={unreadByProject} commentCountByProject={commentCountByProject}
          isDrawer={breakpoints.navDrawer} onClose={() => setNavOpen(false)}
        />
      )}

      <main className="eon-workspace-main">
        <WorkspaceToolbar
          c={c} view={view} story={story} liveLinear={liveLinear} sc0={sc0} sc1={sc1} coViewers={coViewers} liveLinked={isLiveLinked}
          navOpen={navOpen} onToggleNav={() => {
            const opening = !navOpen;
            setNavOpen(opening);
            if (opening && breakpoints.navDrawer) setInspectorOpen(false);
          }} inspectorOpen={inspectorOpen}
          onToggleInspector={() => {
            const opening = !inspectorOpen;
            setInspectorOpen(opening);
            if (opening && breakpoints.inspectorDrawer) setNavOpen(false);
          }} hubTheme={hubTheme} setHubTheme={setHubTheme}
          showUpload={showUpload} setShowUpload={setShowUpload} openFull={openFull}
          viewport={viewport} setViewport={setViewport} layout={layout} setLayout={setLayout}
          compare={effCompare} setCompare={setCompare} saveState={saveState} onRetrySave={onRetrySave}
          onOpenLinear={() => { setInspectorTab("linear"); setInspectorOpen(true); }}
        />

        {loadError && (
          <div className="eon-inline-alert" role="alert" style={{ background: c.panel, color: c.secondary, borderColor: c.border }}>
            <AlertCircle size={15} />
            <span>{loadError}</span>
            {onRetryLoad && <button className="eon-buttonish eon-text-button" onClick={onRetryLoad} style={{ color: c.brand }}>Retry</button>}
          </div>
        )}

        {showUpload && view === "stories" && (
          <UploadPanel key={story.id} c={c} story={story}
            onSave={(source) => { patch("prototype_html", source); setShowUpload(false); }}
            onClear={() => { patch("prototype_html", null); setShowUpload(false); }}
            onCancel={() => setShowUpload(false)}
            canLinkFile={supportsFileLink()}
            fileLink={fileLink?.projectId === story.id ? fileLink : null}
            fileLinkError={fileLinkError}
            autoPublish={autoPublish} onToggleAutoPublish={() => setAutoPublish((value) => !value)}
            onLinkFile={linkLocalFile} onUnlinkFile={unlinkLocalFile} onPublishFile={publishLocalFile} />
        )}

        {view === "media" ? (
          <div className="eon-media-scroll"><MediaManager c={c} assets={assets} onSetAsset={onSetAsset} /></div>
        ) : (
          <div ref={compareRef} className={`eon-compare${splitDragging ? " is-dragging" : ""}`}>
            <div className="eon-canvas-zone" style={{ flex: effCompare ? `${splitRatio} 1 0%` : undefined }}>
              <section data-tutorial="prototype-canvas" ref={canvasRef} className="eon-canvas" aria-label={`${story.title} prototype canvas`} style={{ background: canvasBg }}>
                {layout === "single" ? (
                  <div className="eon-canvas-stage" style={{ width: Math.max(canvasSize.width, frameWidth + 64), height: Math.max(canvasSize.height, frameHeight + 64) }}>
                    <div style={{ width: frameWidth, height: frameHeight, flexShrink: 0, position: "relative" }}>
                      <iframe data-tutorial="prototype-frame" ref={frameRef} className="eon-prototype-frame" key={`${story.id}-${JSON.stringify(args)}-${protoTheme}`}
                        title={story.title} srcDoc={html}
                        sandbox={PROTOTYPE_SANDBOX}
                        referrerPolicy="no-referrer"
                        allow="clipboard-read; clipboard-write"
                        style={{ width: vp.w, height: vp.h, colorScheme: protoTheme, transform: `scale(${frameScale})`, transformOrigin: "top left" }} />
                      <PinOverlay
                        c={c} pins={visiblePins} pendingAnchor={pendingAnchor} rects={anchorRects}
                        vp={vp} frameScale={frameScale} activeAnchorId={activeAnchorId} currentUserId={profile?.id}
                        ringOpen={ringOpen} pinWriteOpen={pinWriteOpen} onQuickComment={quickComment}
                        onWriteComment={writeComment} onCancelRing={cancelRing}
                        onPickPin={(comment) => {
                          setActiveAnchorId((current) => (current === comment.id ? null : comment.id));
                          setInspectorTab("comments");
                          setInspectorOpen(true);
                        }} />
                    </div>
                  </div>
                ) : (
                  <div className="eon-grid-stage">
                    <StateGrid c={c} story={effStory} sourceProject={story} currentArgs={args} controlSource={setupControlSource}
                      media={media} theme={protoTheme} viewport={viewport} by={effGridBy} />
                  </div>
                )}
              </section>
              <CanvasControlBar
                c={c} layout={layout} effStory={effStory} args={args} setArg={setArg}
                gridOptions={gridOptions} effGridBy={effGridBy} setGridBy={setGridBy}
                protoTheme={protoTheme} setProtoTheme={setProtoTheme} canvasBg={canvasBg}
                setCanvasBg={setCanvasBg} segmented={segmented} compact={breakpoints.compactControls}
              />
              {layout === "single" && (
                <div className="eon-zoom eon-zoom-float" style={{ background: c.panel, border: `1px solid ${c.border}`, boxShadow: c.bg === "#000000" ? "0 8px 30px rgba(0,0,0,.35)" : "0 8px 30px rgba(0,0,0,.14)" }}>
                  <button className="eon-buttonish eon-icon-button" onClick={() => setZoom((value) => Math.max(0.25, +(value - 0.1).toFixed(2)))} aria-label="Zoom out" style={{ color: c.muted }}><Minus size={15} /></button>
                  <button className="eon-buttonish eon-zoom-value" onClick={() => setZoom(1)} title="Fit prototype to canvas" style={{ color: c.text }}>{Math.round(scale * zoom * 100)}%</button>
                  <button className="eon-buttonish eon-icon-button" onClick={() => setZoom((value) => Math.min(4, +(value + 0.1).toFixed(2)))} aria-label="Zoom in" style={{ color: c.muted }}><Plus size={15} /></button>
                </div>
              )}
            </div>
            {effCompare && (
              <>
                <div className="eon-compare-divider" role="separator" tabIndex={0} onPointerDown={startSplitDrag} onKeyDown={nudgeSplit}
                  aria-orientation="vertical" aria-label="Resize the Figma comparison"
                  style={{ color: c.border }} />
                <FigmaPane c={c} story={story} ratio={splitRatio} patch={patch} editing={editFigma} setEditing={setEditFigma} />
              </>
            )}
          </div>
        )}
      </main>

      {view === "stories" && inspectorOpen && (
        <ReviewInspector
          c={c} story={story} comments={storyComments} activity={storyActivity} profile={profile}
          tab={inspectorTab} setTab={setInspectorTab}
          onCreateComment={onCreateComment} patch={patch}
          anchors={{
            pinNumberById, activeAnchorId, setActiveAnchorId, onResolveComment, onToggleReaction,
            jumpToAnchor, anchorMode, setAnchorMode, canPlacePin, pendingAnchor,
            clearPendingAnchor: () => setPendingAnchor(null),
            canvasState: { viewport, args, theme: protoTheme },
            currentUserId: profile?.id,
          }}
          editLinear={editLinear} setEditLinear={setEditLinear}
          sc0={sc0} sc1={sc1} liveLinear={liveLinear} linearId={linearId}
          copyReviewLink={copyReviewLink} copiedReviewLink={copiedReviewLink}
          reviewLinkCopyError={reviewLinkCopyError}
          isDrawer={breakpoints.inspectorDrawer} onClose={() => setInspectorOpen(false)}
        />
      )}

      {activeAnchorId && view === "stories" && layout === "single" && (
        <AnchorLeaderLine c={c} commentId={activeAnchorId} />
      )}

      {showNewDialog && (
        <NewPrototypeDialog c={c} groups={Object.keys(groups)} restoreFocus={newDialogReturnFocusRef.current} onClose={() => setShowNewDialog(false)} onCreate={onNewProject} />
      )}
      {deleteCandidate && (
        <DeletePrototypeDialog c={c} project={deleteCandidate.project} restoreFocus={deleteCandidate.restoreFocus} onClose={() => setDeleteCandidate(null)}
          onConfirm={async () => {
            await onDeleteProject?.(deleteCandidate.project.id);
            setDeleteCandidate(null);
          }} />
      )}
      <ToastHost c={c} toasts={toasts} onDismiss={onDismissToast} />
    </div>
  );
}

function WorkspaceSidebar({
  c, media, view, setView, query, setQuery, groups, activeId, onSelect, isAdmin, currentUserId,
  onNewProject, dragId, setDragId, dropTargetId, setDropTargetId, handleDrop,
  renamingId, setRenamingId, commitRename,
  renamingGroup, setRenamingGroup, commitGroupRename,
  storyMenuId, setStoryMenuId,
  onDeleteProject, moveStory, projectOrder, copiedPrompt, copySetupPrompt, userEmail, onOpenAdmin, onSignOut,
  linearByProject,
  unreadByProject, commentCountByProject,
  isDrawer, onClose,
}) {
  const hasResults = Object.keys(groups).length > 0;
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const drawerRef = useDrawerFocus(isDrawer, onClose);
  return (
    <aside data-tutorial="prototype-library" ref={drawerRef} className="eon-sidebar" role={isDrawer ? "dialog" : "navigation"} aria-modal={isDrawer || undefined} aria-label="Prototype navigation" style={{ background: c.nav, borderColor: c.border }}>
      <div className="eon-sidebar-head" style={{ borderColor: c.border }}>
        <div className="eon-brand-row">
          <div className="eon-brand">
            <BrandMark c={c} src={media.eonLogo} />
            <span>Eon Prototypes</span>
          </div>
          {isDrawer && <button data-drawer-close className="eon-buttonish eon-icon-button" onClick={onClose} aria-label="Close prototype navigation" style={{ color: c.muted }}><X size={17} /></button>}
        </div>
        <div className="eon-sidebar-switcher" style={{ background: c.raised }}>
          {["stories", "media"].map((item) => {
            const selected = view === item;
            return (
              <button className="eon-buttonish" key={item} onClick={() => { setView(item); if (isDrawer) onClose(); }} aria-pressed={selected}
                style={{ flex: 1, minHeight: 34, border: 0, borderRadius: 7, background: selected ? c.panel : "transparent", color: selected ? c.text : c.muted, cursor: "pointer", fontSize: 13, fontWeight: selected ? 600 : 400 }}>
                {item === "stories" ? "Prototypes" : "Media"}
              </button>
            );
          })}
        </div>
        {view === "stories" && (
          <>
            <div className="eon-sidebar-search-row">
              <div className="eon-sidebar-search">
                <Search aria-hidden="true" />
                <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search prototypes" aria-label="Search prototypes"
                  style={{ minHeight: 40, paddingLeft: 34, background: c.raised, borderColor: c.border, color: c.text, borderRadius: 10 }} />
              </div>
            </div>
            <button data-tutorial="setup-prompt" className="eon-buttonish eon-secondary-button" onClick={copySetupPrompt}
              title="Includes the current controls, selected values, viewports, and shared media variables" style={{ borderColor: c.border, background: c.raised, color: copiedPrompt ? c.brand : c.secondary }}>
              {copiedPrompt ? <Check size={14} /> : <Copy size={14} />}
              {copiedPrompt ? "Copied setup prompt" : "Copy setup prompt"}
            </button>
          </>
        )}
      </div>

      <div className="eon-story-list">
        {view === "stories" ? <>
          <button className="eon-buttonish eon-new-story" onClick={onNewProject} style={{ borderColor: c.border, color: c.secondary }}>
            <Plus size={17} /> New prototype
          </button>
          {!hasResults && (
            <div className="eon-sidebar-empty" style={{ color: c.muted }}>
              <Search size={18} />
              <strong style={{ color: c.text }}>No prototypes found</strong>
              <span>Try a different name or group.</span>
            </div>
          )}
          {Object.entries(groups).map(([group, items]) => (
          <div key={group} style={{ marginBottom: 10 }}>
            {renamingGroup === group ? (
              <div className="eon-group-label">
                <ChevronDown size={13} color={c.muted} />
                <input autoFocus defaultValue={group} aria-label={`Rename group ${group}`} className="eon-group-rename"
                  onBlur={(event) => commitGroupRename(group, event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") event.currentTarget.blur();
                    if (event.key === "Escape") setRenamingGroup(null);
                  }}
                  style={{ background: c.bg, borderColor: c.brand, color: c.text }} />
              </div>
            ) : (
              <div className="eon-group-label-row">
                <button className="eon-buttonish eon-group-toggle" onClick={() => setCollapsedGroups((current) => ({ ...current, [group]: !current[group] }))}
                  aria-expanded={!collapsedGroups[group]} style={{ color: c.muted }}>
                  <ChevronDown size={13} className={collapsedGroups[group] ? "is-collapsed" : ""} /> {group}
                </button>
                {isAdmin && (
                  <button className="eon-buttonish eon-group-edit" onClick={() => setRenamingGroup(group)} aria-label={`Rename group ${group}`} title="Rename group" style={{ color: c.muted }}>
                    <Pencil size={12} />
                  </button>
                )}
              </div>
            )}
            {!collapsedGroups[group] && items.map((item) => {
              const active = activeId === item.id;
              const linearState = linearByProject[item.id]?.state;
              const statusColor = linearState?.color || (STATUS_COLOR[item.status] || STATUS_COLOR.Exploration)[1];
              // Members can delete only prototypes they created; admins manage anything.
              const canDelete = isAdmin || item.created_by === currentUserId;
              return (
                <div className="eon-story-row" key={item.id} draggable={isAdmin} data-story-menu={item.id}
                  onDragStart={() => setDragId(item.id)}
                  onDragEnd={() => { setDragId(null); setDropTargetId(null); }}
                  onDragOver={(event) => { if (dragId) { event.preventDefault(); setDropTargetId(item.id); } }}
                  onDragLeave={() => setDropTargetId((current) => current === item.id ? null : current)}
                  onDrop={() => handleDrop(item.id)}
                  style={{ background: active ? c.active : "transparent", borderTopColor: dropTargetId === item.id && dragId !== item.id ? c.brand : "transparent", opacity: dragId === item.id ? 0.45 : 1 }}>
                  {renamingId === item.id ? (
                    <div className="eon-story-rename">
                      <Circle size={13} color={c.brand} />
                      <input autoFocus defaultValue={item.title} aria-label={`Rename ${item.title}`}
                        onBlur={(event) => commitRename(item.id, event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") event.currentTarget.blur();
                          if (event.key === "Escape") setRenamingId(null);
                        }}
                        style={{ background: c.bg, borderColor: c.brand, color: c.text }} />
                    </div>
                  ) : (
                    <button className="eon-buttonish eon-story-select" onClick={() => { onSelect(item); setView("stories"); setStoryMenuId(null); if (isDrawer) onClose(); }}
                      onDoubleClick={() => isAdmin && setRenamingId(item.id)} title={isAdmin ? "Double-click to rename" : undefined}
                      aria-label={`${item.title}, ${linearState?.name || item.status}`} aria-current={active ? "page" : undefined} style={{ color: active ? c.text : c.secondary, fontWeight: active ? 600 : 400 }}>
                      <span className="eon-status-dot" aria-hidden="true" style={{ "--status-color": statusColor, background: statusColor }} />
                      <span>{item.title}</span>
                      {unreadByProject[item.id] > 0 && <span className="eon-unread-count" style={{ background: c.brand, color: c.primaryText }}>{unreadByProject[item.id]}</span>}
                      {!unreadByProject[item.id] && commentCountByProject[item.id] > 0 && <span className="eon-comment-count" style={{ color: c.muted }}>{commentCountByProject[item.id]}</span>}
                    </button>
                  )}
                  {canDelete && renamingId !== item.id && (
                    <div style={{ position: "relative", flexShrink: 0 }}>
                      <button className="eon-buttonish eon-icon-button" onClick={() => setStoryMenuId((current) => current === item.id ? null : item.id)}
                        aria-label={`Actions for ${item.title}`} aria-expanded={storyMenuId === item.id} style={{ color: c.muted }}>
                        <MoreHorizontal size={16} />
                      </button>
                      {storyMenuId === item.id && (
                        <div className="eon-story-menu" role="menu" style={{ background: c.panel, boxShadow: hubShadow(c) }}>
                          {isAdmin && <button className="eon-buttonish" role="menuitem" onClick={() => { setRenamingId(item.id); setStoryMenuId(null); }} style={{ color: c.text }}><Pencil size={14} /> Rename</button>}
                          {isAdmin && <button className="eon-buttonish" role="menuitem" disabled={projectOrder.indexOf(item.id) === 0} onClick={() => { moveStory(item.id, -1); setStoryMenuId(null); }} style={{ color: c.text }}><ArrowUp size={14} /> Move up</button>}
                          {isAdmin && <button className="eon-buttonish" role="menuitem" disabled={projectOrder.indexOf(item.id) === projectOrder.length - 1} onClick={() => { moveStory(item.id, 1); setStoryMenuId(null); }} style={{ color: c.text }}><ArrowDown size={14} /> Move down</button>}
                          <button className="eon-buttonish" role="menuitem" onClick={(event) => {
                            const restoreFocus = event.currentTarget.closest("[data-story-menu]")?.querySelector('button[aria-label^="Actions for"]');
                            setStoryMenuId(null);
                            onDeleteProject?.(item.id, restoreFocus);
                          }} style={{ color: "#FF6B8A" }}><Trash2 size={14} /> Delete</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          ))}
        </> : (
          <div className="eon-sidebar-mode-info" style={{ color: c.muted }}>
            <span className="eon-sidebar-mode-icon" style={{ background: c.active, color: c.brand }}><Upload size={18} /></span>
            <strong style={{ color: c.text }}>Shared media</strong>
            <span>Logos, images, and tokens stay in sync across every prototype.</span>
          </div>
        )}
      </div>

      <div className="eon-sidebar-foot" style={{ borderColor: c.border }}>
        <span style={{ color: c.muted }}>{userEmail}</span>
        {isAdmin && <button className="eon-buttonish eon-icon-button" onClick={onOpenAdmin} aria-label="Admin dashboard" title="Admin dashboard" style={{ color: c.muted, boxShadow: hubShadow(c) }}><Shield size={15} /></button>}
        <button className="eon-buttonish eon-icon-button" onClick={onSignOut} aria-label="Sign out" title="Sign out" style={{ color: c.muted, boxShadow: hubShadow(c) }}><LogOut size={15} /></button>
      </div>
    </aside>
  );
}

function WorkspaceToolbar({
  c, view, story, liveLinear, sc0, sc1, coViewers = [], liveLinked = false, navOpen, onToggleNav, inspectorOpen,
  onToggleInspector, hubTheme, setHubTheme, showUpload, setShowUpload, openFull,
  viewport, setViewport, layout, setLayout, compare, setCompare,
  saveState, onRetrySave, onOpenLinear,
}) {
  return (
    <header className="eon-toolbar" style={{ background: c.nav, borderColor: c.border }}>
      <div className="eon-toolbar-primary">
        <button data-tutorial="nav-toggle" className="eon-buttonish eon-icon-button" onClick={onToggleNav}
          aria-label={navOpen ? "Collapse prototype navigation" : "Open prototype navigation"} aria-pressed={navOpen} style={{ color: c.muted, boxShadow: hubShadow(c) }}>
          {navOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
        </button>
        <div data-tutorial="prototype-title" className="eon-toolbar-title">
          <span>{view === "media" ? "Media library" : story.title}</span>
          {view === "stories" && (liveLinear?.state
            ? <Badge data-tutorial="review-status" className="eon-story-status" title="Synced from Linear" style={{ background: `${liveLinear.state.color}26`, color: liveLinear.state.color, border: 0, fontWeight: 600 }}>{liveLinear.state.name} · Linear</Badge>
            : <button data-tutorial="review-status" className="eon-buttonish eon-status-button" onClick={onOpenLinear} aria-label={`Review status: ${story.status}. Open Linear context`}>
                <Badge className="eon-story-status" style={{ background: sc0, color: sc1, border: 0, fontWeight: 600 }}>{story.status}</Badge>
                <ChevronDown size={12} style={{ color: c.muted }} />
              </button>)}
        </div>
        {view === "stories" && <PresenceAvatars c={c} viewers={coViewers} />}
        <div style={{ flex: 1 }} />
        {view === "stories" && <SaveIndicator c={c} state={saveState} onRetry={onRetrySave} />}
        <button className="eon-buttonish eon-icon-button" onClick={() => setHubTheme(hubTheme === "dark" ? "light" : "dark")}
          aria-label={`Switch hub interface to ${hubTheme === "dark" ? "light" : "dark"} theme`} title="Hub interface theme" style={{ color: c.muted, boxShadow: hubShadow(c) }}>
          {hubTheme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        {view === "stories" && (
          <>
            <button data-tutorial="prototype-upload" className="eon-buttonish eon-secondary-button eon-upload-button" onClick={() => setShowUpload((open) => !open)} aria-expanded={showUpload} aria-label={liveLinked ? "Upload prototype HTML (live file sync active)" : "Upload prototype HTML"} title={liveLinked ? "Live file sync active" : "Upload prototype HTML"}
              style={{ borderColor: showUpload ? c.brand : c.border, background: c.panel, color: showUpload ? c.brand : c.secondary }}>
              <Upload size={15} /> <span>Upload HTML</span>
              {liveLinked && <span className="eon-live-badge" style={{ background: c.active, color: c.brand }}><span className="eon-live-dot" aria-hidden="true" />Live</span>}
            </button>
            <Button className="eon-buttonish eon-full-button" onClick={openFull} aria-label="Open prototype in full view" title="Open prototype in full view" style={{ minHeight: 40, background: c.primary, color: c.primaryText, borderRadius: 10, gap: 7, fontSize: 13, fontWeight: 600 }}>
              <Maximize2 size={15} /> <span>Open full view</span>
            </Button>
            <button data-tutorial="review-toggle" className="eon-buttonish eon-icon-button" onClick={onToggleInspector}
              aria-label={inspectorOpen ? "Close review panel" : "Open review panel"} aria-pressed={inspectorOpen} title="Review panel" style={{ color: inspectorOpen ? c.brand : c.muted, boxShadow: hubShadow(c) }}>
              {inspectorOpen ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
            </button>
          </>
        )}
      </div>

      {view === "stories" && (
        <div className="eon-toolbar-tools">
          <ToolGroup label="Viewport" c={c}>
            <div className="eon-icon-segment" style={{ background: c.raised }}>
              {Object.keys(VIEWPORTS).map((key) => {
                const Icon = VP_ICON[key];
                const selected = viewport === key;
                return <button data-tutorial={key === "mobile" ? "viewport-mobile" : undefined} className="eon-buttonish eon-icon-button" key={key} onClick={() => setViewport(key)} title={VIEWPORTS[key].label} aria-label={`${VIEWPORTS[key].label} viewport`} aria-pressed={selected} style={{ color: selected ? c.selectedText : c.muted, background: selected ? c.selected : "transparent" }}><Icon size={16} /></button>;
              })}
            </div>
          </ToolGroup>
          <ToolGroup label="View" c={c}>
            <div className="eon-icon-segment" style={{ background: c.raised }}>
              {[["single", Square, "Single view"], ["grid", LayoutGrid, "All states"]].map(([key, Icon, label]) => {
                const selected = layout === key;
                return <button className="eon-buttonish eon-icon-button" key={key} onClick={() => setLayout(key)} title={label} aria-label={label} aria-pressed={selected} style={{ color: selected ? c.selectedText : c.muted, background: selected ? c.selected : "transparent" }}><Icon size={16} /></button>;
              })}
            </div>
          </ToolGroup>
          <div className="eon-tool-compare">
            <ToolGroup label="Compare with Figma" c={c}>
              <div className="eon-icon-segment" style={{ background: c.raised }}>
                <button data-tutorial="figma-compare" className="eon-buttonish eon-icon-button" onClick={() => setCompare((value) => !value)}
                  title="Compare with the linked Figma frame" aria-label="Compare with Figma" aria-pressed={compare}
                  style={{ color: compare ? c.selectedText : c.muted, background: compare ? c.selected : "transparent" }}>
                  <FigmaIcon size={16} />
                </button>
              </div>
            </ToolGroup>
          </div>
        </div>
      )}
    </header>
  );
}

/* ---- Floating pill bar over the canvas: prototype state pills, grid fan-out,
   prototype theme, canvas background. Zoom floats separately, bottom-right. ---- */
function CanvasControlBar({
  c, layout, effStory, args, setArg, gridOptions, effGridBy, setGridBy,
  protoTheme, setProtoTheme, canvasBg, setCanvasBg, segmented, compact,
}) {
  const [open, setOpen] = useState(false);
  const sheetRef = useDrawerFocus(compact && open, () => setOpen(false));
  const firstControl = layout === "single" ? (effStory.controls || [])[0] : null;
  const activeSummary = firstControl ? args[firstControl.key] : (layout === "grid" ? effGridBy : protoTheme);
  const controlContent = (
    <>
      {layout === "single" && (effStory.controls || []).map((control) => (
        <ToolGroup key={control.key} label={control.label} c={c}>{segmented(control.options, args[control.key], (value) => setArg(control.key, value))}</ToolGroup>
      ))}
      {layout === "grid" && <ToolGroup label="Lay out by" c={c}>{segmented(gridOptions, effGridBy, setGridBy)}</ToolGroup>}
      {!(layout === "grid" && effGridBy === "themes") && <ToolGroup label="Prototype" c={c}>{segmented(["light", "dark"], protoTheme, setProtoTheme)}</ToolGroup>}
      <ToolGroup label="Canvas" c={c}>
        <div className="eon-swatches">
          {CANVAS_PRESETS.map((background) => (
            <button className="eon-buttonish eon-swatch-hit" key={background} onClick={() => setCanvasBg(background)} title={background === "#FFFFFF" ? "White canvas" : "Black canvas"} aria-label={`Canvas background ${background}`} aria-pressed={canvasBg === background}>
              <span style={{ background, boxShadow: canvasBg === background ? `0 0 0 2px ${c.brand}` : `0 0 0 1px ${c.border}` }} />
            </button>
          ))}
          <label className="eon-swatch-hit" title="Custom canvas color">
            <span className="eon-color-swatch" />
            <input type="color" value={canvasBg} onChange={(event) => setCanvasBg(event.target.value)} aria-label="Custom canvas background color" />
          </label>
        </div>
      </ToolGroup>
    </>
  );

  useEffect(() => {
    if (!compact) setOpen(false);
  }, [compact]);

  if (compact) {
    return (
      <div className="eon-mobile-controls">
        <button data-tutorial="canvas-controls" className="eon-buttonish eon-controls-trigger" onClick={() => setOpen(true)}
          aria-expanded={open} aria-haspopup="dialog" aria-controls="eon-mobile-controls-sheet"
          style={{ background: c.panel, color: c.text, boxShadow: c.bg === "#000000" ? "0 8px 30px rgba(0,0,0,.35)" : "0 8px 30px rgba(0,0,0,.14)" }}>
          <SlidersHorizontal size={16} aria-hidden="true" />
          <span>Controls</span>
          <span className="eon-controls-trigger-value" style={{ color: c.muted }}>{String(activeSummary || "")}</span>
        </button>
        {open && (
          <>
            <button className="eon-controls-scrim" onClick={() => setOpen(false)} aria-label="Close prototype controls" />
            <section ref={sheetRef} id="eon-mobile-controls-sheet" className="eon-controls-sheet" role="dialog" aria-modal="true" aria-labelledby="eon-mobile-controls-title"
              style={{ background: c.panel, color: c.text, boxShadow: "0 -20px 60px rgba(0,0,0,.32)" }}>
              <div className="eon-controls-sheet-head" style={{ borderColor: c.border }}>
                <div>
                  <strong id="eon-mobile-controls-title">Prototype controls</strong>
                  <span style={{ color: c.muted }}>Adjust the state and appearance</span>
                </div>
                <button data-drawer-close className="eon-buttonish eon-icon-button" onClick={() => setOpen(false)} aria-label="Close prototype controls" style={{ color: c.muted }}><X size={17} /></button>
              </div>
              <div className="eon-controls-sheet-body">{controlContent}</div>
            </section>
          </>
        )}
      </div>
    );
  }

  return (
    <div data-tutorial="canvas-controls" className="eon-ctlbar eon-ctlbar-float" style={{ background: c.panel, border: `1px solid ${c.border}`, boxShadow: c.bg === "#000000" ? "0 8px 30px rgba(0,0,0,.35)" : "0 8px 30px rgba(0,0,0,.14)" }}>
      {controlContent}
    </div>
  );
}

function ToolGroup({ label, c, children }) {
  return <div className="eon-tool-group"><span style={{ color: c.muted }}>{label}</span>{children}</div>;
}

function ReviewInspector({
  c, story, comments, activity = [], profile, tab, setTab, onCreateComment, patch,
  anchors, editLinear, setEditLinear, sc0, sc1, liveLinear, linearId,
  copyReviewLink, copiedReviewLink, reviewLinkCopyError, isDrawer, onClose,
}) {
  const drawerRef = useDrawerFocus(isDrawer, onClose);
  return (
    <aside data-tutorial="review-panel" ref={drawerRef} className="eon-inspector" role={isDrawer ? "dialog" : undefined} aria-modal={isDrawer || undefined} aria-label="Review panel" style={{ background: c.nav, borderColor: c.border }}>
      <div className="eon-inspector-head" style={{ borderColor: c.border }}>
        <div className="eon-inspector-title">
          <strong>Review workspace</strong>
          <span style={{ color: c.muted }}>Feedback and delivery context</span>
        </div>
        <div className="eon-inspector-actions">
          <button data-tutorial="share-review" className="eon-buttonish eon-secondary-button eon-share-link-button" onClick={copyReviewLink}
            title={reviewLinkCopyError || (copiedReviewLink ? "Review link copied" : "Copy this exact review view")}
            style={{ borderColor: c.border, background: c.panel, color: copiedReviewLink ? c.brand : c.secondary }}>
            {copiedReviewLink ? <Check size={14} /> : <Link2 size={14} />}
            <span>{copiedReviewLink ? "Copied" : "Copy link"}</span>
          </button>
          {isDrawer && <button data-drawer-close className="eon-buttonish eon-icon-button" onClick={onClose} aria-label="Close review panel" style={{ color: c.muted }}><X size={17} /></button>}
        </div>
        {reviewLinkCopyError && <span role="alert" className="eon-visually-hidden">{reviewLinkCopyError}</span>}
      </div>
      <Tabs value={tab} onValueChange={setTab} className="eon-inspector-tabs">
        <TabsList className="eon-review-tabs" style={{ background: c.raised }}>
          <TabsTrigger data-tutorial="comments-tab" value="comments"><MessageSquare size={14} /> Comments <span className="eon-count" style={{ background: c.panel, color: c.muted }}>{comments.length}</span></TabsTrigger>
          <TabsTrigger data-tutorial="history-tab" value="history"><History size={14} /> History</TabsTrigger>
          <TabsTrigger data-tutorial="linear-tab" value="linear"><LinearIcon size={14} /> Linear</TabsTrigger>
        </TabsList>
        <TabsContent data-tutorial="comments-thread" value="comments" className="eon-inspector-content">
          <CommentThread c={c} comments={comments} profile={profile} projectId={story.id} onCreateComment={onCreateComment} anchors={anchors} />
        </TabsContent>
        <TabsContent data-tutorial="history-thread" value="history" className="eon-inspector-content">
          <HistoryTimeline c={c} activity={activity} currentUserId={profile?.id} />
        </TabsContent>
        <TabsContent data-tutorial="linear-content" value="linear" className="eon-inspector-content eon-reference-content">
          <ReviewReadiness c={c} story={story} comments={comments} />
          <ReferenceHeader c={c} icon={LinearIcon} label="Linear issue" hasValue={Boolean(story.issue_url)} editing={editLinear} setEditing={setEditLinear} />
          {(!story.issue_url || editLinear) && <Input aria-label="Linear issue URL" value={story.issue_url || ""} onChange={(event) => patch("issue_url", event.target.value)} placeholder="Paste a Linear issue URL" style={{ minHeight: 40, background: c.bg, borderColor: c.border, color: c.text, borderRadius: 10 }} />}
          <LinearCard c={c} story={story} sc0={sc0} sc1={sc1} live={liveLinear} identifier={linearId} issueUrl={story.issue_url} />
        </TabsContent>
      </Tabs>
    </aside>
  );
}

function ReviewReadiness({ c, story, comments }) {
  const checklist = [
    { label: "Prototype uploaded", done: Boolean(story.prototype_html || ["signin", "dashboard"].includes(story.slug)) },
    { label: "Figma source linked", done: Boolean(story.figma_url) },
    { label: "Linear issue linked", done: Boolean(story.issue_url || story.issue_id) },
    { label: "Team feedback started", done: comments.length > 0 },
  ];

  return (
      <section className="eon-readiness-card" style={{ color: c.secondary, background: c.panel }}>
        <div className="eon-readiness-heading"><div><strong style={{ color: c.text }}>Review readiness</strong><span style={{ color: c.muted }}>{checklist.filter((item) => item.done).length} of {checklist.length} signals ready</span></div></div>
        <div className="eon-readiness-list">
          {checklist.map((item) => (
            <div key={item.label} className="eon-readiness-item" style={{ color: item.done ? c.secondary : c.muted }}>
              <span style={{ background: item.done ? c.active : c.raised, color: item.done ? c.brand : c.muted }}>{item.done ? <Check size={12} /> : <Circle size={10} />}</span>
              {item.label}
            </div>
          ))}
        </div>
      </section>
  );
}

/* ---- Large Figma pane for the side-by-side compare: slim unfurl header over
   the full-bleed embed. The Figma link is edited here, not in the panel. ---- */
function FigmaPane({ c, story, ratio, patch, editing, setEditing }) {
  const meta = figmaMeta(story.figma_url || "");
  const linkInput = (
    <Input aria-label="Figma share URL" value={story.figma_url || ""} onChange={(event) => patch("figma_url", event.target.value)} placeholder="Paste a Figma share URL"
      style={{ minHeight: 40, background: c.bg, borderColor: c.border, color: c.text, borderRadius: 10 }} />
  );
  return (
    <div className="eon-compare-pane" style={{ flex: `${1 - ratio} 1 0%`, background: c.nav, borderColor: c.border }}>
      {meta.valid ? (
        <>
          <div className="eon-compare-head" style={{ borderColor: c.border }}>
            <FigmaIcon size={15} />
            <div className="eon-compare-meta">
              <strong>{meta.title}</strong>
              {meta.node && <span style={{ color: c.muted }}>Node {meta.node}</span>}
            </div>
            <button className="eon-buttonish eon-text-button" onClick={() => setEditing((value) => !value)} style={{ color: editing ? c.brand : c.secondary }}>
              {editing ? "Done" : "Edit link"}
            </button>
            <a className="eon-buttonish eon-secondary-button" href={story.figma_url} target="_blank" rel="noreferrer"
              style={{ borderColor: c.border, background: c.raised, color: c.secondary, textDecoration: "none" }}>
              <ExternalLink size={13} aria-hidden="true" /> Open in Figma
            </a>
          </div>
          {editing && <div className="eon-compare-edit">{linkInput}</div>}
          <div className="eon-compare-embed"><FigmaEmbed url={story.figma_url} /></div>
        </>
      ) : (
        <div className="eon-compare-empty">
          <ReferenceEmpty c={c} icon={FigmaIcon} title="No Figma frame linked" body="Paste a share URL to compare the source design here." />
          {linkInput}
        </div>
      )}
    </div>
  );
}

function ReferenceHeader({ c, icon: Icon, label, hasValue, editing, setEditing }) {
  return (
    <div className="eon-reference-head">
      <div>{Icon && <Icon size={15} style={{ color: c.secondary }} />}<strong>{label}</strong></div>
      {hasValue && <button className="eon-buttonish eon-text-button" onClick={() => setEditing((value) => !value)} style={{ color: editing ? c.brand : c.secondary }}>{editing ? "Done" : "Edit link"}</button>}
    </div>
  );
}

function ReferenceEmpty({ c, icon: Icon, title, body }) {
  return (
    <div className="eon-reference-empty" style={{ color: c.muted, boxShadow: `inset 0 0 0 1px ${c.border}` }}>
      <Icon size={22} />
      <strong style={{ color: c.text }}>{title}</strong>
      <span>{body}</span>
    </div>
  );
}

function CommentThread({ c, comments, profile, projectId, onCreateComment, anchors = {} }) {
  const [draft, setDraft] = useState("");
  const [attachment, setAttachment] = useState(null); // { file, previewUrl }
  const [dragging, setDragging] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("open");
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);
  const initialScroll = useRef(true);

  const openComments = comments.filter((comment) => !comment.resolved_at);
  const resolvedComments = comments.filter((comment) => comment.resolved_at);
  const shown = filter === "resolved" ? resolvedComments : openComments;

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    const nearBottom = node.scrollHeight - node.scrollTop - node.clientHeight < 160;
    const newestIsMine = comments.at(-1)?.author_id === profile?.id;
    if (initialScroll.current || nearBottom || newestIsMine) node.scrollTop = node.scrollHeight;
    initialScroll.current = false;
  }, [comments.length]);

  // A pin picked on the canvas brings its comment into view.
  useEffect(() => {
    if (!anchors.activeAnchorId) return;
    if (comments.find((comment) => comment.id === anchors.activeAnchorId)?.resolved_at) setFilter("resolved");
    const node = scrollRef.current?.querySelector(`[data-comment-id="${anchors.activeAnchorId}"]`);
    node?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [anchors.activeAnchorId]);

  const toggleResolved = async (comment) => {
    if (!anchors.onResolveComment) return;
    setError("");
    try {
      await anchors.onResolveComment(comment.id, !comment.resolved_at);
      if (anchors.activeAnchorId === comment.id) anchors.setActiveAnchorId?.(null);
    } catch (err) {
      setError(err.message || "Couldn't update the comment.");
    }
  };

  const toggleReaction = async (comment, emoji) => {
    if (!anchors.onToggleReaction) return;
    setError("");
    try {
      await anchors.onToggleReaction(comment.id, emoji);
    } catch (err) {
      setError(err.message || "Couldn't save the reaction.");
    }
  };

  // The preview is an object URL, so it has to be released by hand.
  useEffect(() => () => { if (attachment) URL.revokeObjectURL(attachment.previewUrl); }, [attachment]);

  const attach = (file) => {
    if (!file) return;
    if (!file.type?.startsWith("image/")) { setError("That file isn't an image."); return; }
    if (file.size > MAX_COMMENT_IMAGE_BYTES) { setError("Images need to be under 5 MB."); return; }
    setError("");
    setAttachment((current) => {
      if (current) URL.revokeObjectURL(current.previewUrl);
      return { file, previewUrl: URL.createObjectURL(file) };
    });
  };

  const clearAttachment = () => {
    setAttachment((current) => {
      if (current) URL.revokeObjectURL(current.previewUrl);
      return null;
    });
  };

  const onPaste = (event) => {
    const file = [...(event.clipboardData?.items || [])]
      .find((item) => item.kind === "file" && item.type.startsWith("image/"))?.getAsFile();
    if (!file) return; // Let plain text paste through untouched.
    event.preventDefault();
    attach(file);
  };

  const onDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    attach([...(event.dataTransfer?.files || [])].find((file) => file.type.startsWith("image/")));
  };

  const submit = async () => {
    const body = draft.trim();
    if ((!body && !attachment && !anchors.pendingAnchor) || sending) return;
    if (!body && !attachment) return; // a bare pin still needs words or a picture
    const pendingAttachment = attachment;
    const anchor = anchors.pendingAnchor || null;
    setSending(true);
    setError("");
    setDraft("");
    setAttachment(null);
    try {
      const imageUrl = pendingAttachment ? await uploadCommentImage(pendingAttachment.file) : null;
      await onCreateComment(projectId, body, imageUrl, anchor);
      anchors.clearPendingAnchor?.();
      setFilter("open");
      if (pendingAttachment) URL.revokeObjectURL(pendingAttachment.previewUrl);
    } catch (err) {
      setDraft(body);
      setAttachment(pendingAttachment);
      setError(err.message || "Couldn't send your comment.");
    } finally {
      setSending(false);
    }
  };

  const canSend = Boolean(draft.trim() || attachment) && !sending;
  const status = sending
    ? (attachment ? "Uploading image…" : "Sending comment…")
    : anchors.anchorMode ? "Click the prototype to place the pin · Esc to cancel"
    : "Enter to send · paste or drop an image";

  return (
    <div className="eon-comments">
      {(resolvedComments.length > 0 || filter === "resolved") && (
        <div className="eon-comment-filter" role="tablist" aria-label="Filter comments" style={{ borderColor: c.border }}>
          {[["open", "Open", openComments.length], ["resolved", "Resolved", resolvedComments.length]].map(([key, label, count]) => (
            <button key={key} role="tab" aria-selected={filter === key} className="eon-buttonish eon-comment-filter-tab"
              onClick={() => setFilter(key)}
              style={{ color: filter === key ? c.text : c.muted, borderColor: filter === key ? c.brand : "transparent" }}>
              {label} <span style={{ color: c.muted }}>{count}</span>
            </button>
          ))}
        </div>
      )}
      <div ref={scrollRef} className="eon-comment-list" aria-live="polite">
        {shown.length === 0 ? (
          <div className="eon-comment-empty" style={{ color: c.muted }}>
            <span className="eon-comment-empty-icon" style={{ background: c.raised, color: c.brand }}>
              {filter === "resolved" ? <Check size={20} /> : <MessageSquare size={20} />}
            </span>
            <strong style={{ color: c.text }}>{filter === "resolved" ? "Nothing resolved yet" : "Start the conversation"}</strong>
          </div>
        ) : shown.map((comment) => (
          <CommentBubble key={comment.id} c={c} comment={comment} currentUserId={profile?.id}
            pinNumber={anchors.pinNumberById?.[comment.id]}
            active={anchors.activeAnchorId === comment.id}
            onSelect={() => anchors.setActiveAnchorId?.(anchors.activeAnchorId === comment.id ? null : comment.id)}
            stateMismatch={Boolean(comment.anchor && anchors.canvasState
              && !anchorMatchesState(comment.anchor, anchors.canvasState.viewport, anchors.canvasState.args, anchors.canvasState.theme))}
            onJump={() => anchors.jumpToAnchor?.(comment)}
            onToggleResolved={anchors.onResolveComment ? () => toggleResolved(comment) : null}
            onToggleReaction={anchors.onToggleReaction ? (emoji) => toggleReaction(comment, emoji) : null} />
        ))}
      </div>
      <div className="eon-comment-composer" style={{ borderColor: c.border }}
        onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
        onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false); }}
        onDrop={onDrop}>
        {anchors.pendingAnchor && (
          <div className="eon-composer-pin" style={{ borderColor: c.border, background: c.raised, color: c.secondary }}>
            <span className="eon-pin-dot" style={{ background: c.brand, color: "#fff" }}><Pin size={11} /></span>
            <span>Pinned · {anchorStateLabel(anchors.pendingAnchor)}</span>
            <button type="button" className="eon-buttonish eon-text-button" onClick={() => anchors.clearPendingAnchor?.()}
              aria-label="Remove pin" style={{ color: c.muted }}><X size={13} /></button>
          </div>
        )}
        {attachment && (
          <div className="eon-composer-attachment" style={{ borderColor: c.border, background: c.raised }}>
            <img src={attachment.previewUrl} alt={`Attached image: ${attachment.file.name}`} />
            <button type="button" className="eon-buttonish eon-attachment-remove" onClick={clearAttachment}
              aria-label="Remove attached image" style={{ background: c.panel, borderColor: c.border, color: c.secondary }}>
              <X size={13} />
            </button>
          </div>
        )}
        <Textarea value={draft} maxLength={4000} onChange={(event) => setDraft(event.target.value)} onPaste={onPaste}
          onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); submit(); } }}
          placeholder={anchors.pendingAnchor ? "Describe what the pin points at…" : "Write a comment…"} aria-label="Write a comment"
          style={{ minHeight: 76, maxHeight: 180, resize: "vertical", background: c.bg, borderColor: error ? "#FF6B8A" : dragging ? c.brand : c.border, color: c.text, borderRadius: 12, fontSize: 14, lineHeight: 1.5 }} />
        <div className="eon-composer-meta">
          <input ref={fileInputRef} type="file" accept="image/*" hidden
            onChange={(event) => { attach(event.target.files?.[0]); event.target.value = ""; }} />
          {anchors.setAnchorMode && (
            <button type="button" className="eon-buttonish eon-attach-button" onClick={() => anchors.setAnchorMode(!anchors.anchorMode)}
              disabled={sending || !anchors.canPlacePin} aria-pressed={anchors.anchorMode}
              aria-label={anchors.anchorMode ? "Cancel pin placement" : "Pin this comment to the prototype"}
              title={anchors.canPlacePin ? "Pin this comment to a spot on the prototype" : "Pins are placed in single view"}
              style={{ borderColor: anchors.anchorMode ? c.brand : c.border, background: c.panel, color: anchors.anchorMode ? c.brand : c.secondary, opacity: sending || !anchors.canPlacePin ? 0.5 : 1 }}>
              <Pin size={15} />
            </button>
          )}
          <button type="button" className="eon-buttonish eon-attach-button" onClick={() => fileInputRef.current?.click()}
            disabled={sending} aria-label="Attach an image" title="Attach an image"
            style={{ borderColor: c.border, background: c.panel, color: c.secondary, opacity: sending ? 0.5 : 1 }}>
            <ImagePlus size={15} />
          </button>
          <span role={error ? "alert" : "status"} style={{ color: error ? "#FF6B8A" : anchors.anchorMode ? c.brand : c.muted }}>{error || status}</span>
          <Button className="eon-buttonish" onClick={submit} disabled={!canSend}
            style={{ minWidth: 40, minHeight: 40, padding: 0, borderRadius: 10, background: c.primary, color: c.primaryText, opacity: canSend ? 1 : 0.5 }} aria-label="Send comment">
            <Send size={15} />
          </Button>
        </div>
      </div>
    </div>
  );
}

const REACTION_EMOJI = ["👍", "❤️", "🔥", "🎉", "👀", "😕"];

function CommentBubble({
  c, comment, currentUserId, pinNumber, active, onSelect, stateMismatch, onJump, onToggleResolved,
  onToggleReaction,
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const author = comment.author || {};
  const name = author.full_name || author.email?.split("@")[0] || "Teammate";
  const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  const mine = comment.author_id === currentUserId;
  const resolved = Boolean(comment.resolved_at);
  const reactionGroups = useMemo(() => {
    const groups = new Map();
    (comment.reactions || []).forEach((reaction) => {
      const group = groups.get(reaction.emoji) || { emoji: reaction.emoji, count: 0, mine: false };
      group.count += 1;
      if (reaction.profile_id === currentUserId) group.mine = true;
      groups.set(reaction.emoji, group);
    });
    return [...groups.values()];
  }, [comment.reactions, currentUserId]);
  return (
    <article className="eon-comment" data-comment-id={comment.id}
      style={{ opacity: comment.pending ? 0.6 : resolved ? 0.75 : 1, boxShadow: active ? `inset 2px 0 0 ${c.brand}` : "none" }}>
      <div className="eon-comment-avatar" style={{ background: mine ? c.active : c.raised, color: mine ? c.brand : c.secondary }}>{initials || "T"}</div>
      <div className="eon-comment-body">
        <div className="eon-comment-meta">
          {comment.anchor && (
            <button type="button" className="eon-buttonish eon-pin-dot" onClick={onSelect}
              aria-label={`Pin ${pinNumber || ""} — show on the prototype`} aria-pressed={active}
              style={{ background: active ? c.brand : c.raised, color: active ? "#fff" : c.brand, border: `1px solid ${active ? c.brand : c.border}` }}>
              {pinNumber || <Pin size={10} />}
            </button>
          )}
          <strong>{mine ? "You" : name}</strong>
          <time style={{ color: c.muted }} dateTime={comment.created_at}>{relativeTime(comment.created_at)}</time>
          {comment.pending && <span className="eon-pending-label" style={{ color: c.muted }}>Sending…</span>}
          {!comment.pending && onToggleResolved && (
            <button type="button" className="eon-buttonish eon-resolve-button" onClick={onToggleResolved}
              aria-label={resolved ? "Reopen comment" : "Resolve comment"} title={resolved ? "Reopen" : "Resolve"}
              style={{ color: resolved ? c.brand : c.muted }}>
              <Check size={14} />
            </button>
          )}
        </div>
        {comment.body && <p style={{ color: c.secondary }}>{comment.body}</p>}
        {comment.image_url && (
          <a className="eon-comment-image" href={comment.image_url} target="_blank" rel="noreferrer"
            style={{ borderColor: c.border }} aria-label="Open image full size">
            <img src={comment.image_url} alt={comment.body || `Image shared by ${mine ? "you" : name}`} loading="lazy" />
          </a>
        )}
        {comment.anchor && stateMismatch && !resolved && (
          <button type="button" className="eon-buttonish eon-anchor-context" onClick={onJump}
            title="Show the prototype exactly as it looked when this pin was placed"
            style={{ borderColor: c.border, background: c.raised, color: c.secondary }}>
            <Pin size={11} /> {anchorStateLabel(comment.anchor)}
          </button>
        )}
        {(reactionGroups.length > 0 || (onToggleReaction && !comment.pending)) && (
          <div className="eon-reactions">
            {reactionGroups.map((group) => (
              <button key={group.emoji} type="button" className="eon-buttonish eon-reaction-chip"
                onClick={onToggleReaction ? () => onToggleReaction(group.emoji) : undefined}
                aria-pressed={group.mine} aria-label={`${group.emoji} ${group.count} — toggle reaction`}
                style={{ borderColor: group.mine ? c.brand : c.border, background: group.mine ? c.active : c.raised, color: c.secondary }}>
                {group.emoji} <span style={{ color: group.mine ? c.brand : c.muted }}>{group.count}</span>
              </button>
            ))}
            {onToggleReaction && !comment.pending && (
              <button type="button" className="eon-buttonish eon-reaction-add" onClick={() => setPickerOpen((open) => !open)}
                aria-label="Add reaction" aria-expanded={pickerOpen}
                style={{ borderColor: c.border, background: c.raised, color: c.muted }}>
                <SmilePlus size={12} />
              </button>
            )}
            {pickerOpen && (
              <div className="eon-reaction-picker" role="menu" style={{ background: c.panel, borderColor: c.border, boxShadow: "0 8px 24px rgba(0,0,0,.3)" }}>
                {REACTION_EMOJI.map((emoji) => (
                  <button key={emoji} type="button" role="menuitem" className="eon-buttonish"
                    onClick={() => { onToggleReaction(emoji); setPickerOpen(false); }} aria-label={`React with ${emoji}`}>
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {resolved && <span className="eon-resolved-label" style={{ color: c.muted }}><Check size={11} /> Resolved</span>}
      </div>
    </article>
  );
}

/* ---- Quick-comment ring: the most common feedback, one click after pinning.
   Emoji options post as-is; labeled options post their body; Write… falls
   through to the composer. ---- */
const QUICK_PIN_OPTIONS = [
  { key: "copy",  icon: "✏️", label: "Change copy", body: "✏️ Change copy" },
  { key: "slop",  icon: "🤖", label: "AI slop", body: "🤖 AI slop — needs a human pass" },
  { key: "up",    icon: "👍", label: "Like", body: "👍" },
  { key: "love",  icon: "❤️", label: "Love", body: "❤️" },
  { key: "fire",  icon: "🔥", label: "Fire", body: "🔥" },
  { key: "hmm",   icon: "😕", label: "Not sure", body: "😕" },
  { key: "write", icon: null, label: "Write…", write: true },
];

function PinRing({ c, x, y, onPick, onWrite, onCancel }) {
  const radius = 74;
  return (
    <div className="eon-pin-ring" style={{ left: x, top: y }} role="menu" aria-label="Quick comment">
      {QUICK_PIN_OPTIONS.map((option, index) => {
        const angle = ((index * 360) / QUICK_PIN_OPTIONS.length - 90) * (Math.PI / 180);
        return (
          <button key={option.key} type="button" role="menuitem" className="eon-buttonish eon-pin-ring-item"
            style={{ left: Math.cos(angle) * radius, top: Math.sin(angle) * radius, background: c.panel, borderColor: c.border, color: c.text, animationDelay: `${index * 18}ms` }}
            onClick={() => (option.write ? onWrite() : onPick(option.body))}
            aria-label={option.label}>
            {option.icon || <MessageSquare size={15} />}
            <span className="eon-ring-label" style={{ background: c.panel, borderColor: c.border, color: c.secondary }}>{option.label}</span>
          </button>
        );
      })}
      <button type="button" className="eon-buttonish eon-pin-ring-center" onClick={onCancel} aria-label="Cancel pin"
        style={{ background: c.raised, borderColor: c.border, color: c.secondary }}>
        <X size={13} />
      </button>
    </div>
  );
}

/* ---- Inline composer at the pin: type, Enter posts the anchored comment ---- */
function PinComposer({ c, x, y, frameWidth, onSubmit, onCancel }) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);
  // Flip to the left of the pin when the panel would spill past the frame.
  const width = 232;
  const flip = x + 16 + width > frameWidth;
  return (
    <div className="eon-pin-composer" style={{ left: flip ? x - 16 - width : x + 16, top: y, width, background: c.panel, borderColor: c.border }}>
      <Textarea ref={inputRef} value={draft} maxLength={4000} rows={2}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault();
            if (draft.trim()) onSubmit(draft.trim());
          }
        }}
        placeholder="Comment…" aria-label="Write a pinned comment"
        style={{ minHeight: 54, maxHeight: 120, resize: "none", background: c.bg, borderColor: c.border, color: c.text, borderRadius: 9, fontSize: 13, lineHeight: 1.45 }} />
      <div className="eon-pin-composer-meta">
        <span style={{ color: c.muted }}>Enter to send</span>
        <button type="button" className="eon-buttonish eon-pin-composer-send" onClick={() => draft.trim() && onSubmit(draft.trim())}
          disabled={!draft.trim()} aria-label="Send pinned comment"
          style={{ background: c.primary, color: c.primaryText, opacity: draft.trim() ? 1 : 0.5 }}>
          <Send size={13} />
        </button>
      </div>
    </div>
  );
}

// A body that is just one emoji (a ring quick-take) — the pin wears it directly.
function emojiOnlyBody(body) {
  const text = (body || "").trim();
  if (!text || /\s/.test(text) || [...text].length > 3) return null;
  return /^\p{Extended_Pictographic}/u.test(text) ? text : null;
}

/* ---- Pins on the canvas: dots over the iframe at each anchored comment ---- */
function PinOverlay({
  c, pins, pendingAnchor, rects, vp, frameScale, activeAnchorId, currentUserId, onPickPin,
  ringOpen, pinWriteOpen, onQuickComment, onWriteComment, onCancelRing,
}) {
  const place = (anchor) => {
    const point = anchorPoint(anchor, rects, vp.w, vp.h);
    if (!point) return null;
    // Clamp inside the frame so pins on scrolled-away elements stay reachable.
    return {
      left: Math.min(Math.max(point.x * frameScale, 10), vp.w * frameScale - 10),
      top: Math.min(Math.max(point.y * frameScale, 10), vp.h * frameScale - 10),
    };
  };
  const pendingPoint = pendingAnchor ? place(pendingAnchor) : null;
  return (
    <div className="eon-pin-overlay" aria-hidden={pins.length === 0 && !pendingPoint}>
      {pins.map(({ comment, number }) => {
        const point = place(comment.anchor);
        if (!point) return null;
        const active = comment.id === activeAnchorId;
        // Quick emoji takes wear the emoji itself; everything else is numbered.
        const emoji = emojiOnlyBody(comment.body);
        const author = comment.author || {};
        const name = comment.author_id === currentUserId ? "You" : (author.full_name || author.email?.split("@")[0] || "Teammate");
        return (
          <button key={comment.id} type="button" data-pin-id={comment.id}
            className={`eon-buttonish eon-canvas-pin${emoji ? " eon-canvas-pin-emoji" : ""}`}
            onClick={() => onPickPin(comment)}
            aria-label={`Comment pin ${number} by ${name}: ${comment.body || "image"}`} aria-pressed={active}
            style={{ left: point.left, top: point.top, background: active ? c.brand : c.panel, color: active ? "#fff" : c.brand, borderColor: c.brand, transform: active ? "scale(1.15)" : undefined }}>
            {emoji || number}
            <span className="eon-pin-card" data-below={point.top < 130 || undefined} aria-hidden="true"
              style={{ background: c.panel, borderColor: c.border, boxShadow: "0 10px 30px rgba(0,0,0,.35)" }}>
              <span className="eon-pin-card-meta"><strong style={{ color: c.text }}>{name}</strong><span style={{ color: c.muted }}>{relativeTime(comment.created_at)}</span></span>
              {comment.body && <span className="eon-pin-card-body" style={{ color: c.secondary }}>{comment.body}</span>}
              {comment.image_url && <img src={comment.image_url} alt="" loading="lazy" />}
            </span>
          </button>
        );
      })}
      {pendingPoint && (
        <span className="eon-canvas-pin eon-canvas-pin-pending" style={{ left: pendingPoint.left, top: pendingPoint.top, background: c.brand, color: "#fff", borderColor: c.brand }}>
          <Pin size={12} />
        </span>
      )}
      {pendingPoint && (ringOpen || pinWriteOpen) && (
        <>
          <div className="eon-ring-backdrop" onClick={onCancelRing} aria-hidden="true" />
          {ringOpen && (
            <PinRing c={c} x={pendingPoint.left} y={pendingPoint.top}
              onPick={onQuickComment} onWrite={onWriteComment} onCancel={onCancelRing} />
          )}
          {pinWriteOpen && (
            <PinComposer c={c} x={pendingPoint.left} y={pendingPoint.top} frameWidth={vp.w * frameScale}
              onSubmit={onQuickComment} onCancel={onCancelRing} />
          )}
        </>
      )}
    </div>
  );
}

/* ---- Leader line from the selected comment card to its pin on the canvas ---- */
function AnchorLeaderLine({ c, commentId }) {
  const [line, setLine] = useState(null);
  useEffect(() => {
    if (!commentId) { setLine(null); return undefined; }
    // Both endpoints move independently (pin tracks its element, card scrolls
    // in the thread), so measure every frame while a comment is selected —
    // two getBoundingClientRect calls, only while a line is on screen.
    let frame = 0;
    const measure = () => {
      const pin = document.querySelector(`[data-pin-id="${commentId}"]`);
      const card = document.querySelector(`[data-comment-id="${commentId}"]`);
      if (!pin || !card) {
        setLine(null);
      } else {
        const pinRect = pin.getBoundingClientRect();
        const cardRect = card.getBoundingClientRect();
        const next = {
          x1: pinRect.left + pinRect.width / 2, y1: pinRect.top + pinRect.height / 2,
          x2: cardRect.left, y2: cardRect.top + Math.min(cardRect.height / 2, 26),
        };
        setLine((current) => (
          current && ["x1", "y1", "x2", "y2"].every((key) => current[key] === next[key]) ? current : next));
      }
      frame = requestAnimationFrame(measure);
    };
    frame = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(frame);
  }, [commentId]);
  if (!line) return null;
  return (
    <svg className="eon-leader-line" aria-hidden="true">
      <line x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} stroke={c.brand} strokeWidth="1.5" strokeDasharray="5 4" />
      <circle cx={line.x2} cy={line.y2} r="3" fill={c.brand} />
    </svg>
  );
}

/* ---- Activity: shared vocabulary for the History timeline and change toasts.
   Each entry maps a stored action to an icon and a human phrase (the actor is
   rendered separately). detail carries {from,to} for the changes that have one. ---- */
const ACTIVITY_META = {
  created:        { icon: Plus,          text: () => "created this prototype" },
  deleted:        { icon: Trash2,        text: () => "deleted this prototype" },
  uploaded_html:  { icon: Upload,        text: () => "uploaded prototype HTML" },
  updated_html:   { icon: Upload,        text: () => "updated the prototype HTML" },
  removed_html:   { icon: Trash2,        text: () => "removed the uploaded HTML" },
  status_changed: { icon: Circle,        text: (d) => (d?.to ? `set status to ${d.to}` : "changed the status") },
  renamed:        { icon: Pencil,        text: (d) => (d?.to ? `renamed it to “${d.to}”` : "renamed the prototype") },
  edited_figma:   { icon: FigmaIcon,     text: (d) => (d?.to ? "updated the Figma link" : "cleared the Figma link") },
  edited_linear:  { icon: LinearIcon,    text: (d) => (d?.to ? "updated the Linear link" : "cleared the Linear link") },
  edited_notes:   { icon: MessageSquare, text: () => "edited the notes" },
  moved_group:    { icon: LayoutGrid,    text: (d) => (d?.to ? `moved it to “${d.to}”` : "moved it to another group") },
};

function activityMeta(action) {
  return ACTIVITY_META[action] || { icon: Circle, text: () => action };
}

function isDangerAction(action) {
  return action === "deleted" || action === "removed_html";
}

function initialsOf(name) {
  return (name || "T").trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "T";
}

function HistoryTimeline({ c, activity, currentUserId }) {
  if (!activity.length) {
    return (
      <div className="eon-comment-empty" style={{ color: c.muted }}>
        <span className="eon-comment-empty-icon" style={{ background: c.raised, color: c.brand }}><History size={20} /></span>
        <strong style={{ color: c.text }}>No history yet</strong>
        <span style={{ fontSize: 12 }}>Uploads, status changes, and link edits show up here.</span>
      </div>
    );
  }
  return (
    <div className="eon-history" aria-live="polite">
      {activity.map((item) => {
        const meta = activityMeta(item.action);
        const Icon = meta.icon;
        const name = item.actor_id === currentUserId ? "You" : (item.actor_name || "A teammate");
        return (
          <article key={item.id} className="eon-history-item">
            <span className="eon-history-icon" style={{ background: c.raised, color: isDangerAction(item.action) ? "#FF6B8A" : c.brand }}>
              <Icon size={13} />
            </span>
            <div className="eon-history-body">
              <p style={{ color: c.secondary }}><strong style={{ color: c.text }}>{name}</strong> {meta.text(item.detail)}</p>
              <time style={{ color: c.muted }} dateTime={item.created_at}>{relativeTime(item.created_at)}</time>
            </div>
          </article>
        );
      })}
    </div>
  );
}

/* ---- Presence: initials-avatars of teammates viewing the same prototype,
   fed by the shared realtime presence channel. ---- */
function PresenceAvatars({ c, viewers }) {
  if (!viewers.length) return null;
  const shown = viewers.slice(0, 3);
  const extra = viewers.length - shown.length;
  const label = `${viewers.length} teammate${viewers.length > 1 ? "s" : ""} viewing this prototype`;
  return (
    <div className="eon-presence" title={label} aria-label={label}>
      {shown.map((viewer) => (
        <span key={viewer.id} className="eon-presence-avatar" title={viewer.name}
          style={{ background: c.active, color: c.brand, borderColor: c.nav }}>
          {initialsOf(viewer.name)}
        </span>
      ))}
      {extra > 0 && (
        <span className="eon-presence-avatar eon-presence-more" style={{ background: c.raised, color: c.muted, borderColor: c.nav }}>+{extra}</span>
      )}
    </div>
  );
}

/* ---- Toasts: a teammate's change, surfaced from the same activity stream that
   feeds History. Each auto-dismisses; the host keeps at most a short stack. ---- */
function ToastHost({ c, toasts, onDismiss }) {
  if (!toasts.length) return null;
  return (
    <div className="eon-toast-host" role="status" aria-live="polite">
      {toasts.map((toast) => <Toast key={toast.toastId} c={c} toast={toast} onDismiss={onDismiss} />)}
    </div>
  );
}

function Toast({ c, toast, onDismiss }) {
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;
  useEffect(() => {
    const timer = setTimeout(() => dismissRef.current?.(toast.toastId), 6000);
    return () => clearTimeout(timer);
  }, [toast.toastId]);
  const meta = activityMeta(toast.action);
  const Icon = meta.icon;
  return (
    <div className="eon-toast" style={{ background: c.panel, borderColor: c.border, boxShadow: hubShadow(c) }}>
      <span className="eon-toast-icon" style={{ background: c.raised, color: isDangerAction(toast.action) ? "#FF6B8A" : c.brand }}>
        <Icon size={14} />
      </span>
      <div className="eon-toast-body">
        <p style={{ color: c.text }}><strong>{toast.actor_name || "A teammate"}</strong> {meta.text(toast.detail)}</p>
        {toast.project_title && <span style={{ color: c.muted }}>{toast.project_title}</span>}
      </div>
      <button className="eon-buttonish eon-icon-button" onClick={() => onDismiss?.(toast.toastId)} aria-label="Dismiss notification" style={{ color: c.muted }}><X size={14} /></button>
    </div>
  );
}

function DeletePrototypeDialog({ c, project, restoreFocus, onClose, onConfirm }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useRef(null);
  const busyRef = useRef(busy);
  const closeRef = useRef(onClose);
  busyRef.current = busy;
  closeRef.current = onClose;

  useEffect(() => {
    const previousFocus = restoreFocus || document.activeElement;
    const onKeyDown = (event) => {
      if (event.key === "Escape" && !busyRef.current) closeRef.current?.();
      if (event.key !== "Tab") return;
      const controls = [...(dialogRef.current?.querySelectorAll("button:not(:disabled)") || [])];
      if (!controls.length) return;
      if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1).focus(); }
      else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0].focus(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus?.();
    };
  }, []);

  const remove = async () => {
    setBusy(true);
    setError("");
    try { await onConfirm(); }
    catch (err) { setError(err.message || "Couldn't delete this prototype."); setBusy(false); }
  };

  return (
    <div className="eon-modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
      <div ref={dialogRef} className="eon-modal eon-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="eon-delete-title" aria-describedby="eon-delete-body" style={{ background: c.panel, borderColor: c.border }}>
        <div className="eon-confirm-icon" style={{ background: "rgba(255,107,138,.12)", color: "#FF6B8A" }}><Trash2 size={18} /></div>
        <h2 id="eon-delete-title">Delete “{project.title}”?</h2>
        <p id="eon-delete-body" style={{ color: c.muted }}>This removes the prototype, its shared feedback, and linked review context for everyone. This can't be undone.</p>
        {error && <p role="alert" className="eon-copy-error">{error}</p>}
        <div className="eon-confirm-actions">
          <button autoFocus className="eon-buttonish eon-secondary-button" onClick={onClose} disabled={busy} style={{ borderColor: c.border, color: c.secondary }}>Cancel</button>
          <Button className="eon-buttonish" onClick={remove} disabled={busy} style={{ minHeight: 40, background: "#FF6B8A", color: "#180107", borderRadius: 10, fontWeight: 650 }}>
            {busy ? "Deleting…" : "Delete prototype"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ---- New-prototype dialog: replaces the old window.prompt flow with proper
   setup steps — name, group, and optional prototype HTML (drop / browse /
   paste). Creation is delegated to onCreate({title, group, html}); errors
   surface inline. ---- */
function NewPrototypeDialog({ c, groups, restoreFocus, onClose, onCreate }) {
  const [title, setTitle] = useState("");
  const [group, setGroup] = useState("General");
  const [html, setHtml] = useState("");
  const [fileName, setFileName] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const dialogRef = useRef(null);
  const fileInputRef = useRef(null);
  const busyRef = useRef(busy);
  busyRef.current = busy;

  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  useEffect(() => {
    const returnFocusTo = restoreFocus || document.activeElement;
    const onKey = (event) => {
      if (event.key === "Escape" && !busyRef.current) onClose();
      if (event.key !== "Tab") return;
      const focusable = dialogRef.current?.querySelectorAll('button:not(:disabled), input:not(:disabled):not([tabindex="-1"]), textarea:not(:disabled), [tabindex="0"]');
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      returnFocusTo?.focus?.();
    };
  }, [onClose]);

  const readFile = (file) => {
    if (!file) return;
    if (!/\.html?$/i.test(file.name) && file.type !== "text/html") {
      setError("Drop a .html file — other formats aren't supported.");
      return;
    }
    setError("");
    const reader = new FileReader();
    reader.onload = () => { setHtml(String(reader.result)); setFileName(file.name); };
    reader.readAsText(file);
  };

  const submit = async () => {
    if (!title.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      await onCreate({ title: title.trim(), group: group.trim() || "General", html: html.trim() || null });
      onClose();
    } catch (err) {
      setError(err.message || "Couldn't create the prototype.");
      setBusy(false);
    }
  };

  const fieldStyle = { minHeight: 40, background: c.bg, borderColor: c.border, color: c.text, borderRadius: 10, fontSize: 13 };
  const stepBadge = { display: "grid", width: 22, height: 22, flexShrink: 0, placeItems: "center", borderRadius: 100, background: c.active, color: c.brand, fontSize: 11, fontWeight: 700 };
  const stepHead = { display: "flex", alignItems: "center", gap: 9, fontSize: 13, fontWeight: 600 };

  return (
    <div className="eon-modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
      <div ref={dialogRef} className="eon-modal" role="dialog" aria-modal="true" aria-labelledby="eon-new-prototype-title" style={{ background: c.panel, borderColor: c.border }}>
        <div className="eon-modal-head" style={{ borderColor: c.border }}>
          <strong id="eon-new-prototype-title">New prototype</strong>
          <button className="eon-buttonish eon-icon-button" onClick={onClose} disabled={busy} aria-label="Close dialog" style={{ color: c.muted }}><X size={16} /></button>
        </div>
        <div className="eon-modal-body">
          <div className="eon-modal-step">
            <div style={stepHead}><span style={stepBadge}>1</span> Name it</div>
            <Input autoFocus value={title} onChange={(event) => setTitle(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter") submit(); }}
              placeholder="e.g. Trips checkout" aria-label="Prototype name" style={fieldStyle} />
            {slug && <span style={{ fontSize: 11, color: c.muted }}>Will live at <code style={{ color: c.text }}>#/p/{slug}</code></span>}
          </div>
          <div className="eon-modal-step">
            <div style={stepHead}><span style={stepBadge}>2</span> Pick a group</div>
            <Input value={group} onChange={(event) => setGroup(event.target.value)} list="eon-group-options"
              placeholder="General" aria-label="Prototype group" style={fieldStyle} />
            <datalist id="eon-group-options">
              {groups.map((name) => <option key={name} value={name} />)}
            </datalist>
          </div>
          <div className="eon-modal-step">
            <div style={stepHead}><span style={stepBadge}>3</span> Add the prototype HTML <span style={{ fontSize: 11, fontWeight: 400, color: c.muted }}>optional — you can upload it later</span></div>
            <div className="eon-dropzone"
              onDragOver={(event) => { event.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(event) => { event.preventDefault(); setDragOver(false); readFile(event.dataTransfer.files?.[0]); }}
              style={{ borderColor: dragOver ? c.brand : c.border, background: dragOver ? c.active : "transparent" }}>
              <Upload size={15} color={c.muted} aria-hidden="true" />
              <span style={{ fontSize: 13, color: c.secondary, flex: 1 }}>
                {fileName ? <>Loaded <code style={{ color: c.text }}>{fileName}</code></> : "Drag & drop a .html file here, or"}
              </span>
              <label tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); fileInputRef.current?.click(); } }}
                style={{ fontSize: 13, color: c.brand, cursor: "pointer", textDecoration: "underline" }}>
                browse
                <input ref={fileInputRef} type="file" accept=".html,.htm,text/html" aria-label="Choose an HTML file"
                  onChange={(event) => readFile(event.target.files?.[0])} className="eon-visually-hidden" tabIndex={-1} />
              </label>
            </div>
            <Textarea value={html} onChange={(event) => { setHtml(event.target.value); setFileName(""); }} spellCheck={false}
              placeholder="…or paste a self-contained HTML document here"
              aria-label="Prototype HTML source"
              style={{ minHeight: 96, maxHeight: 220, background: c.bg, borderColor: c.border, color: c.text, fontSize: 12, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", resize: "vertical", borderRadius: 10 }} />
            <span style={{ fontSize: 11, color: c.muted, lineHeight: 1.5 }}>
              Tip: “Copy setup prompt” in the sidebar gives an AI the full contract — theming, states, and media tokens like <code style={{ color: c.text }}>{"{{heroImage}}"}</code>.
            </span>
          </div>
        </div>
        <div className="eon-modal-foot" style={{ borderColor: c.border }}>
          <span role="alert" style={{ flex: 1, fontSize: 12, color: "#FF6B8A" }}>{error}</span>
          <button className="eon-buttonish eon-secondary-button" onClick={onClose} disabled={busy} style={{ borderColor: c.border, background: "transparent", color: c.secondary }}>Cancel</button>
          <Button className="eon-buttonish" onClick={submit} disabled={!title.trim() || busy}
            style={{ minHeight: 40, padding: "0 16px", borderRadius: 10, background: c.primary, color: c.primaryText, fontSize: 13, fontWeight: 600, opacity: !title.trim() || busy ? 0.5 : 1 }}>
            {busy ? "Creating…" : "Create prototype"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function useDrawerFocus(active, onClose) {
  const panelRef = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!active || !panelRef.current) return undefined;
    const previousFocus = document.activeElement;
    const panel = panelRef.current;
    const selector = 'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]';
    panel.querySelector("[data-drawer-close]")?.focus();

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        closeRef.current?.();
        return;
      }
      if (event.key !== "Tab") return;
      const controls = [...panel.querySelectorAll(selector)].filter((element) => element.offsetParent !== null);
      if (!controls.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus?.();
    };
  }, [active]);

  return panelRef;
}

function SaveIndicator({ c, state, onRetry, compact = false }) {
  if (!state || state === "idle") return null;
  const content = {
    saving: { icon: <Loader2 size={13} className="eon-spin" />, label: "Saving…", color: c.muted },
    saved: { icon: <Check size={13} />, label: "Saved", color: c.muted },
    error: { icon: <AlertCircle size={13} />, label: "Save failed", color: "#FF6B8A" },
  }[state];
  if (!content) return null;
  const Tag = state === "error" && onRetry ? "button" : "span";
  return (
    <Tag className={`eon-save-state${compact ? " is-compact" : ""}`} onClick={state === "error" ? onRetry : undefined}
      role={state === "saving" ? "status" : undefined} aria-live="polite"
      title={state === "error" && onRetry ? "Retry saving" : undefined}
      style={{ color: content.color, background: c.raised }}>
      {content.icon}<span>{content.label}</span>{state === "error" && onRetry && !compact ? <span>· Retry</span> : null}
    </Tag>
  );
}

function BrandMark({ c, src }) {
  const safeSrc = safeAssetUrl(src);
  if (safeSrc) {
    return <img className="eon-brand-logo" src={safeSrc} alt="Eon" />;
  }
  return (
    <svg className="eon-brand-logo" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-label="Eon">
      <circle cx="12" cy="12" r="10" stroke={c.text} strokeWidth="2" />
      <path d="M12 4 A8 8 0 0 1 12 20" stroke={c.brand} strokeWidth="2" />
    </svg>
  );
}

function safeAssetUrl(value) {
  if (!value) return "";
  if (/^data:image\/(?:png|jpe?g|gif|webp|svg\+xml);/i.test(value)) return value;
  try {
    const url = new URL(value, window.location.origin);
    return ["http:", "https:", "blob:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function sandboxedFullView(source, title) {
  const escapedSource = String(source).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  const escapedTitle = String(title || "Prototype").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]);
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapedTitle}</title><style>*{box-sizing:border-box}html,body,iframe{width:100%;height:100%;margin:0}iframe{display:block;border:0}</style></head><body><iframe title="${escapedTitle}" sandbox="${PROTOTYPE_SANDBOX}" referrerpolicy="no-referrer" allow="clipboard-read; clipboard-write" srcdoc="${escapedSource}"></iframe></body></html>`;
}

async function copyText(value) {
  try {
    await navigator.clipboard.writeText(value);
    return;
  } catch { /* Fall back for embedded or permission-restricted browsers. */ }
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("Clipboard unavailable");
}

function readStoredJson(key) {
  try { return JSON.parse(window.localStorage.getItem(key) || "{}"); }
  catch { return {}; }
}

function useStoredState(key, initialValue) {
  const [value, setValue] = useState(() => {
    try { return window.localStorage.getItem(key) || initialValue; }
    catch { return initialValue; }
  });
  useEffect(() => {
    try { window.localStorage.setItem(key, value); }
    catch { /* Storage can be unavailable in hardened browsers. */ }
  }, [key, value]);
  return [value, setValue];
}

function relativeTime(value) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 10) return "now";
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function hubShadow(c) {
  return c.bg === "#000000"
    ? "0 0 0 1px rgba(255,255,255,.08)"
    : "0 0 0 1px rgba(0,0,0,.06), 0 2px 4px rgba(0,0,0,.05)";
}
