import { useEffect, useMemo, useRef, useState } from "react";
import { fetchLinearIssue } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Check, ChevronDown, Circle, CircleDot, Columns2, Copy, ExternalLink, Figma,
  LayoutGrid, LogOut, Maximize2, MessageSquare, Minus, Monitor, Laptop,
  MoreHorizontal, Moon, PanelLeftClose, PanelLeftOpen, PanelRightClose,
  PanelRightOpen, Pencil, Plus, Search, Send, Shield, Smartphone, Square, Sun,
  Tablet, Trash2, Upload, X,
} from "lucide-react";
import {
  CANVAS_PRESETS, HUB, MEDIA, STATUS_COLOR, VIEWPORTS, currentArgs,
  parsePrototypeConfig, renderStory,
} from "./prototypes";
import {
  FigmaEmbed, LinearCard, MediaManager, SETUP_PROMPT, StateGrid,
  UploadPanel, figmaMeta,
} from "./PrototypeHub";

const VP_ICON = { desktop: Monitor, laptop: Laptop, tablet: Tablet, mobile: Smartphone };

export default function PrototypeWorkspace({
  projects, assets = {}, comments = [], isAdmin, profile, userEmail,
  activeId, onSelectStory,
  onPatchProject, onSetAsset, onNewProject, onDeleteProject, onReorder,
  onCreateComment, onOpenAdmin, onSignOut,
}) {
  const [hubTheme, setHubTheme] = useState("dark");
  const [protoTheme, setProtoTheme] = useState("dark");
  const [view, setView] = useState("stories");
  const [viewport, setViewport] = useState("laptop");
  const [layout, setLayout] = useState("single");
  const [gridBy, setGridBy] = useState("states");
  const [query, setQuery] = useState("");
  const [canvasBg, setCanvasBg] = useState("#808080");
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
  const [liveLinear, setLiveLinear] = useState(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [navOpen, setNavOpen] = useState(() => window.innerWidth >= 900);
  const [inspectorOpen, setInspectorOpen] = useState(() => window.innerWidth >= 1120);
  const [compare, setCompare] = useState(false);
  const [splitRatio, setSplitRatio] = useState(0.5);
  const [splitDragging, setSplitDragging] = useState(false);
  const [inspectorTab, setInspectorTab] = useState("comments");
  const compareRef = useRef(null);
  const canvasRef = useRef(null);
  const [canvasSize, setCanvasSize] = useState({ width: 960, height: 640 });

  const c = HUB[hubTheme];
  const story = projects.find((item) => item.id === activeId) || projects[0];
  const media = assets;

  useEffect(() => {
    const node = canvasRef.current;
    if (!node) return undefined;
    const observer = new ResizeObserver(([entry]) => {
      setCanvasSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [view, navOpen, inspectorOpen]);

  const cfg = useMemo(() => parsePrototypeConfig(story?.prototype_html), [story?.prototype_html]);
  const effStory = useMemo(() => {
    if (!story) return story;
    const controls = story.controls?.length ? story.controls : (cfg.controls || []);
    return { ...story, controls, defaults: { ...(cfg.defaults || {}), ...(story.defaults || {}) } };
  }, [story, cfg]);
  const args = effStory ? currentArgs(effStory, liveArgs[effStory.id]) : {};
  const vp = VIEWPORTS[viewport];
  const html = useMemo(
    () => (effStory ? renderStory(effStory, protoTheme, media, args) : ""),
    [effStory, args, protoTheme, media],
  );
  const scale = useMemo(() => Math.min(
    Math.max(0.2, (canvasSize.width - 64) / vp.w),
    Math.max(0.2, (canvasSize.height - 64) / vp.h),
    1,
  ), [canvasSize, vp]);

  const groups = useMemo(() => {
    const q = query.toLowerCase();
    const grouped = {};
    projects
      .filter((item) => item.title.toLowerCase().includes(q) || (item.group_name || "").toLowerCase().includes(q))
      .forEach((item) => { (grouped[item.group_name || "General"] ||= []).push(item); });
    return grouped;
  }, [projects, query]);

  useEffect(() => {
    const url = story?.issue_url || "";
    const id = url.match(/\/issue\/([A-Za-z][A-Za-z0-9]*-\d+)/i)?.[1] || story?.issue_id || null;
    setLiveLinear(null);
    if (!id) return undefined;
    let stale = false;
    fetchLinearIssue(id).then((issue) => { if (!stale) setLiveLinear(issue); });
    return () => { stale = true; };
  }, [story?.id, story?.issue_url, story?.issue_id]);

  useEffect(() => {
    setStoryMenuId(null);
    setEditFigma(false);
    setEditLinear(false);
  }, [story?.id]);

  if (!story) {
    return (
      <div className={hubTheme === "dark" ? "" : "light"} style={{ height: "100vh", display: "grid", placeItems: "center", background: c.bg, color: c.text }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>No prototypes yet</div>
          <Button className="eon-buttonish" onClick={() => setShowNewDialog(true)} style={{ marginTop: 12, minHeight: 40, background: c.primary, color: c.primaryText }}>New prototype</Button>
        </div>
        {showNewDialog && (
          <NewPrototypeDialog c={c} groups={[]} onClose={() => setShowNewDialog(false)} onCreate={onNewProject} />
        )}
      </div>
    );
  }

  // States always leads; StateGrid explains itself when none are declared.
  const gridOptions = ["states", "themes", "screens"];
  const effGridBy = gridOptions.includes(gridBy) ? gridBy : gridOptions[0];
  const effCompare = compare;
  const [sc0, sc1] = STATUS_COLOR[story.status] || STATUS_COLOR.Exploration;
  const linearId = story.issue_url?.match(/\/issue\/([A-Za-z][A-Za-z0-9]*-\d+)/i)?.[1] || story.issue_id || null;
  const storyComments = comments.filter((comment) => comment.project_id === story.id);
  const frameScale = scale * zoom;
  const frameWidth = vp.w * frameScale;
  const frameHeight = vp.h * frameScale;

  const setArg = (key, value) => setLiveArgs((previous) => ({
    ...previous,
    [story.id]: { ...previous[story.id], [key]: value },
  }));
  const patch = (field, value) => onPatchProject(story.id, { [field]: value });
  const openFull = () => {
    const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
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
      await navigator.clipboard.writeText(SETUP_PROMPT);
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
    <div className={`${hubTheme === "dark" ? "" : "light"} eon-workspace`} style={{ background: c.bg, color: c.text }}>
      {navOpen && (
        <WorkspaceSidebar
          c={c} media={media} view={view} setView={setView} query={query} setQuery={setQuery}
          groups={groups} activeId={story.id} onSelect={onSelectStory} isAdmin={isAdmin}
          onNewProject={() => setShowNewDialog(true)} dragId={dragId} setDragId={setDragId}
          dropTargetId={dropTargetId} setDropTargetId={setDropTargetId} handleDrop={handleDrop}
          renamingId={renamingId} setRenamingId={setRenamingId} commitRename={commitRename}
          renamingGroup={renamingGroup} setRenamingGroup={setRenamingGroup} commitGroupRename={commitGroupRename}
          storyMenuId={storyMenuId} setStoryMenuId={setStoryMenuId} onDeleteProject={onDeleteProject}
          copiedPrompt={copiedPrompt} copySetupPrompt={copySetupPrompt} userEmail={userEmail}
          onOpenAdmin={onOpenAdmin} onSignOut={onSignOut}
        />
      )}

      <main className="eon-workspace-main">
        <WorkspaceToolbar
          c={c} view={view} story={story} liveLinear={liveLinear} sc0={sc0} sc1={sc1}
          navOpen={navOpen} setNavOpen={setNavOpen} inspectorOpen={inspectorOpen}
          setInspectorOpen={setInspectorOpen} hubTheme={hubTheme} setHubTheme={setHubTheme}
          showUpload={showUpload} setShowUpload={setShowUpload} openFull={openFull}
          viewport={viewport} setViewport={setViewport} layout={layout} setLayout={setLayout}
          compare={effCompare} setCompare={setCompare}
        />

        {showUpload && view === "stories" && (
          <UploadPanel key={story.id} c={c} story={story}
            onSave={(source) => { patch("prototype_html", source); setShowUpload(false); }}
            onClear={() => { patch("prototype_html", null); setShowUpload(false); }}
            onCancel={() => setShowUpload(false)} />
        )}

        {view === "media" ? (
          <div className="eon-media-scroll"><MediaManager c={c} assets={assets} onSetAsset={onSetAsset} /></div>
        ) : (
          <div ref={compareRef} className={`eon-compare${splitDragging ? " is-dragging" : ""}`}>
            <div className="eon-canvas-zone" style={{ flex: effCompare ? `${splitRatio} 1 0%` : undefined }}>
              <section ref={canvasRef} className="eon-canvas" aria-label={`${story.title} prototype canvas`} style={{ background: canvasBg }}>
                {layout === "single" ? (
                  <div className="eon-canvas-stage" style={{ width: Math.max(canvasSize.width, frameWidth + 64), height: Math.max(canvasSize.height, frameHeight + 64) }}>
                    <div style={{ width: frameWidth, height: frameHeight, flexShrink: 0 }}>
                      <iframe className="eon-prototype-frame" key={`${story.id}-${JSON.stringify(args)}-${protoTheme}`}
                        title={story.title} srcDoc={html}
                        style={{ width: vp.w, height: vp.h, colorScheme: protoTheme, transform: `scale(${frameScale})`, transformOrigin: "top left" }} />
                    </div>
                  </div>
                ) : (
                  <div className="eon-grid-stage">
                    <StateGrid c={c} story={effStory} media={media} theme={protoTheme} viewport={viewport} by={effGridBy} />
                  </div>
                )}
              </section>
              <CanvasControlBar
                c={c} layout={layout} effStory={effStory} args={args} setArg={setArg}
                gridOptions={gridOptions} effGridBy={effGridBy} setGridBy={setGridBy}
                protoTheme={protoTheme} setProtoTheme={setProtoTheme} canvasBg={canvasBg}
                setCanvasBg={setCanvasBg} segmented={segmented}
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
          c={c} story={story} comments={storyComments} profile={profile}
          tab={inspectorTab} setTab={setInspectorTab}
          onCreateComment={onCreateComment} patch={patch}
          editLinear={editLinear} setEditLinear={setEditLinear}
          sc0={sc0} sc1={sc1} liveLinear={liveLinear} linearId={linearId}
        />
      )}

      {showNewDialog && (
        <NewPrototypeDialog c={c} groups={Object.keys(groups)} onClose={() => setShowNewDialog(false)} onCreate={onNewProject} />
      )}
    </div>
  );
}

function WorkspaceSidebar({
  c, media, view, setView, query, setQuery, groups, activeId, onSelect, isAdmin,
  onNewProject, dragId, setDragId, dropTargetId, setDropTargetId, handleDrop,
  renamingId, setRenamingId, commitRename,
  renamingGroup, setRenamingGroup, commitGroupRename,
  storyMenuId, setStoryMenuId,
  onDeleteProject, copiedPrompt, copySetupPrompt, userEmail, onOpenAdmin, onSignOut,
}) {
  return (
    <aside className="eon-sidebar" style={{ background: c.nav, borderColor: c.border }}>
      <div className="eon-sidebar-head" style={{ borderColor: c.border }}>
        <div className="eon-brand">
          <span style={{ display: "inline-flex" }} dangerouslySetInnerHTML={{ __html: MEDIA.logos.eon(c.text, c.brand, media.eonLogo) }} />
          <span>Eon Prototypes</span>
        </div>
        <div style={{ position: "relative" }}>
          <Search aria-hidden="true" style={{ position: "absolute", left: 12, top: 12, width: 15, height: 15, color: c.muted, pointerEvents: "none" }} />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search prototypes" aria-label="Search prototypes"
            style={{ minHeight: 40, paddingLeft: 34, background: c.raised, borderColor: c.border, color: c.text, borderRadius: 10 }} />
        </div>
        <div className="eon-sidebar-switcher" style={{ background: c.raised }}>
          {["stories", "media"].map((item) => {
            const selected = view === item;
            return (
              <button className="eon-buttonish" key={item} onClick={() => setView(item)} aria-pressed={selected}
                style={{ flex: 1, minHeight: 34, border: 0, borderRadius: 7, background: selected ? c.panel : "transparent", color: selected ? c.text : c.muted, cursor: "pointer", fontSize: 13, fontWeight: selected ? 600 : 400 }}>
                {item === "stories" ? "Prototypes" : "Media"}
              </button>
            );
          })}
        </div>
        <button className="eon-buttonish eon-secondary-button" onClick={copySetupPrompt}
          title="Copy the prototype authoring prompt" style={{ borderColor: c.border, background: c.raised, color: copiedPrompt ? c.brand : c.secondary }}>
          {copiedPrompt ? <Check size={14} /> : <Copy size={14} />}
          {copiedPrompt ? "Copied setup prompt" : "Copy setup prompt"}
        </button>
      </div>

      <div className="eon-story-list">
        <button className="eon-buttonish eon-new-story" onClick={onNewProject} style={{ borderColor: c.border, color: c.secondary }}>
          <Plus size={17} /> New prototype
        </button>
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
              <div className="eon-group-label" style={{ color: c.muted }}
                onDoubleClick={() => isAdmin && setRenamingGroup(group)}
                title={isAdmin ? "Double-click to rename" : undefined}>
                <ChevronDown size={13} /> {group}
              </div>
            )}
            {items.map((item) => {
              const active = activeId === item.id;
              return (
                <div className="eon-story-row" key={item.id} draggable={isAdmin}
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
                    <button className="eon-buttonish eon-story-select" onClick={() => { onSelect(item); setView("stories"); setStoryMenuId(null); }}
                      onDoubleClick={() => isAdmin && setRenamingId(item.id)} title={isAdmin ? "Double-click to rename" : undefined}
                      aria-current={active ? "page" : undefined} style={{ color: active ? c.text : c.secondary, fontWeight: active ? 600 : 400 }}>
                      <Circle size={13} color={active ? c.brand : c.muted} />
                      <span>{item.title}</span>
                    </button>
                  )}
                  {isAdmin && renamingId !== item.id && (
                    <div style={{ position: "relative", flexShrink: 0 }}>
                      <button className="eon-buttonish eon-icon-button" onClick={() => setStoryMenuId((current) => current === item.id ? null : item.id)}
                        aria-label={`Actions for ${item.title}`} aria-expanded={storyMenuId === item.id} style={{ color: c.muted }}>
                        <MoreHorizontal size={16} />
                      </button>
                      {storyMenuId === item.id && (
                        <div className="eon-story-menu" style={{ background: c.panel, boxShadow: hubShadow(c) }}>
                          <button className="eon-buttonish" onClick={() => { setRenamingId(item.id); setStoryMenuId(null); }} style={{ color: c.text }}><Pencil size={14} /> Rename</button>
                          <button className="eon-buttonish" onClick={() => { setStoryMenuId(null); onDeleteProject?.(item.id); }} style={{ color: "#FF6B8A" }}><Trash2 size={14} /> Delete</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
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
  c, view, story, liveLinear, sc0, sc1, navOpen, setNavOpen, inspectorOpen,
  setInspectorOpen, hubTheme, setHubTheme, showUpload, setShowUpload, openFull,
  viewport, setViewport, layout, setLayout, compare, setCompare,
}) {
  return (
    <header className="eon-toolbar" style={{ background: c.nav, borderColor: c.border }}>
      <div className="eon-toolbar-primary">
        <button className="eon-buttonish eon-icon-button" onClick={() => setNavOpen((open) => !open)}
          aria-label={navOpen ? "Collapse prototype navigation" : "Open prototype navigation"} aria-pressed={navOpen} style={{ color: c.muted, boxShadow: hubShadow(c) }}>
          {navOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
        </button>
        <div className="eon-toolbar-title">
          <span>{view === "media" ? "Media library" : story.title}</span>
          {view === "stories" && (liveLinear?.state
            ? <Badge className="eon-story-status" title="Live from Linear" style={{ background: `${liveLinear.state.color}26`, color: liveLinear.state.color, border: 0, fontWeight: 600 }}>{liveLinear.state.name}</Badge>
            : <Badge className="eon-story-status" style={{ background: sc0, color: sc1, border: 0, fontWeight: 600 }}>{story.status}</Badge>)}
        </div>
        <div style={{ flex: 1 }} />
        <button className="eon-buttonish eon-icon-button" onClick={() => setHubTheme(hubTheme === "dark" ? "light" : "dark")}
          aria-label={`Switch hub interface to ${hubTheme === "dark" ? "light" : "dark"} theme`} title="Hub interface theme" style={{ color: c.muted, boxShadow: hubShadow(c) }}>
          {hubTheme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        {view === "stories" && (
          <>
            <button className="eon-buttonish eon-secondary-button eon-upload-button" onClick={() => setShowUpload((open) => !open)} aria-expanded={showUpload}
              style={{ borderColor: showUpload ? c.brand : c.border, background: c.panel, color: showUpload ? c.brand : c.secondary }}>
              <Upload size={15} /> <span>Upload HTML</span>
            </button>
            <Button className="eon-buttonish eon-full-button" onClick={openFull} style={{ minHeight: 40, background: c.primary, color: c.primaryText, borderRadius: 10, gap: 7, fontSize: 13, fontWeight: 600 }}>
              <Maximize2 size={15} /> <span>Open full view</span>
            </Button>
            <button className="eon-buttonish eon-icon-button" onClick={() => setInspectorOpen((open) => !open)}
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
                return <button className="eon-buttonish eon-icon-button" key={key} onClick={() => setViewport(key)} title={VIEWPORTS[key].label} aria-label={`${VIEWPORTS[key].label} viewport`} aria-pressed={selected} style={{ color: selected ? c.selectedText : c.muted, background: selected ? c.selected : "transparent" }}><Icon size={16} /></button>;
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
                <button className="eon-buttonish eon-icon-button" onClick={() => setCompare((value) => !value)}
                  title="Compare with the linked Figma frame" aria-label="Compare with Figma" aria-pressed={compare}
                  style={{ color: compare ? c.selectedText : c.muted, background: compare ? c.selected : "transparent" }}>
                  <Columns2 size={16} />
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
  protoTheme, setProtoTheme, canvasBg, setCanvasBg, segmented,
}) {
  return (
    <div className="eon-ctlbar eon-ctlbar-float" style={{ background: c.panel, border: `1px solid ${c.border}`, boxShadow: c.bg === "#000000" ? "0 8px 30px rgba(0,0,0,.35)" : "0 8px 30px rgba(0,0,0,.14)" }}>
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
    </div>
  );
}

function ToolGroup({ label, c, children }) {
  return <div className="eon-tool-group"><span style={{ color: c.muted }}>{label}</span>{children}</div>;
}

function ReviewInspector({
  c, story, comments, profile, tab, setTab, onCreateComment, patch,
  editLinear, setEditLinear, sc0, sc1, liveLinear, linearId,
}) {
  return (
    <aside className="eon-inspector" style={{ background: c.nav, borderColor: c.border }}>
      <div className="eon-inspector-head" style={{ borderColor: c.border }}>
        <div><strong>Review</strong></div>
      </div>
      <Tabs value={tab} onValueChange={setTab} className="eon-inspector-tabs">
        <TabsList className="eon-review-tabs" style={{ background: c.raised }}>
          <TabsTrigger value="comments"><MessageSquare size={14} /> Comments <span className="eon-count" style={{ background: c.panel, color: c.muted }}>{comments.length}</span></TabsTrigger>
          <TabsTrigger value="linear"><CircleDot size={14} /> Linear</TabsTrigger>
        </TabsList>
        <TabsContent value="comments" className="eon-inspector-content">
          <CommentThread c={c} comments={comments} profile={profile} projectId={story.id} onCreateComment={onCreateComment} />
        </TabsContent>
        <TabsContent value="linear" className="eon-inspector-content eon-reference-content">
          <ReferenceHeader c={c} label="Linear issue" hasValue={Boolean(story.issue_url)} editing={editLinear} setEditing={setEditLinear} />
          {(!story.issue_url || editLinear) && <Input value={story.issue_url || ""} onChange={(event) => patch("issue_url", event.target.value)} placeholder="Paste a Linear issue URL" style={{ minHeight: 40, background: c.bg, borderColor: c.border, color: c.text, borderRadius: 10 }} />}
          <LinearCard c={c} story={story} sc0={sc0} sc1={sc1} live={liveLinear} identifier={linearId} issueUrl={story.issue_url} />
        </TabsContent>
      </Tabs>
    </aside>
  );
}

/* ---- Large Figma pane for the side-by-side compare: slim unfurl header over
   the full-bleed embed. The Figma link is edited here, not in the panel. ---- */
function FigmaPane({ c, story, ratio, patch, editing, setEditing }) {
  const meta = figmaMeta(story.figma_url || "");
  const linkInput = (
    <Input value={story.figma_url || ""} onChange={(event) => patch("figma_url", event.target.value)} placeholder="Paste a Figma share URL"
      style={{ minHeight: 40, background: c.bg, borderColor: c.border, color: c.text, borderRadius: 10 }} />
  );
  return (
    <div className="eon-compare-pane" style={{ flex: `${1 - ratio} 1 0%`, background: c.nav, borderColor: c.border }}>
      {meta.valid ? (
        <>
          <div className="eon-compare-head" style={{ borderColor: c.border }}>
            <Figma size={15} color={c.brand} aria-hidden="true" />
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
          <ReferenceEmpty c={c} icon={Figma} title="No Figma frame linked" body="Paste a share URL to compare the source design here." />
          {linkInput}
        </div>
      )}
    </div>
  );
}

function ReferenceHeader({ c, label, hasValue, editing, setEditing }) {
  return (
    <div className="eon-reference-head">
      <div><strong>{label}</strong></div>
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

function CommentThread({ c, comments, profile, projectId, onCreateComment }) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef(null);

  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [comments.length]);

  const submit = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError("");
    setDraft("");
    try {
      await onCreateComment(projectId, body);
    } catch (err) {
      setDraft(body);
      setError(err.message || "Couldn't send your comment.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="eon-comments">
      <div ref={scrollRef} className="eon-comment-list" aria-live="polite">
        {comments.length === 0 ? (
          <div className="eon-comment-empty" style={{ color: c.muted }}>
            <span className="eon-comment-empty-icon" style={{ background: c.raised, color: c.brand }}><MessageSquare size={20} /></span>
            <strong style={{ color: c.text }}>Start the conversation</strong>
          </div>
        ) : comments.map((comment) => <CommentBubble key={comment.id} c={c} comment={comment} currentUserId={profile?.id} />)}
      </div>
      <div className="eon-comment-composer" style={{ borderColor: c.border }}>
        <Textarea value={draft} maxLength={4000} onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); submit(); } }}
          placeholder="Write a comment…" aria-label="Write a comment"
          style={{ minHeight: 76, maxHeight: 180, resize: "vertical", background: c.bg, borderColor: error ? "#FF6B8A" : c.border, color: c.text, borderRadius: 12, fontSize: 14, lineHeight: 1.5 }} />
        <div className="eon-composer-meta">
          <span style={{ color: "#FF6B8A" }}>{error}</span>
          <Button className="eon-buttonish" onClick={submit} disabled={!draft.trim() || sending}
            style={{ minWidth: 40, minHeight: 40, padding: 0, borderRadius: 10, background: c.primary, color: c.primaryText, opacity: !draft.trim() || sending ? 0.5 : 1 }} aria-label="Send comment">
            <Send size={15} />
          </Button>
        </div>
      </div>
    </div>
  );
}

function CommentBubble({ c, comment, currentUserId }) {
  const author = comment.author || {};
  const name = author.full_name || author.email?.split("@")[0] || "Teammate";
  const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  const mine = comment.author_id === currentUserId;
  return (
    <article className="eon-comment" style={{ opacity: comment.pending ? 0.6 : 1 }}>
      <div className="eon-comment-avatar" style={{ background: mine ? c.active : c.raised, color: mine ? c.brand : c.secondary }}>{initials || "T"}</div>
      <div className="eon-comment-body">
        <div className="eon-comment-meta"><strong>{mine ? "You" : name}</strong><time style={{ color: c.muted }} dateTime={comment.created_at}>{relativeTime(comment.created_at)}</time></div>
        <p style={{ color: c.secondary }}>{comment.body}</p>
      </div>
    </article>
  );
}

/* ---- New-prototype dialog: replaces the old window.prompt flow with proper
   setup steps — name, group, and optional prototype HTML (drop / browse /
   paste). Creation is delegated to onCreate({title, group, html}); errors
   surface inline. ---- */
function NewPrototypeDialog({ c, groups, onClose, onCreate }) {
  const [title, setTitle] = useState("");
  const [group, setGroup] = useState("General");
  const [html, setHtml] = useState("");
  const [fileName, setFileName] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  useEffect(() => {
    const onKey = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
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
    <div className="eon-modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="eon-modal" role="dialog" aria-modal="true" aria-label="New prototype" style={{ background: c.panel, borderColor: c.border }}>
        <div className="eon-modal-head" style={{ borderColor: c.border }}>
          <strong>New prototype</strong>
          <button className="eon-buttonish eon-icon-button" onClick={onClose} aria-label="Close dialog" style={{ color: c.muted }}><X size={16} /></button>
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
              <label style={{ fontSize: 13, color: c.brand, cursor: "pointer", textDecoration: "underline" }}>
                browse
                <input type="file" accept=".html,.htm,text/html" aria-label="Choose an HTML file"
                  onChange={(event) => readFile(event.target.files?.[0])} style={{ display: "none" }} />
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
          <button className="eon-buttonish eon-secondary-button" onClick={onClose} style={{ borderColor: c.border, background: "transparent", color: c.secondary }}>Cancel</button>
          <Button className="eon-buttonish" onClick={submit} disabled={!title.trim() || busy}
            style={{ minHeight: 40, padding: "0 16px", borderRadius: 10, background: c.primary, color: c.primaryText, fontSize: 13, fontWeight: 600, opacity: !title.trim() || busy ? 0.5 : 1 }}>
            {busy ? "Creating…" : "Create prototype"}
          </Button>
        </div>
      </div>
    </div>
  );
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
