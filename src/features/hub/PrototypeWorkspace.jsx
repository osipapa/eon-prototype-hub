import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { fetchLinearIssue, uploadCommentImage, MAX_COMMENT_IMAGE_BYTES } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FigmaIcon, LinearIcon } from "@/components/BrandIcons";
import DesignHubSwitcher from "@/components/DesignHubSwitcher";
import { HubChangelogDialog, useHubChangelog } from "@/components/HubChangelog";
import HubSidebarFooter from "@/components/HubSidebarFooter";
import LiquidSegmentedControl from "@/components/LiquidSegmentedControl";
import PeekSegmented from "@/components/PeekSegmented";
import SidebarResizeHandle, { useResizableSidebar } from "@/components/SidebarResizeHandle";
import { Liquid } from "liquid-gooey";
import {
  AlertCircle, ArrowDown, ArrowUp, Check, ChevronDown, Circle, Copy,
  ExternalLink, History, ImagePlus, LayoutGrid, Loader2,
  Pin, Maximize2, Minimize2, MessageSquare, Minus, Monitor, Laptop, Columns2,
  Menu, MoreHorizontal, Pencil, Plus, Search, Send, SlidersHorizontal, Smartphone, SmilePlus, Square,
  Tablet, Trash2, Upload, X,
} from "lucide-react";
import {
  CANVAS_PRESETS, HUB, VIEWPORTS, currentArgs,
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
import {
  ensureReadPermission, forgetFileLink, pickHtmlFile, recallFileLink,
  rememberFileLink, supportsFileLink, watchFile,
} from "@/lib/localFile";
import { useSystemTheme } from "@/lib/systemTheme";
import { copyText, useStoredState } from "@/lib/uiState";

const VP_ICON = { desktop: Monitor, laptop: Laptop, tablet: Tablet, mobile: Smartphone };
const PROTOTYPE_SANDBOX = "allow-scripts allow-forms allow-modals allow-popups allow-downloads";

function linearIdentifier(project) {
  return project?.issue_url?.match(/\/issue\/([A-Za-z][A-Za-z0-9]*-\d+)/i)?.[1] || project?.issue_id || null;
}

function linearTeamKey(issue, identifier) {
  return issue?.team?.key?.toUpperCase()
    || String(identifier || "").split("-")[0]?.toUpperCase()
    || "";
}

function linearConnectionState(issue, identifier, c) {
  const team = linearTeamKey(issue, identifier);
  if (!identifier) {
    return {
      kind: "error",
      label: "Linear not connected",
      color: c.bg === "#000000" ? "#FF7A8A" : "#B42335",
    };
  }
  if (issue?.state) {
    return {
      kind: "connected",
      label: `${issue.state.name}${team ? ` · ${team}` : ""}`,
      color: issue.state.color || c.text,
    };
  }
  if (issue === undefined) {
    return {
      kind: "loading",
      label: `Connecting Linear${team ? ` · ${team}` : ""}`,
      color: c.muted,
    };
  }
  return {
    kind: "error",
    label: `Linear unavailable${team ? ` · ${team}` : ""}`,
    color: c.bg === "#000000" ? "#FF7A8A" : "#B42335",
  };
}

export default function PrototypeWorkspace({
  projects, assets = {}, comments = [], activity = [], coViewers = [],
  toasts = [], onDismissToast, isAdmin, profile, userEmail,
  activeId, onSelectStory,
  onPatchProject, onSetAsset, onDeleteAsset, onNewProject, onDeleteProject, onReorder,
  onCreateComment, onResolveComment, onToggleReaction, onOpenDesign, onOpenPrompts, onOpenTracking, onOpenAdmin, onSignOut,
  saveState = "idle", onRetrySave, loadError, onRetryLoad,
}) {
  const hubTheme = useSystemTheme();
  const [protoTheme, setProtoTheme] = useStoredState("eon-prototype-theme", "dark");
  const [view, setView] = useState("stories");
  const [viewport, setViewport] = useStoredState("eon-viewport", "laptop");
  const [layout, setLayout] = useStoredState("eon-layout", "single");
  const [gridBy, setGridBy] = useState("states");
  const [query, setQuery] = useState("");
  // "auto" means the canvas takes its cue from the prototype theme: white for
  // light, black for dark, so a prototype never opens on a colour it was not
  // designed against. Picking a swatch pins it; picking the one auto would have
  // chosen anyway hands it back, so it keeps following the theme.
  // The old grey default is read as auto so existing sessions get the fix too.
  const [storedCanvasBg, setStoredCanvasBg] = useStoredState("eon-canvas-background", "auto");
  const canvasBg = (storedCanvasBg === "auto" || storedCanvasBg === "#808080")
    ? (protoTheme === "dark" ? "#000000" : "#FFFFFF")
    : storedCanvasBg;
  const setCanvasBg = useCallback((next) => {
    const auto = protoTheme === "dark" ? "#000000" : "#FFFFFF";
    setStoredCanvasBg(next === auto ? "auto" : next);
  }, [protoTheme, setStoredCanvasBg]);
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
  const changelog = useHubChangelog();
  const sidebarResize = useResizableSidebar("eon-sidebar-width");
  const inspectorResize = useResizableSidebar(
    "eon-review-sidebar-width",
    { initial: 380, min: 320, max: 560, edge: "left" },
  );
  const [navOpen, setNavOpen] = useState(() => window.innerWidth > 900);
  const [inspectorOpen, setInspectorOpen] = useState(() => window.innerWidth > 1180);
  const [compare, setCompare] = useState(false);
  const [splitRatio, setSplitRatio] = useState(0.5);
  const [splitDragging, setSplitDragging] = useState(false);
  const [inspectorTab, setInspectorTab] = useState("comments");
  // Which context row is unfurled. One at a time keeps the panel a list.
  const [openContextRow, setOpenContextRow] = useState(null);
  // Full view keeps the prototype and drops the chrome. The panels are still
  // there; they slide back in when the pointer reaches an edge.
  const [focusMode, setFocusMode] = useState(false);
  const [peek, setPeek] = useState(null); // "nav" | "inspector" | null
  const [reviewLocationKey, setReviewLocationKey] = useState(() => window.location.hash);
  const [breakpoints, setBreakpoints] = useState({ navDrawer: false, inspectorDrawer: false, noCompare: false, compactControls: false });
  const [anchorMode, setAnchorMode] = useState(false);
  const [pendingAnchor, setPendingAnchor] = useState(null);
  const [ringOpen, setRingOpen] = useState(false);
  const [pinWriteOpen, setPinWriteOpen] = useState(false);
  const [anchorRects, setAnchorRects] = useState({});
  const [anchorScroll, setAnchorScroll] = useState({ x: 0, y: 0 });
  const [activeAnchorId, setActiveAnchorId] = useState(null);
  // Reveal waiting for the iframe to remount into the pin's canvas state.
  const pendingRevealRef = useRef(null);
  const frameRef = useRef(null);
  const seenStorageKey = `eon-review-seen:${profile?.id || "anonymous"}`;
  const [seenComments, setSeenComments] = useState(() => readStoredJson(seenStorageKey));
  // Live local file link: one at a time, tied to the prototype it was linked
  // from. File handles last for the current session and cannot survive a reload.
  const [fileLink, setFileLink] = useState(null); // {handle, name, projectId, lastModified, lastSyncAt}
  const [autoPublish, setAutoPublish] = useState(true);
  const [localHtml, setLocalHtml] = useState(null);
  const [fileLinkError, setFileLinkError] = useState("");
  // A handle kept from a previous session. Reconnecting needs a click, because
  // the browser only regrants file access inside a user gesture.
  const [rememberedLink, setRememberedLink] = useState(null);
  // What the live link is doing right now, so the Source row can say so.
  const [fileSync, setFileSync] = useState(null); // { phase: "syncing"|"synced"|"local", at }
  const publishTimerRef = useRef(0);
  const pendingPublishRef = useRef(null);
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
    // Only the moment a panel *becomes* a drawer should close it. Reacting to
    // every resize would slam the drawer shut as mobile browser chrome moves.
    const wasDrawer = { nav: false, inspector: false };
    const update = () => {
      const navDrawer = window.matchMedia("(max-width: 900px)").matches;
      const inspectorDrawer = window.matchMedia("(max-width: 1180px)").matches;
      setBreakpoints({
        navDrawer,
        inspectorDrawer,
        noCompare: window.matchMedia("(max-width: 899px)").matches,
        compactControls: window.matchMedia("(max-width: 680px)").matches,
      });
      if (!navDrawer) setNavOpen(true);
      else if (!wasDrawer.nav) setNavOpen(false);
      if (!inspectorDrawer) setInspectorOpen(true);
      else if (!wasDrawer.inspector) setInspectorOpen(false);
      wasDrawer.nav = navDrawer;
      wasDrawer.inspector = inspectorDrawer;
    };
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
  const isBuiltIn = ["signin", "dashboard"].includes(story?.slug);
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
  const pinchZoom = (delta) => setZoom((value) => Math.min(4, Math.max(0.25, +(value * Math.exp(-delta / 240)).toFixed(3))));

  // One listener covers the bridge's whole vocabulary. The iframe remounts on
  // state changes, so "ready" re-syncs mode + watched selectors every time.
  useEffect(() => {
    const onMessage = (event) => {
      if (!isBridgeMessage(event, frameRef.current)) return;
      const message = event.data;
      if (message.type === "eon-anchor-ready") {
        postToFrame({ type: "eon-anchor-mode", on: anchorMode });
        postToFrame({ type: "eon-anchor-query", selectors: watchedSelectors });
        if (pendingRevealRef.current) {
          postToFrame(pendingRevealRef.current);
          pendingRevealRef.current = null;
        }
      } else if (message.type === "eon-anchor-zoom") {
        if (layout === "single") pinchZoom(message.delta);
      } else if (message.type === "eon-anchor-rects") {
        setAnchorRects(message.rects || {});
        setAnchorScroll(message.scroll || { x: 0, y: 0 });
      } else if (message.type === "eon-anchor-cancel") {
        setAnchorMode(false);
      } else if (message.type === "eon-anchor-click") {
        setPendingAnchor({
          selector: message.selector || null,
          rel_x: message.rel_x, rel_y: message.rel_y,
          x_pct: message.x_pct, y_pct: message.y_pct,
          doc_x: message.doc_x, doc_y: message.doc_y,
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
  }, [anchorMode, watchedSelectors, viewport, args, protoTheme, layout]);

  // Pinching over the canvas around the frame. The prototype iframe swallows
  // its own wheel events, so the bridge forwards those separately.
  useEffect(() => {
    const node = canvasRef.current;
    if (!node || layout !== "single") return undefined;
    const onWheel = (event) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      pinchZoom(event.deltaY);
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [layout, view]);

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
      // Keep the pin and fall back to the composer so it can show the posting error.
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
  useEffect(() => { setPendingAnchor(null); setActiveAnchorId(null); setAnchorMode(false); pendingRevealRef.current = null; }, [story?.id]);

  // Restore the exact canvas state a pin was placed in, then scroll the
  // prototype so the pinned spot is actually on screen.
  const jumpToAnchor = (comment) => {
    const anchor = comment.anchor;
    if (!anchor) return;
    setLayout("single");
    if (VIEWPORTS[anchor.viewport]) setViewport(anchor.viewport);
    if (["light", "dark"].includes(anchor.theme)) setProtoTheme(anchor.theme);
    if (anchor.args && story) setLiveArgs((current) => ({ ...current, [story.id]: { ...current[story.id], ...anchor.args } }));
    setActiveAnchorId(comment.id);
    const reveal = { type: "eon-anchor-reveal", selector: anchor.selector || null, doc_x: anchor.doc_x, doc_y: anchor.doc_y };
    // Theme and argument changes remount the iframe because its key includes both.
    // Wait for the new frame's "ready" before revealing. Otherwise post now.
    const willRemount = (anchor.theme && anchor.theme !== protoTheme)
      || Object.entries(anchor.args || {}).some(([key, value]) => String(value) !== String(args[key]));
    if (willRemount) pendingRevealRef.current = reveal;
    else postToFrame(reveal);
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
    if (!focusMode) return undefined;
    const exit = (event) => { if (event.key === "Escape") { setFocusMode(false); setPeek(null); } };
    window.addEventListener("keydown", exit);
    return () => window.removeEventListener("keydown", exit);
  }, [focusMode]);

  // A window that loses its hovering pointer (or is resized down to a touch
  // layout) would strand the panels off screen with no way to reveal them.
  useEffect(() => {
    if (!focusMode) return undefined;
    const query = window.matchMedia("(hover: hover) and (pointer: fine)");
    const check = () => { if (!query.matches) { setFocusMode(false); setPeek(null); } };
    check();
    query.addEventListener("change", check);
    return () => query.removeEventListener("change", check);
  }, [focusMode]);

  // Full view is about one prototype, so switching prototypes leaves it.
  useEffect(() => { setFocusMode(false); setPeek(null); }, [story?.id]);
  useEffect(() => { if (view !== "stories") { setFocusMode(false); setPeek(null); } }, [view]);

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
      if (["details", "linear"].includes(tab)) setOpenContextRow("linear");
      else if (["comments", "history"].includes(tab)) setInspectorTab(tab);
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
    if (["details", "linear"].includes(nextTab)) { setOpenContextRow("linear"); setInspectorOpen(true); }
    else if (["comments", "history"].includes(nextTab)) { setInspectorTab(nextTab); setInspectorOpen(true); }
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
    setOpenContextRow(null);
    setShowUpload(false);
  }, [story?.id]);

  // Watch the linked file. Keeps running (and publishing) even while another
  // prototype is selected, so background syncs aren't lost.
  // A burst of saves (format-on-save, a build writing twice) should reach the
  // team as one write, not one per keystroke.
  const queuePublish = (projectId, content) => {
    pendingPublishRef.current = { projectId, content };
    if (publishTimerRef.current) return;
    publishTimerRef.current = window.setTimeout(() => {
      publishTimerRef.current = 0;
      const pending = pendingPublishRef.current;
      pendingPublishRef.current = null;
      if (!pending) return;
      patchProjectRef.current(pending.projectId, { prototype_html: pending.content });
      setFileSync({ phase: "synced", at: Date.now() });
    }, 700);
  };
  useEffect(() => () => window.clearTimeout(publishTimerRef.current), []);

  useEffect(() => {
    if (!fileLink?.handle) return undefined;
    const { handle, projectId, lastModified, size } = fileLink;
    return watchFile(
      handle,
      { lastModified, size },
      (content, mtime) => {
        setFileLinkError("");
        setLocalHtml(content);
        setFileLink((current) => (current?.handle === handle
          ? { ...current, lastModified: mtime, lastSyncAt: Date.now() }
          : current));
        setFileSync({ phase: "syncing", at: Date.now() });
        if (autoPublishRef.current) queuePublish(projectId, content);
        else setFileSync({ phase: "local", at: Date.now() });
      },
      (error) => {
        setFileLinkError(error.message);
        setFileLink(null);
        setLocalHtml(null);
        setFileSync(null);
      },
    );
  }, [fileLink?.handle]);

  // Offer to pick the previous session's file back up.
  useEffect(() => {
    if (!story?.id || !supportsFileLink()) return undefined;
    let stale = false;
    setRememberedLink(null);
    recallFileLink(story.id).then((saved) => {
      if (!stale && saved?.handle) setRememberedLink(saved);
    });
    return () => { stale = true; };
  }, [story?.id]);

  const openLinearContext = () => {
    setOpenContextRow("linear");
    setInspectorOpen(true);
    if (breakpoints.inspectorDrawer) setNavOpen(false);
  };

  const adoptFile = (handle, name, file, content) => {
    setLocalHtml(content);
    setFileLink({
      handle, name, projectId: story.id,
      lastModified: file.lastModified, size: file.size, lastSyncAt: Date.now(),
    });
    setRememberedLink({ handle, name });
    setFileSync({ phase: autoPublishRef.current ? "synced" : "local", at: Date.now() });
    rememberFileLink(story.id, handle, name);
    if (autoPublishRef.current) patchProjectRef.current(story.id, { prototype_html: content });
  };

  const linkLocalFile = async () => {
    setFileLinkError("");
    try {
      const picked = await pickHtmlFile();
      if (!picked) return;
      adoptFile(picked.handle, picked.name, picked, picked.content);
    } catch (error) {
      setFileLinkError(error?.message || "Couldn't read that file.");
    }
  };

  const reconnectLocalFile = async () => {
    const saved = rememberedLink;
    if (!saved?.handle) return;
    setFileLinkError("");
    try {
      if (!(await ensureReadPermission(saved.handle))) {
        setFileLinkError("The browser did not grant access to that file. Link it again.");
        return;
      }
      const file = await saved.handle.getFile();
      adoptFile(saved.handle, saved.name || file.name, file, await file.text());
    } catch {
      setFileLinkError("That file is no longer reachable. Link it again.");
      setRememberedLink(null);
      forgetFileLink(story.id);
    }
  };

  const unlinkLocalFile = () => {
    setFileLink(null);
    setLocalHtml(null);
    setFileLinkError("");
    setRememberedLink(null);
    setFileSync(null);
    forgetFileLink(story.id);
  };
  const publishLocalFile = () => {
    if (fileLink && localHtml != null) patchProjectRef.current(fileLink.projectId, { prototype_html: localHtml });
  };

  if (!story) {
    return (
      <div className={`${hubTheme === "dark" ? "" : "light"} eon-empty-workspace`} style={{ background: c.bg, color: c.text }}>
        <div className="eon-empty-workspace-card" style={{ background: c.panel, boxShadow: hubShadow(c) }}>
          <span className="eon-empty-workspace-icon eon-accent-icon" style={{ background: c.active, color: c.brand }}><Plus size={20} /></span>
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
  const linearId = linearIdentifier(story);
  const liveLinear = linearByProject[story.id];
  const frameScale = scale * zoom;
  const frameWidth = vp.w * frameScale;
  const frameHeight = vp.h * frameScale;
  // The phone shell is drawn outside the frame box, so the stage has to leave
  // room for it or the rail clips against the canvas edge.
  const deviceMargin = viewport === "mobile" ? 34 * frameScale : 0;

  const setArg = (key, value) => setLiveArgs((previous) => ({
    ...previous,
    [story.id]: { ...previous[story.id], [key]: value },
  }));
  const patch = (field, value) => onPatchProject(story.id, { [field]: value });
  const openFull = () => {
    // Focus mode reveals the panels on edge hover. Without a hovering pointer
    // that is a trap, so touch devices open the prototype as its own page.
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      const wrapper = sandboxedFullView(html, story.title);
      const url = URL.createObjectURL(new Blob([wrapper], { type: "text/html" }));
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      return;
    }
    setFocusMode(true);
    setPeek(null);
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

  const segmented = (options, value, onPick, disabled = false, ariaLabel) => (
    <LiquidSegmentedControl
      options={options}
      value={value}
      onValueChange={onPick}
      c={c}
      className="eon-segmented"
      ariaLabel={ariaLabel}
      disabled={disabled}
    />
  );

  return (
    <div data-tutorial="workspace" className={`${hubTheme === "dark" ? "" : "light"} eon-workspace${focusMode ? " is-focus" : ""}`} style={{ background: c.bg, color: c.text }}>
      {focusMode && (
        <>
          <div className="eon-peek-zone is-left" onMouseEnter={() => setPeek("nav")} aria-hidden="true" />
          <div className="eon-peek-zone is-right" onMouseEnter={() => setPeek("inspector")} aria-hidden="true" />
          <button className="eon-buttonish eon-focus-exit" onClick={() => { setFocusMode(false); setPeek(null); }}
            aria-label="Exit full view" title="Exit full view (Esc)"
            style={{ background: c.panel, borderColor: c.border, color: c.secondary, boxShadow: hubShadow(c) }}>
            <Minimize2 size={15} aria-hidden="true" /> <span>Exit full view</span>
          </button>
        </>
      )}
      {((breakpoints.navDrawer && navOpen) || (breakpoints.inspectorDrawer && inspectorOpen)) && (
        <button className="eon-drawer-scrim" aria-label="Close open panel" onClick={() => {
          if (breakpoints.inspectorDrawer && inspectorOpen) setInspectorOpen(false);
          else setNavOpen(false);
        }} />
      )}

      {(navOpen || focusMode) && (
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
          onOpenDesign={onOpenDesign} onOpenPrompts={onOpenPrompts} onOpenTracking={onOpenTracking} onOpenAdmin={onOpenAdmin} onSignOut={onSignOut}
          changelog={changelog}
          linearByProject={linearByProject}
          unreadByProject={unreadByProject} commentCountByProject={commentCountByProject}
          resize={sidebarResize}
          isDrawer={breakpoints.navDrawer && !focusMode} onClose={() => setNavOpen(false)}
          peeking={focusMode ? peek === "nav" : null} onPeekEnd={() => setPeek(null)} onPeekStart={() => setPeek("nav")}
        />
      )}

      <main className="eon-workspace-main">
        {!focusMode && <WorkspaceToolbar
          c={c} view={view} story={story} liveLinear={liveLinear} linearId={linearId} coViewers={coViewers}
          navDrawer={breakpoints.navDrawer} navOpen={navOpen} onOpenNav={() => {
            setNavOpen(true);
            setInspectorOpen(false);
          }}
          inspectorDrawer={breakpoints.inspectorDrawer} inspectorOpen={inspectorOpen}
          onToggleInspector={() => {
            const opening = !inspectorOpen;
            setInspectorOpen(opening);
            if (opening) setNavOpen(false);
          }}
          openFull={openFull}
          viewport={viewport} setViewport={setViewport} layout={layout} setLayout={setLayout}
          saveState={saveState} onRetrySave={onRetrySave}
          onOpenLinear={openLinearContext}
        />}

        {loadError && (
          <div className="eon-inline-alert" role="alert" style={{ background: c.panel, color: c.secondary, borderColor: c.border }}>
            <AlertCircle size={15} />
            <span>{loadError}</span>
            {onRetryLoad && <button className="eon-buttonish eon-text-button" onClick={onRetryLoad} style={{ color: c.brand }}>Retry</button>}
          </div>
        )}

        {view === "media" ? (
          <div className="eon-media-scroll"><MediaManager c={c} assets={assets} onSetAsset={onSetAsset} onDeleteAsset={onDeleteAsset} /></div>
        ) : (
          <div ref={compareRef} className={`eon-compare${splitDragging ? " is-dragging" : ""}`}>
            <div className="eon-canvas-zone" style={{ flex: effCompare ? `${splitRatio} 1 0%` : undefined }}>
              <section data-tutorial="prototype-canvas" ref={canvasRef} className="eon-canvas" aria-label={`${story.title} prototype canvas`} style={{ background: canvasBg }}>
                {layout === "single" ? (
                  <div className="eon-canvas-stage" style={{ width: Math.max(canvasSize.width, frameWidth + deviceMargin + 64), height: Math.max(canvasSize.height, frameHeight + deviceMargin + 64) }}>
                    <div className={`eon-stage-frame${viewport === "mobile" ? " is-device" : ""}${viewport === "mobile" && media.iPhone ? " has-mockup" : ""}`}
                      style={{ width: frameWidth, height: frameHeight, flexShrink: 0, position: "relative", "--device-scale": frameScale }}>
                      {viewport === "mobile" && <DeviceShell frame={media.iPhone} scale={frameScale} />}
                      <iframe data-tutorial="prototype-frame" ref={frameRef} className="eon-prototype-frame" key={`${story.id}-${JSON.stringify(args)}-${protoTheme}`}
                        title={story.title} srcDoc={html}
                        sandbox={PROTOTYPE_SANDBOX}
                        referrerPolicy="no-referrer"
                        allow="clipboard-read; clipboard-write"
                        style={{ width: vp.w, height: vp.h, colorScheme: protoTheme, transform: `scale(${frameScale})`, transformOrigin: "top left" }} />
                      <PinOverlay
                        c={c} pins={visiblePins} pendingAnchor={pendingAnchor} rects={anchorRects} scroll={anchorScroll}
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
              {!breakpoints.compactControls && (
                <CanvasViewControls
                  c={c} scale={scale} zoom={zoom} setZoom={setZoom} layout={layout} effGridBy={effGridBy}
                  protoTheme={protoTheme} setProtoTheme={setProtoTheme}
                  canvasBg={canvasBg} setCanvasBg={setCanvasBg} segmented={segmented}
                />
              )}
              {breakpoints.compactControls && layout === "single" && (
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
                <FigmaPane c={c} story={story} ratio={splitRatio} />
              </>
            )}
          </div>
        )}
      </main>

      {view === "stories" && (inspectorOpen || focusMode) && (
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
          editFigma={editFigma} setEditFigma={setEditFigma}
          liveLinear={liveLinear} linearId={linearId}
          isLiveLinked={isLiveLinked} fileLink={fileLink?.projectId === story.id ? fileLink : null} isBuiltIn={isBuiltIn}
          fileSync={fileSync} autoPublish={autoPublish}
          compare={effCompare} setCompare={setCompare} canCompare={!breakpoints.noCompare}
          onOpenSource={() => setShowUpload(true)}
          rememberedLink={supportsFileLink() && !isLiveLinked ? rememberedLink : null}
          onReconnect={reconnectLocalFile} fileLinkError={fileLinkError}
          openRow={openContextRow} setOpenRow={setOpenContextRow}
          resize={inspectorResize}
          isDrawer={breakpoints.inspectorDrawer && !focusMode} onClose={() => setInspectorOpen(false)}
          peeking={focusMode ? peek === "inspector" : null} onPeekEnd={() => setPeek(null)} onPeekStart={() => setPeek("inspector")}
        />
      )}

      {activeAnchorId && view === "stories" && layout === "single" && (
        <AnchorLeaderLine c={c} commentId={activeAnchorId} />
      )}

      {showUpload && view === "stories" && (
        <SourceSheet c={c} story={story} onClose={() => setShowUpload(false)}>
          <UploadPanel key={story.id} c={c} story={story}
            onSave={(source) => { patch("prototype_html", source); setShowUpload(false); }}
            onClear={() => { patch("prototype_html", null); setShowUpload(false); }}
            onCancel={() => setShowUpload(false)}
            canLinkFile={supportsFileLink()}
            fileLink={fileLink?.projectId === story.id ? fileLink : null}
            fileLinkError={fileLinkError}
            autoPublish={autoPublish} onToggleAutoPublish={() => setAutoPublish((value) => !value)}
            onLinkFile={linkLocalFile} onUnlinkFile={unlinkLocalFile} onPublishFile={publishLocalFile} />
        </SourceSheet>
      )}

      {showNewDialog && (
        <NewPrototypeDialog c={c} groups={Object.keys(groups)} restoreFocus={newDialogReturnFocusRef.current} onClose={() => setShowNewDialog(false)} onCreate={onNewProject} />
      )}
      <HubChangelogDialog c={c} open={changelog.isOpen} onClose={changelog.close} />
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
  onOpenDesign, onOpenPrompts, onOpenTracking,
  changelog,
  linearByProject,
  unreadByProject, commentCountByProject,
  resize,
  isDrawer, onClose, peeking = null, onPeekStart, onPeekEnd,
}) {
  const hasResults = Object.keys(groups).length > 0;
  const prototypeCount = Object.values(groups).reduce((total, items) => total + items.length, 0);
  const mediaCount = Object.keys(media || {}).length;
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [menuRect, setMenuRect] = useState(null);
  const menuTriggerRef = useRef(null);
  const listRef = useRef(null);
  const drawerRef = useDrawerFocus(isDrawer, onClose);

  // The menu is fixed to where the trigger was, so scrolling the list would
  // leave it stranded. Close instead of chasing.
  useEffect(() => {
    if (!storyMenuId) { setMenuRect(null); return undefined; }
    const node = listRef.current;
    const close = () => setStoryMenuId(null);
    node?.addEventListener("scroll", close, { passive: true });
    window.addEventListener("resize", close);
    return () => {
      node?.removeEventListener("scroll", close);
      window.removeEventListener("resize", close);
    };
  }, [storyMenuId, setStoryMenuId]);
  return (
    <aside
      data-tutorial="prototype-library"
      ref={drawerRef}
      className={`eon-sidebar${peeking === null ? "" : peeking ? " is-peeking" : " is-peek"}`}
      role={isDrawer ? "dialog" : "navigation"}
      aria-modal={isDrawer || undefined}
      aria-label="Prototype navigation"
      onMouseEnter={peeking === null ? undefined : onPeekStart}
      onMouseLeave={peeking === null ? undefined : onPeekEnd}
      onFocusCapture={peeking === null ? undefined : onPeekStart}
      style={{
        background: c.nav,
        borderColor: c.border,
        ...(!isDrawer ? { width: resize.width, flexBasis: resize.width } : {}),
      }}
    >
      {!isDrawer && <SidebarResizeHandle resize={resize} label="Resize prototype navigation" />}
      <div className="eon-sidebar-head" style={{ borderColor: c.border }}>
        <div className="eon-brand-row">
          <DesignHubSwitcher
            active="prototypes"
            c={c}
            logo={media.eonLogo}
            onSelect={(product) => {
              if (product === "design") onOpenDesign?.();
              if (product === "prompts") onOpenPrompts?.();
              if (product === "tracking") onOpenTracking?.();
            }}
          />
          {isDrawer && <button data-drawer-close className="eon-buttonish eon-icon-button" onClick={onClose} aria-label="Close prototype navigation" style={{ color: c.muted }}><X size={17} /></button>}
        </div>
        <Tabs value={view} onValueChange={(item) => { setView(item); if (isDrawer) onClose(); }}>
          <TabsList variant="line" className="eon-sidebar-tabs" aria-label="Prototype library view" style={{ borderColor: c.border }}>
            <TabsTrigger variant="line" value="stories">
              Prototypes <span className="eon-count" style={{ background: c.raised, color: c.muted }}>{prototypeCount}</span>
            </TabsTrigger>
            <TabsTrigger variant="line" value="media">
              Media <span className="eon-count" style={{ background: c.raised, color: c.muted }}>{mediaCount}</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
        {view === "stories" && (
          <div className="eon-sidebar-search-row">
            <div className="eon-sidebar-search">
              <Search aria-hidden="true" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search prototypes" aria-label="Search prototypes"
                style={{ minHeight: 40, paddingLeft: 34, background: c.raised, borderColor: c.border, color: c.text }} />
            </div>
            <Button className="eon-buttonish eon-sidebar-new" type="button" onClick={onNewProject}
              title="New prototype" aria-label="New prototype"
              style={{ background: c.primary, color: c.primaryText }}>
              <Plus size={16} aria-hidden="true" />
            </Button>
          </div>
        )}
        {view === "stories" && (
          <button data-tutorial="setup-prompt" className="eon-buttonish eon-sidebar-setup" type="button" onClick={copySetupPrompt}
            title="Copy the prompt that teaches an AI how to build for this hub"
            style={{ color: copiedPrompt ? c.brand : c.muted }}>
            {copiedPrompt ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
            {copiedPrompt ? "Copied setup prompt" : "Copy setup prompt"}
          </button>
        )}
      </div>

      <div ref={listRef} className="eon-story-list">
        {view === "stories" ? <>
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
                  style={{ background: c.raised, borderColor: c.brand, color: c.text }} />
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
              const identifier = linearIdentifier(item);
              const connection = linearConnectionState(linearByProject[item.id], identifier, c);
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
                        style={{ background: c.raised, borderColor: c.brand, color: c.text }} />
                    </div>
                  ) : (
                    <button className="eon-buttonish eon-story-select" onClick={() => { onSelect(item); setView("stories"); setStoryMenuId(null); if (isDrawer) onClose(); }}
                      onDoubleClick={() => isAdmin && setRenamingId(item.id)} title={isAdmin ? "Double-click to rename" : undefined}
                      aria-label={`${item.title}, ${connection.label}`} aria-current={active ? "page" : undefined} style={{ color: active ? c.text : c.secondary, fontWeight: active ? 600 : 400 }}>
                      <span className="eon-status-dot" aria-hidden="true" style={{ "--status-color": connection.color, background: connection.color }} />
                      <span>{item.title}</span>
                      {unreadByProject[item.id] > 0 && <span className="eon-unread-count" style={{ background: c.brand, color: c.primaryText }}>{unreadByProject[item.id]}</span>}
                      {!unreadByProject[item.id] && commentCountByProject[item.id] > 0 && (
                        <span className="eon-comment-count" style={{ color: c.muted }} title={`${commentCountByProject[item.id]} comments`}>
                          <MessageSquare size={11} aria-hidden="true" />{commentCountByProject[item.id]}
                        </span>
                      )}
                    </button>
                  )}
                  {canDelete && renamingId !== item.id && (
                    <div style={{ position: "relative", flexShrink: 0 }}>
                      <button ref={(node) => { if (storyMenuId === item.id) menuTriggerRef.current = node; }}
                        className="eon-buttonish eon-icon-button"
                        onClick={(event) => {
                          const opening = storyMenuId !== item.id;
                          menuTriggerRef.current = event.currentTarget;
                          setMenuRect(opening ? event.currentTarget.getBoundingClientRect() : null);
                          setStoryMenuId(opening ? item.id : null);
                        }}
                        aria-label={`Actions for ${item.title}`} aria-expanded={storyMenuId === item.id} aria-haspopup="menu" style={{ color: c.muted }}>
                        <MoreHorizontal size={16} />
                      </button>
                      {storyMenuId === item.id && menuRect && (
                        <FloatingMenu c={c} anchor={menuRect} storyId={item.id} itemCount={isAdmin ? 4 : 1}>
                          {isAdmin && <button className="eon-buttonish" role="menuitem" onClick={() => { setRenamingId(item.id); setStoryMenuId(null); }} style={{ color: c.text }}><Pencil size={14} /> Rename</button>}
                          {isAdmin && <button className="eon-buttonish" role="menuitem" disabled={projectOrder.indexOf(item.id) === 0} onClick={() => { moveStory(item.id, -1); setStoryMenuId(null); }} style={{ color: c.text }}><ArrowUp size={14} /> Move up</button>}
                          {isAdmin && <button className="eon-buttonish" role="menuitem" disabled={projectOrder.indexOf(item.id) === projectOrder.length - 1} onClick={() => { moveStory(item.id, 1); setStoryMenuId(null); }} style={{ color: c.text }}><ArrowDown size={14} /> Move down</button>}
                          <button className="eon-buttonish" role="menuitem" onClick={() => {
                            const restoreFocus = menuTriggerRef.current;
                            setStoryMenuId(null);
                            onDeleteProject?.(item.id, restoreFocus);
                          }} style={{ color: "#D98295" }}><Trash2 size={14} /> Delete</button>
                        </FloatingMenu>
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
            <span className="eon-sidebar-mode-icon eon-accent-icon" style={{ background: c.active, color: c.brand }}><Upload size={18} /></span>
            <strong style={{ color: c.text }}>Shared media</strong>
            <span>Logos, images, and tokens stay in sync across every prototype.</span>
          </div>
        )}
      </div>

      <HubSidebarFooter
        c={c}
        userEmail={userEmail}
        isAdmin={isAdmin}
        onOpenAdmin={onOpenAdmin}
        onSignOut={onSignOut}
        changelog={changelog}
      />
    </aside>
  );
}

/* ---- One row. Identity on the left, how-you-are-looking on the right.
   Anything that edits the prototype's source or its links lives in the
   context panel, not up here. ---- */
function WorkspaceToolbar({
  c, view, story, liveLinear, linearId, coViewers = [],
  navDrawer, navOpen, onOpenNav, inspectorDrawer, inspectorOpen, onToggleInspector,
  openFull, viewport, setViewport, layout, setLayout,
  saveState, onRetrySave, onOpenLinear,
}) {
  const linearConnection = linearConnectionState(liveLinear, linearId, c);
  return (
    <header className="eon-toolbar" style={{ background: c.nav, borderColor: c.border }}>
      <div className="eon-toolbar-primary">
        {navDrawer && !navOpen && (
          <button
            data-tutorial="nav-toggle"
            className="eon-buttonish eon-icon-button"
            onClick={onOpenNav}
            aria-label="Open prototype navigation"
            style={{ color: c.muted, boxShadow: hubShadow(c) }}
          >
            <Menu size={17} />
          </button>
        )}
        <div data-tutorial="prototype-title" className="eon-toolbar-title">
          <span>{view === "media" ? "Shared media" : story.title}</span>
          {view === "stories" && (
            <button
              data-tutorial="review-status"
              className="eon-buttonish eon-status-button"
              onClick={onOpenLinear}
              aria-label={`${linearConnection.label}. Open the Linear issue in the context panel`}
            >
              <Badge
                className="eon-story-status"
                title={linearConnection.kind === "connected" ? "Synced from Linear" : linearConnection.label}
                style={{
                  background: `${linearConnection.color}26`,
                  color: linearConnection.color,
                  border: 0,
                  fontWeight: 600,
                  gap: 5,
                }}
              >
                {linearConnection.kind === "error" && <AlertCircle size={12} aria-hidden="true" />}
                {linearConnection.label}
              </Badge>
            </button>
          )}
        </div>
        {view === "stories" && <PresenceAvatars c={c} viewers={coViewers} />}
        <div style={{ flex: 1 }} />
        {view === "stories" && (
          <>
            <SaveIndicator c={c} state={saveState} onRetry={onRetrySave} />
            <div className="eon-toolbar-views">
              <LiquidSegmentedControl
                options={Object.keys(VIEWPORTS).map((key) => ({
                  value: key,
                  Icon: VP_ICON[key],
                  title: VIEWPORTS[key].label,
                  ariaLabel: `${VIEWPORTS[key].label} viewport`,
                  tutorial: key === "mobile" ? "viewport-mobile" : undefined,
                }))}
                value={viewport}
                onValueChange={setViewport}
                c={c}
                className="eon-icon-segment"
                ariaLabel="Prototype viewport"
                variant="icon"
              />
              <LiquidSegmentedControl
                options={[["single", Square, "One screen"], ["grid", LayoutGrid, "Every state"]].map(([key, Icon, label]) => ({ value: key, Icon, title: label, ariaLabel: label }))}
                value={layout}
                onValueChange={setLayout}
                c={c}
                className="eon-icon-segment"
                ariaLabel="Canvas layout"
                variant="icon"
              />
            </div>
            <button className="eon-buttonish eon-secondary-button eon-full-button" onClick={openFull} aria-label="Open prototype in full view" title="Open prototype in full view"
              style={{ borderColor: c.border, background: c.panel, color: c.secondary }}>
              <Maximize2 size={15} /> <span>Full view</span>
            </button>
            {inspectorDrawer && (
              <button
                data-tutorial="review-toggle"
                className="eon-buttonish eon-icon-button"
                onClick={onToggleInspector}
                aria-label={inspectorOpen ? "Close the context panel" : "Open the context panel"}
                aria-pressed={inspectorOpen}
                title="Context panel"
                style={{ color: inspectorOpen ? c.brand : c.muted, boxShadow: hubShadow(c) }}
              >
                <MessageSquare size={16} />
              </button>
            )}
          </>
        )}
      </div>
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
  const [stateExpanded, setStateExpanded] = useState(false);
  const sheetRef = useDrawerFocus(compact && open, () => setOpen(false));
  const firstControl = layout === "single" ? (effStory.controls || [])[0] : null;
  const activeSummary = firstControl ? args[firstControl.key] : (layout === "grid" ? effGridBy : protoTheme);
  const stateControls = layout === "single" ? (effStory.controls || []) : [];
  const hasStateControls = layout === "grid" || stateControls.length > 0;

  // On the canvas the control floats with no surface behind it, so a bare text
  // label would sit on whatever background the user picked. The sheet has a
  // panel under it and keeps its labels.
  const stateContent = (labelled) => (
    <>
      {stateControls.map((control) => {
        const control_ = (
          <PeekSegmented key={control.key} value={args[control.key]} optionsKey={control.options.join("\u0000")}
            enabled={!compact} onOpenChange={setStateExpanded}>
            {segmented(control.options, args[control.key], (value) => setArg(control.key, value), false, control.label)}
          </PeekSegmented>
        );
        return labelled
          ? <ToolGroup key={control.key} label={control.label} c={c}>{control_}</ToolGroup>
          : control_;
      })}
      {layout === "grid" && (labelled
        ? <ToolGroup key="grid" label="Lay out by" c={c}>{segmented(gridOptions, effGridBy, setGridBy)}</ToolGroup>
        : segmented(gridOptions, effGridBy, setGridBy, false, "Lay out by"))}
    </>
  );
  const appearanceContent = (
    <>
      {!(layout === "grid" && effGridBy === "themes") && <ToolGroup label="Theme" c={c}>{segmented(["light", "dark"], protoTheme, setProtoTheme)}</ToolGroup>}
      <ToolGroup label="Background" c={c}>
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

  // Narrow screens have no room for two clusters, so one sheet carries both.
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
                  <strong id="eon-mobile-controls-title">Controls</strong>
                  <span style={{ color: c.muted }}>Prototype state and canvas appearance</span>
                </div>
                <button data-drawer-close className="eon-buttonish eon-icon-button" onClick={() => setOpen(false)} aria-label="Close prototype controls" style={{ color: c.muted }}><X size={17} /></button>
              </div>
              <div className="eon-controls-sheet-body">{stateContent(true)}{appearanceContent}</div>
            </section>
          </>
        )}
      </div>
    );
  }

  // Nothing to show when the prototype declares no states: an empty pill bar
  // reads as a broken control, not as an absent one.
  if (!hasStateControls) return null;

  return (
    <div data-tutorial="canvas-controls" className={`eon-ctlbar eon-ctlbar-float${stateExpanded ? " is-expanded" : ""}`}>
      {stateContent(false)}
    </div>
  );
}

/* ---- Bottom-right cluster: how you are looking at the prototype. Zoom is
   always out, theme and background sit one tap behind it. ---- */
function CanvasViewControls({
  c, scale, zoom, setZoom, layout, effGridBy, protoTheme, setProtoTheme,
  canvasBg, setCanvasBg, segmented,
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const dismiss = (event) => {
      if (event.key === "Escape") { setOpen(false); return; }
      if (event.type === "pointerdown" && !wrapRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("keydown", dismiss);
    document.addEventListener("pointerdown", dismiss);
    return () => {
      document.removeEventListener("keydown", dismiss);
      document.removeEventListener("pointerdown", dismiss);
    };
  }, [open]);

  const surface = {
    background: c.panel,
    border: `1px solid ${c.border}`,
    boxShadow: c.bg === "#000000" ? "0 8px 30px rgba(0,0,0,.35)" : "0 8px 30px rgba(0,0,0,.14)",
  };

  return (
    <div ref={wrapRef} className="eon-viewctl-float">
      {open && (
        <div className="eon-viewctl-popover" role="group" aria-label="Canvas appearance" style={surface}>
          {!(layout === "grid" && effGridBy === "themes") && (
            <ToolGroup label="Theme" c={c}>{segmented(["light", "dark"], protoTheme, setProtoTheme)}</ToolGroup>
          )}
          <ToolGroup label="Background" c={c}>
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
        </div>
      )}
      <div className="eon-zoom" style={surface}>
        {layout === "single" && (
          <>
            <button className="eon-buttonish eon-icon-button" onClick={() => setZoom((value) => Math.max(0.25, +(value - 0.1).toFixed(2)))} aria-label="Zoom out" style={{ color: c.muted }}><Minus size={15} /></button>
            <button className="eon-buttonish eon-zoom-value" onClick={() => setZoom(1)} title="Fit prototype to canvas" style={{ color: c.text }}>{Math.round(scale * zoom * 100)}%</button>
            <button className="eon-buttonish eon-icon-button" onClick={() => setZoom((value) => Math.min(4, +(value + 0.1).toFixed(2)))} aria-label="Zoom in" style={{ color: c.muted }}><Plus size={15} /></button>
            <span className="eon-viewctl-divider" style={{ background: c.border }} aria-hidden="true" />
          </>
        )}
        <button className="eon-buttonish eon-icon-button" onClick={() => setOpen((value) => !value)}
          aria-label="Theme and background" aria-expanded={open} title="Theme and background"
          style={{ color: open ? c.brand : c.muted }}>
          <SlidersHorizontal size={15} />
        </button>
      </div>
    </div>
  );
}


function ToolGroup({ label, c, children }) {
  return <div className="eon-tool-group"><span style={{ color: c.muted }}>{label}</span>{children}</div>;
}

/* ---- Context panel: everything that is true about this prototype. Readiness
   and the three links stay visible without a tab; the tabs below hold only the
   two things that stream in over time. ---- */
function ReviewInspector({
  c, story, comments, activity = [], profile, tab, setTab, onCreateComment, patch,
  anchors, editLinear, setEditLinear, editFigma, setEditFigma,
  liveLinear, linearId, isLiveLinked, fileLink, isBuiltIn, fileSync, autoPublish,
  compare, setCompare, canCompare, onOpenSource,
  rememberedLink, onReconnect, fileLinkError,
  openRow, setOpenRow,
  resize, isDrawer, onClose, peeking = null, onPeekStart, onPeekEnd,
}) {
  const drawerRef = useDrawerFocus(isDrawer, onClose);
  const figma = figmaMeta(story.figma_url || "");
  const linearConnection = linearConnectionState(liveLinear, linearId, c);
  const toggleRow = (key) => setOpenRow((current) => (current === key ? null : key));

  const sourceValue = isLiveLinked ? fileLink?.name
    : story.prototype_html ? "Uploaded HTML"
    : isBuiltIn ? "Built-in demo"
    : "Nothing uploaded";

  const syncedAt = fileSync?.at || fileLink?.lastSyncAt;
  const syncLabel = fileSync?.phase === "syncing" ? "Syncing"
    : !autoPublish ? "Local only"
    : syncedAt ? `Synced ${new Date(syncedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
    : "Watching";

  return (
    <aside
      data-tutorial="review-panel"
      ref={drawerRef}
      className={`eon-inspector${peeking === null ? "" : peeking ? " is-peeking" : " is-peek"}`}
      role={isDrawer ? "dialog" : undefined}
      aria-modal={isDrawer || undefined}
      aria-label="Prototype context"
      onMouseEnter={peeking === null ? undefined : onPeekStart}
      onMouseLeave={peeking === null ? undefined : onPeekEnd}
      onFocusCapture={peeking === null ? undefined : onPeekStart}
      style={{
        background: c.nav,
        borderColor: c.border,
        ...(!isDrawer ? { width: resize.width, flexBasis: resize.width } : {}),
      }}
    >
      {!isDrawer && <SidebarResizeHandle resize={resize} label="Resize the context panel" />}
      {isDrawer && (
        <div className="eon-inspector-mobile-head" style={{ borderColor: c.border }}>
          <strong>{story.title}</strong>
          <button data-drawer-close className="eon-buttonish eon-icon-button" onClick={onClose} aria-label="Close the context panel" style={{ color: c.muted }}><X size={17} /></button>
        </div>
      )}

      <div className="eon-context" style={{ borderColor: c.border }}>
        <ContextRow
          c={c} rowKey="source" icon={Upload} label="Source"
          valueText={isLiveLinked ? `${sourceValue}, ${syncLabel}` : sourceValue}
          value={isLiveLinked ? (
            <>
              {sourceValue}
              <span className={`eon-sync-chip${fileSync?.phase === "syncing" ? " is-syncing" : ""}`}
                style={{ background: c.raised, color: fileSync?.phase === "syncing" ? c.brand : c.muted }}>
                {syncLabel}
              </span>
            </>
          ) : sourceValue}
          valueTone={isLiveLinked ? c.brand : undefined} live={isLiveLinked}
          open={openRow === "source"} onToggle={() => toggleRow("source")}
          actions={(
            <>
              {rememberedLink && (
                <button className="eon-buttonish eon-context-action" onClick={onReconnect}
                  title={`Reconnect ${rememberedLink.name}`} style={{ borderColor: c.border, color: c.brand }}>
                  Reconnect
                </button>
              )}
              <button className="eon-buttonish eon-context-action" onClick={onOpenSource} style={{ borderColor: c.border, color: c.secondary }}>
                {story.prototype_html || isLiveLinked ? "Replace" : "Upload"}
              </button>
            </>
          )}
        >
          <p className="eon-context-note" style={{ color: c.muted }}>
            {isLiveLinked
              ? autoPublish
                ? `Watching ${fileLink?.name} on your machine. Every save renders here and publishes to your team.`
                : `Watching ${fileLink?.name} on your machine. Saves render here only until you publish.`
              : rememberedLink
                ? `${rememberedLink.name} was linked here before. Reconnect to resume live sync.`
                : story.prototype_html
                  ? "Rendering the HTML saved on this prototype. Your team sees the same file."
                  : isBuiltIn
                    ? "Rendering the built-in demo for this slug. Upload HTML to replace it."
                    : "Upload an HTML file to render this prototype."}
          </p>
          {fileLinkError && <p className="eon-context-note" role="alert" style={{ color: "#FF7A8A" }}>{fileLinkError}</p>}
        </ContextRow>

        <ContextRow
          c={c} rowKey="figma" icon={FigmaIcon} label="Figma" value={figma.valid ? figma.title : "Not linked"}
          valueTone={figma.valid ? undefined : c.muted}
          open={openRow === "figma"} onToggle={() => toggleRow("figma")}
          actions={(
            <>
              {canCompare && figma.valid && (
                <button data-tutorial="figma-compare" className="eon-buttonish eon-icon-button eon-context-icon" onClick={() => setCompare((value) => !value)}
                  aria-label="Compare with Figma side by side" aria-pressed={compare} title="Compare side by side"
                  style={{ color: compare ? c.brand : c.muted, background: compare ? c.active : "transparent" }}>
                  <Columns2 size={15} />
                </button>
              )}
              {figma.valid && (
                <a className="eon-buttonish eon-icon-button eon-context-icon" href={story.figma_url} target="_blank" rel="noreferrer"
                  aria-label="Open in Figma" title="Open in Figma" style={{ color: c.muted }}>
                  <ExternalLink size={14} />
                </a>
              )}
            </>
          )}
        >
          {figma.node && <p className="eon-context-note" style={{ color: c.muted }}>Node {figma.node}</p>}
          <ContextLinkField
            c={c} label="Figma share URL" value={story.figma_url || ""} placeholder="Paste a Figma share URL"
            hasValue={figma.valid} editing={editFigma} setEditing={setEditFigma}
            onChange={(value) => patch("figma_url", value)}
          />
        </ContextRow>

        <ContextRow
          c={c} rowKey="linear" icon={LinearIcon} label="Linear" value={linearId || "Not linked"}
          valueTone={linearId ? undefined : c.muted}
          open={openRow === "linear"} onToggle={() => toggleRow("linear")}
          actions={story.issue_url ? (
            <a className="eon-buttonish eon-icon-button eon-context-icon" href={story.issue_url} target="_blank" rel="noreferrer"
              aria-label="Open in Linear" title="Open in Linear" style={{ color: c.muted }}>
              <ExternalLink size={14} />
            </a>
          ) : null}
        >
          <ContextLinkField
            c={c} label="Linear issue URL" value={story.issue_url || ""} placeholder="Paste a Linear issue URL"
            hasValue={Boolean(story.issue_url)} editing={editLinear} setEditing={setEditLinear}
            onChange={(value) => patch("issue_url", value)}
          />
          {linearId && <LinearCard c={c} story={story} live={liveLinear} identifier={linearId} issueUrl={story.issue_url} />}
          {!linearId && (
            <p className="eon-context-note" style={{ color: c.muted }}>
              {linearConnection.kind === "error" ? "Paste an issue URL to pull its status, assignee, and description." : linearConnection.label}
            </p>
          )}
        </ContextRow>

      </div>

      <Tabs value={tab} onValueChange={setTab} className="eon-inspector-tabs">
        <TabsList className="eon-review-tabs" style={{ background: c.raised }}>
          <TabsTrigger data-tutorial="comments-tab" value="comments"><MessageSquare size={14} /> Comments <span className="eon-count" style={{ background: c.panel, color: c.muted }}>{comments.length}</span></TabsTrigger>
          <TabsTrigger data-tutorial="history-tab" value="history"><History size={14} /> History <span className="eon-count" style={{ background: c.panel, color: c.muted }}>{activity.length}</span></TabsTrigger>
        </TabsList>
        <TabsContent data-tutorial="comments-thread" value="comments" className="eon-inspector-content">
          <CommentThread c={c} comments={comments} profile={profile} projectId={story.id} onCreateComment={onCreateComment} anchors={anchors} />
        </TabsContent>
        <TabsContent data-tutorial="history-thread" value="history" className="eon-inspector-content">
          <HistoryTimeline c={c} activity={activity} currentUserId={profile?.id} />
        </TabsContent>
      </Tabs>
    </aside>
  );
}

/* ---- Device shell for the mobile viewport. Drawn around the iframe with
   negative offsets so the frame box, the pin coordinates, and the scaling all
   stay exactly as they were: this is decoration, not layout.

   The media library's `iPhone` mockup takes over when it is there. It is a
   cut-out: the screen is transparent, so it lays over the iframe and its bezel
   masks the corners. PHONE_SCREEN_INSET is measured from that file, where the
   hole is 1206x2622 in a 1350x2760 image, exactly 3x an iPhone 17 Pro screen,
   which is why VIEWPORTS.mobile matches that device. Without the asset, the
   built-in bezel draws the same phone in CSS and stays sharp at any zoom. ---- */
const PHONE_SCREEN_INSET = { top: 0.025, right: 0.05333, bottom: 0.025, left: 0.05333 };

function DeviceShell({ frame, scale }) {
  const px = (value) => `${value * scale}px`;
  if (frame) {
    // Grow the image so its screen area lands exactly on the iframe.
    const width = 1 / (1 - PHONE_SCREEN_INSET.left - PHONE_SCREEN_INSET.right);
    const height = 1 / (1 - PHONE_SCREEN_INSET.top - PHONE_SCREEN_INSET.bottom);
    return (
      <img
        className="eon-device-png"
        src={frame}
        alt=""
        aria-hidden="true"
        style={{
          width: `${width * 100}%`,
          height: `${height * 100}%`,
          left: `${-PHONE_SCREEN_INSET.left * width * 100}%`,
          top: `${-PHONE_SCREEN_INSET.top * height * 100}%`,
        }}
      />
    );
  }
  return (
    <span
      className="eon-device-shell"
      aria-hidden="true"
      style={{
        inset: `-${px(15)}`,
        borderRadius: px(66),
        borderWidth: px(3),
        boxShadow: `inset 0 0 0 ${px(12)} #050505, 0 ${px(22)} ${px(60)} rgba(0,0,0,.42)`,
      }}
    >
      <span className="eon-device-island" style={{ top: px(24), width: px(122), height: px(35), borderRadius: px(20) }} />
      <span className="eon-device-key is-action" style={{ left: px(-4), top: px(120), width: px(4), height: px(34), borderRadius: px(3) }} />
      <span className="eon-device-key is-up" style={{ left: px(-4), top: px(178), width: px(4), height: px(62), borderRadius: px(3) }} />
      <span className="eon-device-key is-down" style={{ left: px(-4), top: px(254), width: px(4), height: px(62), borderRadius: px(3) }} />
      <span className="eon-device-key is-power" style={{ right: px(-4), top: px(196), width: px(4), height: px(96), borderRadius: px(3) }} />
    </span>
  );
}

/* ---- A row menu inside a scrolling, transformed panel cannot escape its
   clipping with z-index alone, so it renders in a portal, fixed to where the
   trigger was, and flips above the trigger when the bottom is close. ---- */
function FloatingMenu({ c, anchor, storyId, itemCount, children }) {
  const WIDTH = 172;
  const height = 10 + itemCount * 40;
  const margin = 8;
  const gap = 6;
  const flipUp = anchor.bottom + gap + height > window.innerHeight - margin
    && anchor.top - gap - height > margin;
  const top = flipUp ? anchor.top - gap - height : anchor.bottom + gap;
  const left = Math.min(
    window.innerWidth - WIDTH - margin,
    Math.max(margin, anchor.right - WIDTH),
  );

  return createPortal(
    <div
      className="eon-story-menu is-floating"
      role="menu"
      data-story-menu={storyId}
      style={{
        top: Math.max(margin, top),
        left,
        width: WIDTH,
        transformOrigin: flipUp ? "bottom right" : "top right",
        background: c.panel,
        boxShadow: hubShadow(c),
      }}
    >
      {children}
    </div>,
    document.body,
  );
}

/* ---- Prototype source lives behind a sheet: it is a setup task, and setup
   tasks must not permanently shrink the thing under review. ---- */
function SourceSheet({ c, story, onClose, children }) {
  const sheetRef = useDrawerFocus(true, onClose);
  return (
    <>
      <button className="eon-sheet-scrim" aria-label="Close prototype source" onClick={onClose} />
      <section ref={sheetRef} className="eon-sheet" role="dialog" aria-modal="true" aria-labelledby="eon-source-title"
        style={{ background: c.nav, borderColor: c.border, color: c.text, boxShadow: hubShadow(c) }}>
        <div className="eon-sheet-head" style={{ borderColor: c.border }}>
          <div>
            <strong id="eon-source-title">Prototype source</strong>
            <span style={{ color: c.muted }}>{story.title}</span>
          </div>
          <button data-drawer-close className="eon-buttonish eon-icon-button" onClick={onClose} aria-label="Close prototype source" style={{ color: c.muted }}><X size={17} /></button>
        </div>
        <div className="eon-sheet-body">{children}</div>
      </section>
    </>
  );
}

/* ---- One fact about the prototype: label, current value, the actions that
   change it. Collapsed by default so the panel reads as a list, not a form. ---- */
function ContextRow({ c, rowKey, icon: Icon, label, value, valueText, valueTone, live, open, onToggle, actions, children }) {
  const bodyId = `eon-context-${rowKey}`;
  return (
    <div className="eon-context-row">
      <div className="eon-context-row-head">
        <button className="eon-buttonish eon-context-row-main" onClick={onToggle} aria-expanded={open} aria-controls={bodyId} aria-label={`${label}: ${valueText ?? value}`}>
          <Icon size={14} style={{ color: c.muted }} aria-hidden="true" />
          <span className="eon-context-row-label" style={{ color: c.muted }}>{label}</span>
          <span className="eon-context-row-value" style={{ color: valueTone || c.text }}>
            {live && <span className="eon-live-dot" aria-hidden="true" />}
            {value}
          </span>
          <ChevronDown size={13} className={open ? "" : "is-collapsed"} style={{ color: c.muted }} aria-hidden="true" />
        </button>
        {actions && <div className="eon-context-row-actions">{actions}</div>}
      </div>
      {open && <div id={bodyId} className="eon-context-row-body">{children}</div>}
    </div>
  );
}

/* ---- A link is either shown with an Edit affordance or being edited. ---- */
function ContextLinkField({ c, label, value, placeholder, hasValue, editing, setEditing, onChange }) {
  if (hasValue && !editing) {
    return (
      <button className="eon-buttonish eon-text-button eon-context-edit" onClick={() => setEditing(true)} style={{ color: c.secondary }}>
        <Pencil size={12} aria-hidden="true" /> Edit link
      </button>
    );
  }
  return (
    <div className="eon-context-field">
      <Input aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder}
        style={{ minHeight: 40, background: c.raised, borderColor: c.border, color: c.text, borderRadius: 999 }} />
      {hasValue && (
        <button className="eon-buttonish eon-text-button" onClick={() => setEditing(false)} style={{ color: c.brand }}>Done</button>
      )}
    </div>
  );
}


/* ---- Large Figma pane for the side-by-side compare: slim unfurl header over
   the full-bleed embed. Looking only; the link is owned by the context panel. ---- */
function FigmaPane({ c, story, ratio }) {
  const meta = figmaMeta(story.figma_url || "");
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
            <a className="eon-buttonish eon-secondary-button" href={story.figma_url} target="_blank" rel="noreferrer"
              style={{ borderColor: c.border, background: c.raised, color: c.secondary, textDecoration: "none" }}>
              <ExternalLink size={13} aria-hidden="true" /> Open in Figma
            </a>
          </div>
          <div className="eon-compare-embed"><FigmaEmbed url={story.figma_url} /></div>
        </>
      ) : (
        <div className="eon-compare-empty">
          <ReferenceEmpty c={c} icon={FigmaIcon} title="No Figma frame linked" body="Add a share URL under Figma in the context panel to compare here." />
        </div>
      )}
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
            <span className="eon-comment-empty-icon eon-accent-icon" style={{ background: c.raised, color: c.brand }}>
              {filter === "resolved" ? <Check size={20} /> : <MessageSquare size={20} />}
            </span>
            <strong style={{ color: c.text }}>{filter === "resolved" ? "Nothing resolved yet" : "Start the conversation"}</strong>
          </div>
        ) : shown.map((comment) => (
          <CommentBubble key={comment.id} c={c} comment={comment} currentUserId={profile?.id}
            pinNumber={anchors.pinNumberById?.[comment.id]}
            active={anchors.activeAnchorId === comment.id}
            onSelect={() => (anchors.activeAnchorId === comment.id
              ? anchors.setActiveAnchorId?.(null)
              : anchors.jumpToAnchor?.(comment))}
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
            <span className="eon-pin-dot" style={{ background: c.brand, color: "var(--eon-accent-foreground)" }}><Pin size={11} /></span>
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
          style={{ minHeight: 76, maxHeight: 180, resize: "vertical", background: c.raised, borderColor: error ? "#D98295" : dragging ? c.brand : c.border, color: c.text, borderRadius: 20, fontSize: 14, lineHeight: 1.5 }} />
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
          <span role={error ? "alert" : "status"} style={{ color: error ? "#D98295" : anchors.anchorMode ? c.brand : c.muted }}>{error || status}</span>
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
      onClick={comment.anchor && onJump
        ? (event) => { if (!event.target.closest("button, a, textarea, input")) onJump(); }
        : undefined}
      style={{ opacity: comment.pending ? 0.6 : resolved ? 0.75 : 1, boxShadow: active ? `inset 2px 0 0 ${c.brand}` : "none", cursor: comment.anchor && onJump ? "pointer" : undefined }}>
      <div className="eon-comment-avatar" style={{ background: mine ? c.active : c.raised, color: mine ? c.brand : c.secondary }}>{initials || "T"}</div>
      <div className="eon-comment-body">
        <div className="eon-comment-meta">
          {comment.anchor && (
            <button type="button" className="eon-buttonish eon-pin-dot" onClick={onSelect}
              aria-label={`Show pin ${pinNumber || ""} on the prototype`} aria-pressed={active}
              style={{ background: active ? c.brand : c.raised, color: active ? "var(--eon-accent-foreground)" : c.brand, border: `1px solid ${active ? c.brand : c.border}` }}>
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
                aria-pressed={group.mine} aria-label={`Toggle ${group.emoji} reaction. ${group.count} total`}
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
  { key: "slop",  icon: "🤖", label: "AI slop", body: "This reads like AI. Give it a human pass." },
  { key: "up",    icon: "👍", label: "Like", body: "👍" },
  { key: "love",  icon: "❤️", label: "Love", body: "❤️" },
  { key: "fire",  icon: "🔥", label: "Fire", body: "🔥" },
  { key: "hmm",   icon: "😕", label: "Not sure", body: "😕" },
  { key: "write", icon: null, label: "Write…", write: true },
];

function PinRing({ c, x, y, onPick, onWrite, onCancel }) {
  const radius = 74;
  const size = 188;
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setExpanded(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  return (
    <Liquid
      className="eon-pin-ring"
      style={{ left: x - size / 2, top: y - size / 2, width: size, height: size }}
      role="menu"
      aria-label="Quick comment"
      blur={8}
      contrast={20}
      fill={c.panel}
      shadow="0 4px 14px rgba(0,0,0,.3)"
      filterPadding={28}
    >
      {QUICK_PIN_OPTIONS.map((option, index) => {
        const angle = ((index * 360) / QUICK_PIN_OPTIONS.length - 90) * (Math.PI / 180);
        const targetX = Math.cos(angle) * radius;
        const targetY = Math.sin(angle) * radius;
        return (
          <Liquid.Item
            key={option.key}
            className="eon-pin-ring-liquid-item"
            x={expanded ? targetX : 0}
            y={expanded ? targetY : 0}
            transition={{ stiffness: 430, damping: 24, mass: 0.82 }}
            delay={index * 22}
            radius={20}
          >
            <button type="button" role="menuitem" className="eon-buttonish eon-pin-ring-item"
              style={{ borderColor: c.border, color: c.text }}
              onClick={() => (option.write ? onWrite() : onPick(option.body))}
              aria-label={option.label}>
              {option.icon || <MessageSquare size={15} />}
              <span className="eon-ring-label" style={{ background: c.panel, borderColor: c.border, color: c.secondary }}>{option.label}</span>
            </button>
          </Liquid.Item>
        );
      })}
      <button type="button" className="eon-buttonish eon-pin-ring-center" onClick={onCancel} aria-label="Cancel pin"
        style={{ background: c.raised, borderColor: c.border, color: c.secondary }}>
        <X size={13} />
      </button>
    </Liquid>
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
        style={{ minHeight: 54, maxHeight: 120, resize: "none", background: c.raised, borderColor: c.border, color: c.text, borderRadius: 18, fontSize: 13, lineHeight: 1.45 }} />
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

// A comment containing one emoji uses that emoji as its pin.
function emojiOnlyBody(body) {
  const text = (body || "").trim();
  if (!text || /\s/.test(text) || [...text].length > 3) return null;
  return /^\p{Extended_Pictographic}/u.test(text) ? text : null;
}

/* ---- Pins on the canvas: dots over the iframe at each anchored comment ---- */
function PinOverlay({
  c, pins, pendingAnchor, rects, scroll, vp, frameScale, activeAnchorId, currentUserId, onPickPin,
  ringOpen, pinWriteOpen, onQuickComment, onWriteComment, onCancelRing,
}) {
  const place = (anchor) => {
    const point = anchorPoint(anchor, rects, vp.w, vp.h, scroll);
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
            style={{ left: point.left, top: point.top, background: active ? c.brand : c.panel, color: active ? "var(--eon-accent-foreground)" : c.brand, borderColor: c.brand, transform: active ? "scale(1.15)" : undefined }}>
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
        <span className="eon-canvas-pin eon-canvas-pin-pending" style={{ left: pendingPoint.left, top: pendingPoint.top, background: c.brand, color: "var(--eon-accent-foreground)", borderColor: c.brand }}>
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
    // The pin tracks its element while the card scrolls in the thread.
    // Measure both endpoints every frame while a comment is selected.
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
  renamed:        { icon: Pencil,        text: (d) => (d?.to ? `renamed it to "${d.to}"` : "renamed the prototype") },
  edited_figma:   { icon: FigmaIcon,     text: (d) => (d?.to ? "updated the Figma link" : "cleared the Figma link") },
  edited_linear:  { icon: LinearIcon,    text: (d) => (d?.to ? "updated the Linear link" : "cleared the Linear link") },
  moved_group:    { icon: LayoutGrid,    text: (d) => (d?.to ? `moved it to "${d.to}"` : "moved it to another group") },
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
        <span className="eon-comment-empty-icon eon-accent-icon" style={{ background: c.raised, color: c.brand }}><History size={20} /></span>
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
            <span className={`eon-history-icon${isDangerAction(item.action) ? "" : " eon-accent-icon"}`} style={{ background: c.raised, color: isDangerAction(item.action) ? "#D98295" : c.brand }}>
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
      <span className={`eon-toast-icon${isDangerAction(toast.action) ? "" : " eon-accent-icon"}`} style={{ background: c.raised, color: isDangerAction(toast.action) ? "#D98295" : c.brand }}>
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
        <div className="eon-confirm-icon" style={{ background: "rgba(217,130,149,.1)", color: "#D98295" }}><Trash2 size={18} /></div>
        <h2 id="eon-delete-title">Delete "{project.title}"?</h2>
        <p id="eon-delete-body" style={{ color: c.muted }}>This removes the prototype, its shared feedback, and linked review context for everyone. This can't be undone.</p>
        {error && <p role="alert" className="eon-copy-error">{error}</p>}
        <div className="eon-confirm-actions">
          <button autoFocus className="eon-buttonish eon-secondary-button" onClick={onClose} disabled={busy} style={{ borderColor: c.border, color: c.secondary }}>Cancel</button>
          <Button className="eon-buttonish" onClick={remove} disabled={busy} style={{ minHeight: 40, background: "#D98295", color: "#210C12", borderRadius: 10, fontWeight: 650 }}>
            {busy ? "Deleting…" : "Delete prototype"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ---- New-prototype dialog replaces the old window.prompt flow.
   It collects a name, group, and optional prototype HTML by drop, browse, or
   paste. onCreate handles creation and the dialog shows errors inline. ------ */
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
      setError("Drop an HTML file. Other formats aren't supported.");
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

  const fieldStyle = { minHeight: 40, background: c.raised, borderColor: c.border, color: c.text, borderRadius: 999, fontSize: 13 };
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
            <div style={stepHead}><span style={stepBadge}>3</span> Add the prototype HTML <span style={{ fontSize: 11, fontWeight: 400, color: c.muted }}>optional, you can upload it later</span></div>
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
              style={{ minHeight: 96, maxHeight: 220, background: c.raised, borderColor: c.border, color: c.text, fontSize: 12, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", resize: "vertical", borderRadius: 20 }} />
            <span style={{ fontSize: 11, color: c.muted, lineHeight: 1.5 }}>
              "Copy setup prompt" gives an AI the theming rules, states, and media tokens such as <code style={{ color: c.text }}>{"{{heroImage}}"}</code>.
            </span>
          </div>
        </div>
        <div className="eon-modal-foot" style={{ borderColor: c.border }}>
          <span role="alert" style={{ flex: 1, fontSize: 12, color: "#D98295" }}>{error}</span>
          <button className="eon-buttonish eon-secondary-button" onClick={onClose} disabled={busy} style={{ borderColor: c.border, background: "transparent", color: c.secondary }}>Cancel</button>
          <Button className="eon-buttonish" onClick={submit} disabled={!title.trim() || busy}
            style={{ minHeight: 40, padding: "0 16px", borderRadius: 999, background: c.primary, color: c.primaryText, fontSize: 13, fontWeight: 600, opacity: !title.trim() || busy ? 0.5 : 1 }}>
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
    error: { icon: <AlertCircle size={13} />, label: "Save failed", color: "#D98295" },
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

function sandboxedFullView(source, title) {
  const escapedSource = String(source).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  const escapedTitle = String(title || "Prototype").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]);
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapedTitle}</title><style>*{box-sizing:border-box}html,body,iframe{width:100%;height:100%;margin:0}iframe{display:block;border:0}</style></head><body><iframe title="${escapedTitle}" sandbox="${PROTOTYPE_SANDBOX}" referrerpolicy="no-referrer" allow="clipboard-read; clipboard-write" srcdoc="${escapedSource}"></iframe></body></html>`;
}

function readStoredJson(key) {
  try { return JSON.parse(window.localStorage.getItem(key) || "{}"); }
  catch { return {}; }
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

function hubShadow() {
  return "var(--shadow-surface)";
}
