import { useState, useMemo, useEffect, useRef, memo } from "react";
import { fetchLinearIssue } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Search, Monitor, Laptop, Tablet, Smartphone, Sun, Moon, Maximize2, ExternalLink,
  Figma, CircleDot, Circle, ChevronDown, Link2, FileText, Plus, Minus, Shield, LogOut, Upload, Trash2,
  Square, LayoutGrid, Copy, Check,
} from "lucide-react";
import { HUB, VIEWPORTS, STATUS_COLOR, CANVAS_PRESETS, MEDIA, renderStory, currentArgs, stateCombos, parsePrototypeConfig } from "./prototypes";

const VP_ICON = { desktop: Monitor, laptop: Laptop, tablet: Tablet, mobile: Smartphone };

// Paste-into-Claude spec for authoring a prototype that plugs into the hub's
// theme switch, state controls, and shared media. Copied by the sidebar button.
export const SETUP_PROMPT = `Build a single, self-contained HTML file — an interactive UI prototype for the Eon Prototype Hub. It renders inside a sandboxed iframe. Follow this contract so it plugs into the hub's theme switch, state controls, and shared media.

1) SELF-CONTAINED
- One .html file. Inline all CSS and JS. External CDN links (images, fonts, Tailwind CDN) are fine; never reference local files.

2) LIGHT / DARK THEMING (driven by the hub's Theme switch)
- The hub sets, on the root <html>: class "dark" or "light", data-theme="dark|light", data-color-mode, the CSS color-scheme, forces prefers-color-scheme for JS, and exposes window.__story = { theme, args }.
- Do NOT hardcode one theme. Support both via a class/attribute strategy, e.g.:
    :root { --bg:#ffffff; --fg:#111827; --card:#f8fafc; --border:#e5e7eb }
    html.dark, html[data-theme="dark"] { --bg:#0b1120; --fg:#f1f5f9; --card:#111827; --border:#1f2937 }
    body { background:var(--bg); color:var(--fg) }
  (Tailwind dark: variants also work.) If you add your own theme toggle, hide it when window.__story exists so the hub drives it.

3) MULTIPLE STATES (appear as pills in the canvas control bar and as tiles in grid view)
- Declare the states the hub should offer with an embedded config block:
    <script type="application/json" id="eon-config">
    { "controls": [
        { "key": "state", "label": "State", "options": ["default", "loading", "error", "empty"] },
        { "key": "plan",  "label": "Plan",  "options": ["free", "pro"] }
      ],
      "defaults": { "state": "default", "plan": "pro" } }
    </script>
- Render the current selection from window.__story.args (or the data-<key> attributes on <html>), e.g. read window.__story.args.state and show that state. The hub reloads the frame when a control changes, so reading it once on load is enough.

4) SHARED MEDIA (logos / images / placeholders)
- Reference shared assets by token so they map to the hub's Media library and update everywhere at once:
    {{eonLogo}}  {{acmeLogo}}  {{yourSavedImageName}}   -> the asset's URL
    {{placeholder:320x180}}  or  {{placeholder:320x180:Label}}  -> a generated placeholder image
- Use them as <img src="{{acmeLogo}}"> or in CSS background:url({{heroImage}}).

Output only the finished HTML file, nothing else.`;

export default function PrototypeHub({
  projects, assets = {}, isAdmin, userEmail,
  onPatchProject, onSetAsset, onNewProject, onDeleteProject, onReorder, onOpenAdmin, onSignOut,
}) {
  const [hubTheme, setHubTheme] = useState("dark");
  const [protoTheme, setProtoTheme] = useState("dark");
  const [view, setView] = useState("stories");
  const [activeId, setActiveId] = useState(projects[0]?.id);
  const [viewport, setViewport] = useState("laptop");
  const [layout, setLayout] = useState("single"); // single | grid
  const [gridBy, setGridBy] = useState("states"); // states | themes | screens
  const [query, setQuery] = useState("");
  const [canvasBg, setCanvasBg] = useState("#808080");
  const [liveArgs, setLiveArgs] = useState({}); // {projectId: {key:val}} ephemeral
  const [showUpload, setShowUpload] = useState(false);
  const [dragId, setDragId] = useState(null);
  const [dropTargetId, setDropTargetId] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [editFigma, setEditFigma] = useState(false);
  const [editLinear, setEditLinear] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [liveLinear, setLiveLinear] = useState(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const copySetupPrompt = async () => {
    try { await navigator.clipboard.writeText(SETUP_PROMPT); setCopiedPrompt(true); setTimeout(() => setCopiedPrompt(false), 1600); } catch (e) { /* clipboard blocked */ }
  };

  const commitRename = (id, value) => {
    const title = value.trim();
    const prev = projects.find((p) => p.id === id)?.title;
    if (title && title !== prev) onPatchProject(id, { title });
    setRenamingId(null);
  };

  // Resizable layout, persisted per browser.
  const [canvasH, setCanvasH] = useState(() => Number(localStorage.getItem("eon.canvasH")) || 560);
  const [linksSplit, setLinksSplit] = useState(() => Number(localStorage.getItem("eon.linksSplit")) || 0.62);
  const linksRowRef = useRef(null);
  const [resizeHover, setResizeHover] = useState(false);
  useEffect(() => { localStorage.setItem("eon.canvasH", String(canvasH)); }, [canvasH]);
  useEffect(() => { localStorage.setItem("eon.linksSplit", String(linksSplit)); }, [linksSplit]);

  // Generic mouse-drag helper: onMove(dx, dy) until mouseup.
  const startDrag = (e, onMove) => {
    e.preventDefault();
    const x0 = e.clientX, y0 = e.clientY;
    const move = (ev) => onMove(ev.clientX - x0, ev.clientY - y0, ev);
    const up = () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); document.body.style.userSelect = ""; };
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };
  const startCanvasResize = (e) => { const h0 = canvasH; startDrag(e, (_dx, dy) => setCanvasH(Math.min(1600, Math.max(320, h0 + dy)))); };
  const startLinksResize = (e) => {
    const row = linksRowRef.current; if (!row) return;
    const rect = row.getBoundingClientRect();
    startDrag(e, (_dx, _dy, ev) => setLinksSplit(Math.min(0.8, Math.max(0.3, (ev.clientX - rect.left) / rect.width))));
  };

  // Drop the dragged story in front of the target, adopting the target's group.
  const handleDrop = (targetId) => {
    setDropTargetId(null);
    if (!dragId || dragId === targetId || !onReorder) return;
    const ordered = projects.map((p) => p.id).filter((id) => id !== dragId);
    ordered.splice(ordered.indexOf(targetId), 0, dragId);
    const targetGroup = projects.find((p) => p.id === targetId)?.group_name;
    onReorder(ordered, targetGroup ? { [dragId]: targetGroup } : {});
    setDragId(null);
  };

  const c = HUB[hubTheme];
  const story = projects.find((s) => s.id === activeId) || projects[0];
  // A prototype can declare its own controls/defaults via an embedded
  // <script id="eon-config"> block; use them when the DB row has none, so
  // declared states drive the control bar + grid automatically.
  const cfg = useMemo(() => parsePrototypeConfig(story?.prototype_html), [story?.prototype_html]);
  const effStory = useMemo(() => {
    if (!story) return story;
    const controls = story.controls?.length ? story.controls : (cfg.controls || []);
    return { ...story, controls, defaults: { ...(cfg.defaults || {}), ...(story.defaults || {}) } };
  }, [story, cfg]);
  const args = effStory ? currentArgs(effStory, liveArgs[effStory.id]) : {};
  const vp = VIEWPORTS[viewport];
  const media = assets; // full asset map: {{eonLogo}}, {{acmeLogo}}, and any saved key

  const html = useMemo(
    () => (effStory ? renderStory(effStory, protoTheme, media, args) : ""),
    [effStory, args, protoTheme, assets]
  );
  const scale = useMemo(() => Math.min(760 / vp.w, 460 / vp.h, 1), [viewport]);

  const groups = useMemo(() => {
    const q = query.toLowerCase();
    const g = {};
    projects
      .filter((s) => s.title.toLowerCase().includes(q) || (s.group_name || "").toLowerCase().includes(q))
      .forEach((s) => { (g[s.group_name || "General"] ||= []).push(s); });
    return g;
  }, [projects, query]);

  // Fetch the linked Linear issue once, here, so both the navbar status badge and
  // the Linear card stay in sync (single source of truth).
  useEffect(() => {
    const url = story?.issue_url || "";
    const id = url.match(/\/issue\/([A-Za-z][A-Za-z0-9]*-\d+)/i)?.[1] || story?.issue_id || null;
    setLiveLinear(null);
    if (!id) return;
    let stale = false;
    fetchLinearIssue(id).then((issue) => { if (!stale) setLiveLinear(issue); });
    return () => { stale = true; };
  }, [story?.id, story?.issue_url, story?.issue_id]);

  if (!story) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: c.bg, color: c.muted }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 15, color: c.text, fontWeight: 500 }}>No prototypes yet</div>
          <Button onClick={onNewProject} style={{ marginTop: 12, background: c.primary, color: c.primaryText }}>+ New prototype</Button>
        </div>
      </div>
    );
  }

  const gridOptions = (effStory.controls || []).length ? ["states", "themes", "screens"] : ["themes", "screens"];
  const effGridBy = gridOptions.includes(gridBy) ? gridBy : gridOptions[0];

  const [sc0, sc1] = STATUS_COLOR[story.status] || STATUS_COLOR["Exploration"];
  // Linear identifier like "DES-418", parsed from the issue URL (falls back to issue_id).
  const linearId = story.issue_url?.match(/\/issue\/([A-Za-z][A-Za-z0-9]*-\d+)/i)?.[1] || story.issue_id || null;
  const isFigma = /figma\.com/i.test(story.figma_url || "") && !/REPLACE/i.test(story.figma_url || "");

  const setArg = (key, val) => setLiveArgs((p) => ({ ...p, [story.id]: { ...p[story.id], [key]: val } }));
  const patch = (field, val) => onPatchProject(story.id, { [field]: val });
  const openFull = () => window.open(URL.createObjectURL(new Blob([html], { type: "text/html" })), "_blank");

  const seg = (opts, val, onPick) => (
    <div style={{ display: "flex", gap: 3, background: c.raised, borderRadius: 100, padding: 3 }}>
      {opts.map((o) => {
        const on = val === o;
        return (
          <button key={o} onClick={() => onPick(o)}
            style={{ padding: "5px 12px", borderRadius: 100, fontSize: 12, cursor: "pointer", border: "none", textTransform: "capitalize",
              background: on ? c.primary : "transparent", color: on ? c.primaryText : c.secondary, fontWeight: on ? 500 : 400 }}>{o}</button>
        );
      })}
    </div>
  );

  return (
    <div className={hubTheme === "dark" ? "" : "light"}
      style={{ display: "flex", height: "100vh", background: c.bg, color: c.text, fontFamily: "'DM Sans',sans-serif" }}>
      {/* sidebar */}
      <aside style={{ width: 240, background: c.nav, borderRight: `1px solid ${c.border}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "16px 16px 12px", borderBottom: `1px solid ${c.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <span style={{ display: "inline-flex" }} dangerouslySetInnerHTML={{ __html: MEDIA.logos.eon(c.text, c.brand, media.eonLogo) }} />
            <span style={{ fontWeight: 500, fontSize: 16 }}>Eon Prototypes</span>
          </div>
          <div style={{ position: "relative" }}>
            <Search style={{ position: "absolute", left: 10, top: 10, width: 15, height: 15, color: c.muted }} />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search prototypes" aria-label="Search prototypes"
              style={{ paddingLeft: 30, height: 34, background: c.raised, borderColor: c.border, color: c.text, borderRadius: 8 }} />
          </div>
          <div style={{ display: "flex", gap: 3, marginTop: 12, background: c.raised, border: `1px solid ${c.border}`, borderRadius: 8, padding: 3 }}>
            {["stories", "media"].map((v) => {
              const on = view === v;
              return (
                <button key={v} onClick={() => setView(v)}
                  style={{ flex: 1, height: 28, borderRadius: 6, fontSize: 12, cursor: "pointer", border: "none",
                    background: on ? c.panel : "transparent", color: on ? c.text : c.muted, fontWeight: on ? 500 : 400 }}>
                  {v === "stories" ? "Prototypes" : "Media"}
                </button>
              );
            })}
          </div>
          <button onClick={copySetupPrompt} title="Copy a prompt that tells an AI exactly how to build a prototype for this hub (theming, states, media)"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", height: 30, marginTop: 8, borderRadius: 8, border: `1px solid ${c.border}`, background: c.raised, color: copiedPrompt ? c.brand : c.secondary, cursor: "pointer", fontSize: 12 }}>
            {copiedPrompt ? <Check style={{ width: 13, height: 13 }} /> : <Copy style={{ width: 13, height: 13 }} />}
            {copiedPrompt ? "Copied setup prompt" : "Copy setup prompt"}
          </button>
        </div>
        <div style={{ overflowY: "auto", padding: 8, flex: 1 }}>
          <button onClick={onNewProject}
            style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px dashed ${c.border}`,
              background: "transparent", color: c.muted, cursor: "pointer", fontSize: 13, marginBottom: 8 }}>
            <Plus style={{ width: 14, height: 14 }} /> New prototype
          </button>
          {Object.entries(groups).map(([group, items]) => (
            <div key={group} style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 8px", fontSize: 11, fontWeight: 500, letterSpacing: ".04em", textTransform: "uppercase", color: c.muted }}>
                <ChevronDown style={{ width: 12, height: 12 }} /> {group}
              </div>
              {items.map((s) => (
                <div key={s.id} draggable={isAdmin}
                  onDragStart={() => setDragId(s.id)}
                  onDragEnd={() => { setDragId(null); setDropTargetId(null); }}
                  onDragOver={(e) => { if (dragId) { e.preventDefault(); setDropTargetId(s.id); } }}
                  onDragLeave={() => setDropTargetId((t) => (t === s.id ? null : t))}
                  onDrop={() => handleDrop(s.id)}
                  style={{ display: "flex", alignItems: "center", borderRadius: 8, marginBottom: 1,
                    background: activeId === s.id ? c.active : "transparent",
                    borderTop: dropTargetId === s.id && dragId !== s.id ? `2px solid ${c.brand}` : "2px solid transparent",
                    opacity: dragId === s.id ? 0.4 : 1, cursor: isAdmin ? "grab" : "pointer" }}>
                  {renamingId === s.id ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0, padding: "8px 10px 8px 22px" }}>
                      <Circle style={{ width: 13, height: 13, flexShrink: 0, color: c.brand }} />
                      <input autoFocus defaultValue={s.title}
                        onBlur={(e) => commitRename(s.id, e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); else if (e.key === "Escape") setRenamingId(null); }}
                        aria-label={`Rename ${s.title}`}
                        style={{ flex: 1, minWidth: 0, background: c.bg, border: `1px solid ${c.brand}`, borderRadius: 6, color: c.text, fontSize: 14, padding: "2px 6px", outline: "none" }} />
                    </div>
                  ) : (
                    <button onClick={() => { setActiveId(s.id); setView("stories"); }} onDoubleClick={() => setRenamingId(s.id)} title="Double-click to rename"
                      style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0, textAlign: "left", padding: "8px 10px 8px 22px", borderRadius: 8, border: "none", cursor: "inherit",
                        fontSize: 14, color: activeId === s.id ? c.text : c.secondary, background: "transparent", fontWeight: activeId === s.id ? 500 : 400 }}>
                      <Circle style={{ width: 13, height: 13, flexShrink: 0, color: activeId === s.id ? c.brand : c.muted }} />
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.title}</span>
                    </button>
                  )}
                  {isAdmin && renamingId !== s.id && (
                    <button onClick={() => setRenamingId(s.id)} aria-label={`Rename ${s.title}`} title="Rename"
                      style={{ width: 24, height: 24, flexShrink: 0, borderRadius: 6, border: "none", background: "transparent", color: c.muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <FileText style={{ width: 12, height: 12 }} />
                    </button>
                  )}
                  {isAdmin && renamingId !== s.id && (
                    <button onClick={() => onDeleteProject?.(s.id)} aria-label={`Delete ${s.title}`} title="Delete"
                      style={{ width: 24, height: 24, marginRight: 4, flexShrink: 0, borderRadius: 6, border: "none", background: "transparent", color: c.muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Trash2 style={{ width: 12, height: 12 }} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
        <div style={{ borderTop: `1px solid ${c.border}`, padding: 10, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color: c.muted, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userEmail}</span>
          {isAdmin && (
            <button onClick={onOpenAdmin} title="Admin" aria-label="Admin dashboard" style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${c.border}`, background: "transparent", color: c.muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Shield style={{ width: 14, height: 14 }} />
            </button>
          )}
          <button onClick={onSignOut} title="Sign out" aria-label="Sign out" style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${c.border}`, background: "transparent", color: c.muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <LogOut style={{ width: 14, height: 14 }} />
          </button>
        </div>
      </aside>

      {/* main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "auto" }}>
        {view === "media" && <MediaManager c={c} assets={assets} onSetAsset={onSetAsset} />}
        {view === "stories" && (<>
          {/* toolbar */}
          <div className="eon-toolbar" style={{ minHeight: 56, borderBottom: `1px solid ${c.border}`, background: c.nav, display: "flex", alignItems: "center", gap: 12, padding: "0 16px", flexShrink: 0, position: "sticky", top: 0, zIndex: 5 }}>
            <span style={{ fontSize: 15, fontWeight: 500 }}>{story.title}</span>
            {liveLinear?.state
              ? <Badge title="Live from Linear" style={{ background: `${liveLinear.state.color}26`, color: liveLinear.state.color, border: "none", fontWeight: 500 }}>{liveLinear.state.name}</Badge>
              : <Badge style={{ background: sc0, color: sc1, border: "none", fontWeight: 500 }}>{story.status}</Badge>}
            <div style={{ flex: 1 }} />
            <div style={{ display: "flex", gap: 2, background: c.raised, borderRadius: 8, padding: 3, border: `1px solid ${c.border}` }}>
              {Object.keys(VIEWPORTS).map((k) => {
                const Icon = VP_ICON[k]; const on = viewport === k;
                return (
                  <button key={k} onClick={() => setViewport(k)} title={VIEWPORTS[k].label}
                    aria-label={`${VIEWPORTS[k].label} viewport`} aria-pressed={on}
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 34, height: 28, borderRadius: 6, border: "none", cursor: "pointer", background: on ? c.panel : "transparent", color: on ? c.brand : c.muted }}>
                    <Icon style={{ width: 15, height: 15 }} />
                  </button>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 2, background: c.raised, borderRadius: 8, padding: 3, border: `1px solid ${c.border}` }}>
              {[["single", Square, "Single view"], ["grid", LayoutGrid, "All states"]].map(([k, Icon, label]) => {
                const on = layout === k;
                return (
                  <button key={k} onClick={() => setLayout(k)} title={label} aria-label={label} aria-pressed={on}
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 34, height: 28, borderRadius: 6, border: "none", cursor: "pointer", background: on ? c.panel : "transparent", color: on ? c.brand : c.muted }}>
                    <Icon style={{ width: 15, height: 15 }} />
                  </button>
                );
              })}
            </div>
            <button onClick={() => setHubTheme(hubTheme === "dark" ? "light" : "dark")} title="Interface theme"
              aria-label={`Switch to ${hubTheme === "dark" ? "light" : "dark"} interface theme`}
              style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${c.border}`, background: c.panel, color: c.muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {hubTheme === "dark" ? <Sun style={{ width: 15, height: 15 }} /> : <Moon style={{ width: 15, height: 15 }} />}
            </button>
            <button onClick={() => setShowUpload((v) => !v)} aria-expanded={showUpload}
              style={{ display: "flex", alignItems: "center", gap: 6, height: 32, padding: "0 12px", borderRadius: 8, border: `1px solid ${showUpload ? c.brand : c.border}`, background: c.panel, color: showUpload ? c.brand : c.muted, cursor: "pointer", fontSize: 13 }}>
              <Upload style={{ width: 14, height: 14 }} /> Upload HTML
            </button>
            <Button onClick={openFull} style={{ height: 32, background: c.primary, color: c.primaryText, gap: 6, fontSize: 13, borderRadius: 8 }}>
              <Maximize2 style={{ width: 14, height: 14 }} /> Open full view
            </Button>
          </div>

          {showUpload && (
            <UploadPanel key={story.id} c={c} story={story}
              onSave={(html) => { patch("prototype_html", html); setShowUpload(false); }}
              onClear={() => { patch("prototype_html", null); setShowUpload(false); }}
              onCancel={() => setShowUpload(false)} />
          )}

          {/* canvas + notes side panel */}
          <div style={{ display: "flex", alignItems: "stretch", borderBottom: `1px solid ${c.border}` }}>
            <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
            <div style={{ height: canvasH, overflow: "auto", background: canvasBg, display: "flex", alignItems: layout === "single" ? "center" : "flex-start", justifyContent: "center", padding: "32px 24px 88px" }}>
            {layout === "single" ? (
              <div style={{ width: vp.w * scale * zoom, height: vp.h * scale * zoom, flexShrink: 0 }}>
                <iframe key={`${story.id}-${JSON.stringify(args)}-${protoTheme}`} title={story.title} srcDoc={html}
                  style={{ width: vp.w, height: vp.h, border: "none", borderRadius: 10, background: "#fff", colorScheme: protoTheme, transform: `scale(${scale * zoom})`, transformOrigin: "top left", boxShadow: "0 12px 48px rgba(0,0,0,.28)" }} />
              </div>
            ) : (
              <StateGrid c={c} story={effStory} media={media} theme={protoTheme} viewport={viewport} by={effGridBy} />
            )}
            </div>
            <div className="eon-ctlbar" style={{ position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)", display: "flex", alignItems: "center", background: c.panel, border: `1px solid ${c.border}`, borderRadius: 100, boxShadow: "0 8px 30px rgba(0,0,0,.35)", maxWidth: "94%", flexWrap: "wrap", justifyContent: "center" }}>
              {layout === "single" && (effStory.controls || []).map((ctrl, i) => (
                <div key={ctrl.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {i > 0 && <span style={{ width: 1, height: 20, background: c.border }} />}
                  <span className="eon-ctl-label" style={{ fontSize: 12, color: c.muted }}>{ctrl.label}</span>
                  {seg(ctrl.options, args[ctrl.key], (o) => setArg(ctrl.key, o))}
                </div>
              ))}
              {layout === "single" && (effStory.controls || []).length > 0 && <span style={{ width: 1, height: 20, background: c.border }} />}
              {layout === "grid" && (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="eon-ctl-label" style={{ fontSize: 12, color: c.muted }}>Lay out by</span>
                    {seg(gridOptions, effGridBy, setGridBy)}
                  </div>
                  <span style={{ width: 1, height: 20, background: c.border }} />
                </>
              )}
              {!(layout === "grid" && effGridBy === "themes") && (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="eon-ctl-label" style={{ fontSize: 12, color: c.muted }}>Theme</span>
                    {seg(["light", "dark"], protoTheme, setProtoTheme)}
                  </div>
                  <span style={{ width: 1, height: 20, background: c.border }} />
                </>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="eon-ctl-label" style={{ fontSize: 12, color: c.muted }}>Canvas</span>
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  {CANVAS_PRESETS.map((bg) => (
                    <button key={bg} onClick={() => setCanvasBg(bg)} title={bg} aria-label={`Canvas background ${bg}`} aria-pressed={canvasBg === bg}
                      style={{ width: 20, height: 20, borderRadius: 6, cursor: "pointer", background: bg, border: canvasBg === bg ? `2px solid ${c.brand}` : `1px solid ${c.border}` }} />
                  ))}
                  <label style={{ width: 20, height: 20, borderRadius: 6, cursor: "pointer", overflow: "hidden", border: `1px solid ${c.border}`, display: "block", position: "relative", background: "conic-gradient(red,yellow,lime,cyan,blue,magenta,red)" }}>
                    <input type="color" value={canvasBg} onChange={(e) => setCanvasBg(e.target.value)} aria-label="Custom canvas background color" style={{ opacity: 0, width: "100%", height: "100%", cursor: "pointer" }} />
                  </label>
                </div>
              </div>
            </div>
            {layout === "single" && (
              <div style={{ position: "absolute", right: 16, bottom: 26, display: "flex", alignItems: "center", gap: 2, background: c.panel, border: `1px solid ${c.border}`, borderRadius: 8, padding: 3, zIndex: 6, boxShadow: "0 4px 16px rgba(0,0,0,.3)" }}>
                <button onClick={() => setZoom((z) => Math.max(0.25, +(z - 0.1).toFixed(2)))} aria-label="Zoom out"
                  style={{ width: 26, height: 26, borderRadius: 6, border: "none", background: "transparent", color: c.muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Minus style={{ width: 14, height: 14 }} /></button>
                <button onClick={() => setZoom(1)} title="Reset zoom"
                  style={{ minWidth: 46, height: 26, borderRadius: 6, border: "none", background: "transparent", color: c.text, cursor: "pointer", fontSize: 12, fontVariantNumeric: "tabular-nums" }}>{Math.round(scale * zoom * 100)}%</button>
                <button onClick={() => setZoom((z) => Math.min(4, +(z + 0.1).toFixed(2)))} aria-label="Zoom in"
                  style={{ width: 26, height: 26, borderRadius: 6, border: "none", background: "transparent", color: c.muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Plus style={{ width: 14, height: 14 }} /></button>
              </div>
            )}
            <div onMouseDown={startCanvasResize} onMouseEnter={() => setResizeHover(true)} onMouseLeave={() => setResizeHover(false)}
              title="Drag to resize canvas" role="separator" aria-orientation="horizontal"
              style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 16, cursor: "ns-resize", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 6 }}>
              <div style={{ width: 46, height: 5, borderRadius: 3, background: resizeHover ? c.brand : "transparent", transition: "background .15s" }} />
            </div>
            </div>
            {/* notes side panel — matches the canvas height */}
            <div style={{ width: 320, flexShrink: 0, borderLeft: `1px solid ${c.border}`, background: c.nav, display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "16px 16px 12px", display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 500, borderBottom: `1px solid ${c.border}`, flexShrink: 0 }}><FileText style={{ width: 15, height: 15, color: c.muted }} /> Notes</div>
              <Textarea value={story.notes || ""} onChange={(e) => patch("notes", e.target.value)} placeholder="Notes, goals, open questions…"
                style={{ flex: 1, minHeight: 160, resize: "none", border: "none", background: "transparent", color: c.text, fontSize: 13, borderRadius: 0, padding: "12px 16px", outline: "none" }} />
              <div style={{ fontSize: 11, color: c.muted, padding: "0 16px 12px", flexShrink: 0 }}>Saved to Supabase and shared with your team.</div>
            </div>
          </div>

          {/* links */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: 20 }}>
            <div style={{ background: c.panel, border: `1px solid ${c.border}`, borderRadius: 16, padding: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, fontSize: 14, fontWeight: 500 }}><Link2 style={{ width: 15, height: 15, color: c.muted }} /> Links</div>
              <div ref={linksRowRef} style={{ display: "flex", alignItems: "stretch" }}>
                {/* figma */}
                <div style={{ flexBasis: `${linksSplit * 100}%`, minWidth: 200, display: "flex", flexDirection: "column" }}>
                  <div style={{ fontSize: 12, color: c.muted, display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <Figma style={{ width: 13, height: 13, color: c.brand }} /> Figma frame
                    {story.figma_url && !editFigma && <button onClick={() => setEditFigma(true)} style={{ marginLeft: "auto", fontSize: 11, color: c.muted, background: "transparent", border: "none", cursor: "pointer" }}>Edit link</button>}
                  </div>
                  {(!story.figma_url || editFigma) && (
                    <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                      <Input value={story.figma_url || ""} onChange={(e) => patch("figma_url", e.target.value)} placeholder="Paste a Figma URL"
                        style={{ height: 34, background: c.bg, borderColor: c.border, color: c.text, fontSize: 12, borderRadius: 8 }} />
                      {editFigma && <button onClick={() => setEditFigma(false)} style={{ height: 34, padding: "0 12px", flexShrink: 0, borderRadius: 8, border: `1px solid ${c.border}`, background: c.bg, color: c.text, cursor: "pointer", fontSize: 12 }}>Done</button>}
                    </div>
                  )}
                  {story.figma_url
                    ? <FigmaCard c={c} url={story.figma_url} />
                    : <div style={{ height: 360, borderRadius: 12, overflow: "hidden", border: `1px dashed ${c.border}`, background: c.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, textAlign: "center", padding: 20 }}><Figma style={{ width: 22, height: 22, color: c.muted }} /><div style={{ fontSize: 13, color: c.text }}>No Figma frame linked</div><div style={{ fontSize: 12, color: c.muted }}>Paste a share URL to embed a live preview.</div></div>}
                </div>
                {/* resizer */}
                <div onMouseDown={startLinksResize} title="Drag to resize" role="separator" aria-orientation="vertical"
                  style={{ width: 16, flexShrink: 0, alignSelf: "stretch", cursor: "col-resize", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: 3, height: 44, borderRadius: 3, background: c.border }} />
                </div>
                {/* linear */}
                <div style={{ flex: 1, minWidth: 200, display: "flex", flexDirection: "column" }}>
                  <div style={{ fontSize: 12, color: c.muted, display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <CircleDot style={{ width: 13, height: 13, color: "#5E6AD2" }} /> Linear issue
                    {story.issue_url && !editLinear && <button onClick={() => setEditLinear(true)} style={{ marginLeft: "auto", fontSize: 11, color: c.muted, background: "transparent", border: "none", cursor: "pointer" }}>Edit link</button>}
                  </div>
                  {(!story.issue_url || editLinear) && (
                    <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                      <Input value={story.issue_url || ""} onChange={(e) => patch("issue_url", e.target.value)} placeholder="https://linear.app/…/issue/DES-418/…" style={{ height: 34, background: c.bg, borderColor: c.border, color: c.text, fontSize: 12, borderRadius: 8 }} />
                      {editLinear && <button onClick={() => setEditLinear(false)} style={{ height: 34, padding: "0 12px", flexShrink: 0, borderRadius: 8, border: `1px solid ${c.border}`, background: c.bg, color: c.text, cursor: "pointer", fontSize: 12 }}>Done</button>}
                    </div>
                  )}
                  <LinearCard c={c} story={story} sc0={sc0} sc1={sc1} live={liveLinear} identifier={linearId} issueUrl={story.issue_url} />
                </div>
              </div>
            </div>
          </div>
        </>)}
      </div>
    </div>
  );
}

/* ---- All-states grid. `by` fans out over control states, light/dark themes,
   or every viewport — each combination rendered in its own labeled tile. ---- */
export function StateGrid({ c, story, media, theme, viewport, by }) {
  const base = currentArgs(story);
  let tiles;
  if (by === "themes") {
    tiles = ["light", "dark"].map((t) => ({ key: `t-${t}`, label: t, sub: null, theme: t, viewport, args: base }));
  } else if (by === "screens") {
    tiles = Object.keys(VIEWPORTS).map((v) => ({ key: `v-${v}`, label: VIEWPORTS[v].label, sub: `${VIEWPORTS[v].w}×${VIEWPORTS[v].h}`, theme, viewport: v, args: base }));
  } else {
    const combos = stateCombos(story);
    if (!combos) return <StatesNotice c={c} />;
    tiles = combos.map((combo) => ({ key: JSON.stringify(combo), label: Object.values(combo).join(" · ") || "Default", sub: theme, theme, viewport, args: { ...base, ...combo } }));
  }

  const TILE_W = 360;

  return (
    <div style={{ width: "100%", display: "flex", flexWrap: "wrap", gap: 20, alignContent: "flex-start" }}>
      {tiles.map((tile) => {
        const tvp = VIEWPORTS[tile.viewport];
        const s = Math.min(TILE_W / tvp.w, 1);
        return (
          <div key={tile.key} style={{ display: "flex", flexDirection: "column", gap: 8, width: TILE_W }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: c.text, background: c.panel, border: `1px solid ${c.border}`, borderRadius: 6, padding: "3px 8px", textTransform: "capitalize" }}>{tile.label}</span>
              {tile.sub && <span style={{ fontSize: 11, color: c.muted, textTransform: "capitalize" }}>{tile.sub}</span>}
            </div>
            <div style={{ width: TILE_W, height: tvp.h * s, borderRadius: 10, overflow: "hidden", border: `1px solid ${c.border}`, background: "#fff", boxShadow: "0 8px 30px rgba(0,0,0,.22)" }}>
              <iframe title={tile.label} srcDoc={renderStory(story, tile.theme, media, tile.args)}
                style={{ width: tvp.w, height: tvp.h, border: "none", background: "#fff", colorScheme: tile.theme, transform: `scale(${s})`, transformOrigin: "top left" }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---- Shown by the states grid when a prototype declares no states: the hub
   can only fan out what the HTML declares via its eon-config block. ---- */
function StatesNotice({ c }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(SETUP_PROMPT);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch { /* Clipboard may be blocked by the browser. */ }
  };
  return (
    <div style={{ maxWidth: 460, margin: "48px auto", padding: "28px 26px", borderRadius: 14, background: c.panel, border: `1px solid ${c.border}`, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center", color: c.muted }}>
      <LayoutGrid size={22} color={c.brand} aria-hidden="true" />
      <strong style={{ color: c.text, fontSize: 14, marginTop: 4 }}>This prototype doesn't declare states</strong>
      <span style={{ fontSize: 13, lineHeight: 1.55 }}>
        The hub lays out the states a prototype declares in its HTML — popups, errors, empty views.
        Copy the setup prompt and regenerate the prototype with states included, or lay out by themes or screens instead.
      </span>
      <button className="eon-buttonish eon-secondary-button" onClick={copy}
        style={{ marginTop: 10, borderColor: c.border, background: c.raised, color: copied ? c.brand : c.secondary }}>
        {copied ? <Check size={14} /> : <Copy size={14} />}
        {copied ? "Copied setup prompt" : "Copy setup prompt"}
      </button>
    </div>
  );
}

/* ---- Figma embed, memoized on the URL so it doesn't reload on every parent
   re-render (typing notes, toggling theme, realtime updates). ---- */
export const FigmaEmbed = memo(function FigmaEmbed({ url }) {
  const src = `https://www.figma.com/embed?embed_host=eon-hub&url=${encodeURIComponent(url)}`;
  // Overflow-hidden wrapper + a taller iframe pushes Figma's bottom info bar
  // (file name / "edited …" / lock) out of view.
  return (
    <div style={{ width: "100%", height: "100%", overflow: "hidden" }}>
      <iframe title="Figma preview" src={src} allowFullScreen style={{ width: "100%", height: "calc(100% + 44px)", border: "none", display: "block" }} />
    </div>
  );
});

// Parse file name + node from a Figma URL, e.g. .../design/KEY/Orion---Core-App?node-id=14010-9626
export function figmaMeta(url = "") {
  const valid = /figma\.com/i.test(url) && !/REPLACE/i.test(url);
  let title = "Figma file", node = null;
  const m = url.match(/figma\.com\/(?:file|design|proto|board)\/[^/]+\/([^/?#]+)/i);
  if (m) title = decodeURIComponent(m[1]).replace(/-+/g, " ").trim() || title;
  const n = url.match(/node-id=([^&]+)/i);
  if (n) node = decodeURIComponent(n[1]);
  return { valid, title, node };
}

const FIGMA_MARK = `<svg width="15" height="15" viewBox="0 0 38 57" xmlns="http://www.w3.org/2000/svg"><path d="M19 28.5a9.5 9.5 0 1 1 19 0 9.5 9.5 0 0 1-19 0z" fill="#1ABCFE"/><path d="M0 47.5A9.5 9.5 0 0 1 9.5 38H19v9.5a9.5 9.5 0 1 1-19 0z" fill="#0ACF83"/><path d="M19 0v19h9.5a9.5 9.5 0 1 0 0-19H19z" fill="#FF7262"/><path d="M0 9.5A9.5 9.5 0 0 0 9.5 19H19V0H9.5A9.5 9.5 0 0 0 0 9.5z" fill="#F24E1E"/><path d="M0 28.5A9.5 9.5 0 0 0 9.5 38H19V19H9.5A9.5 9.5 0 0 0 0 28.5z" fill="#A259FF"/></svg>`;

/* ---- Figma unfurl card: icon + file name + Open in Figma, over a live preview.
   Mirrors how Linear renders an embedded link. ---- */
export function FigmaCard({ c, url }) {
  const meta = figmaMeta(url);
  return (
    <div style={{ height: 360, borderRadius: 12, overflow: "hidden", border: `1px solid ${c.border}`, background: c.bg, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderBottom: `1px solid ${c.border}`, flexShrink: 0 }}>
        <span style={{ display: "inline-flex", flexShrink: 0 }} dangerouslySetInnerHTML={{ __html: FIGMA_MARK }} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: c.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{meta.title}</div>
          {meta.node && <div style={{ fontSize: 11, color: c.muted }}>Node {meta.node}</div>}
        </div>
        <a href={url} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0, fontSize: 12, color: c.text, background: c.raised, border: `1px solid ${c.border}`, borderRadius: 8, padding: "5px 10px", textDecoration: "none" }}>
          <ExternalLink style={{ width: 13, height: 13 }} /> Open in Figma
        </a>
      </div>
      <div style={{ flex: 1, minHeight: 0, background: "#1e1e1e" }}>
        {meta.valid
          ? <FigmaEmbed url={url} />
          : <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: c.muted, fontSize: 12, padding: 16, textAlign: "center" }}>That link isn't an embeddable Figma URL — “Open in Figma” still works.</div>}
      </div>
    </div>
  );
}

/* ---- Linear issue card: live via edge function, static preview fallback.
   The whole card links to the issue. ---- */
export function LinearCard({ c, story, sc0, sc1, live, identifier, issueUrl }) {
  const stateColor = live?.state?.color;
  const clickable = Boolean(issueUrl);
  return (
    <a href={issueUrl || undefined} target={clickable ? "_blank" : undefined} rel="noreferrer"
      style={{ height: 360, borderRadius: 12, border: `1px solid ${c.border}`, background: c.bg, padding: 16, display: "flex", flexDirection: "column", textDecoration: "none", color: c.text, cursor: clickable ? "pointer" : "default", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: c.muted, background: c.raised, padding: "3px 8px", borderRadius: 6 }}>{live?.identifier || identifier || "ISSUE"}</span>
        {live?.state
          ? <Badge style={{ background: stateColor ? `${stateColor}26` : c.raised, color: stateColor || c.text, border: "none", fontWeight: 500, fontSize: 11 }}>{live.state.name}</Badge>
          : <Badge style={{ background: sc0, color: sc1, border: "none", fontWeight: 500, fontSize: 11 }}>{story.status}</Badge>}
        {live?.priorityLabel && live.priorityLabel !== "No priority" && (
          <span style={{ fontSize: 11, color: c.muted }}>{live.priorityLabel}</span>
        )}
        {clickable && <ExternalLink style={{ width: 13, height: 13, color: c.muted, marginLeft: "auto" }} />}
      </div>
      <div style={{ fontSize: 15, fontWeight: 500, marginTop: 12, flexShrink: 0 }}>
        {live ? live.title : `${story.title} — design + build`}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6, flexShrink: 0, flexWrap: "wrap" }}>
        {live?.assignee && <span style={{ fontSize: 12, color: c.muted }}>Assigned to {live.assignee.displayName || live.assignee.name}</span>}
        {(live?.labels || []).map((l) => (
          <span key={l.name} style={{ fontSize: 11, color: l.color || c.muted, background: `${l.color || "#888"}22`, borderRadius: 100, padding: "2px 8px" }}>{l.name}</span>
        ))}
      </div>
      {live?.description
        ? <div style={{ fontSize: 13, color: c.secondary, marginTop: 10, lineHeight: 1.55, flex: 1, overflow: "auto", whiteSpace: "pre-wrap" }}>{live.description}</div>
        : <div style={{ fontSize: 13, color: c.muted, marginTop: 10, flex: 1 }}>{live ? "No description in Linear." : ""}</div>}
      <div style={{ fontSize: 11, color: c.muted, paddingTop: 12, marginTop: 8, borderTop: `1px solid ${c.border}`, flexShrink: 0 }}>
        {live
          ? `Live from Linear — updated ${new Date(live.updatedAt).toLocaleDateString()}`
          : identifier
            ? "Loading from Linear…"
            : "Paste a Linear issue URL to link it."}
      </div>
    </a>
  );
}

/* ---- Upload prototype HTML (persists via projects.prototype_html) ---- */
export function UploadPanel({ c, story, onSave, onClear, onCancel }) {
  const [html, setHtml] = useState(story.prototype_html || "");
  const [dragOver, setDragOver] = useState(false);
  const [err, setErr] = useState("");

  const readFile = (file) => {
    if (!file) return;
    if (!/\.html?$/i.test(file.name) && file.type !== "text/html") {
      setErr("Drop a .html file — other formats aren't supported.");
      return;
    }
    setErr("");
    const reader = new FileReader();
    reader.onload = () => setHtml(String(reader.result));
    reader.readAsText(file);
  };

  return (
    <div style={{ borderBottom: `1px solid ${c.border}`, background: c.nav, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 500 }}>
        <Upload style={{ width: 14, height: 14, color: c.muted }} /> Upload prototype HTML for “{story.title}”
        <span style={{ fontSize: 12, fontWeight: 400, color: c.muted }}>
          {story.prototype_html ? "This story renders uploaded HTML." : "This story renders a built-in builder or placeholder until HTML is uploaded."}
        </span>
      </div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); readFile(e.dataTransfer.files?.[0]); }}
        style={{ border: `1.5px dashed ${dragOver ? c.brand : c.border}`, borderRadius: 10, padding: "14px 16px", display: "flex", alignItems: "center", gap: 10, background: dragOver ? c.active : "transparent" }}>
        <span style={{ fontSize: 13, color: c.secondary, flex: 1 }}>Drag & drop a .html file here, or</span>
        <label style={{ fontSize: 13, color: c.brand, cursor: "pointer", textDecoration: "underline" }}>
          browse
          <input type="file" accept=".html,.htm,text/html" aria-label="Choose an HTML file"
            onChange={(e) => readFile(e.target.files?.[0])} style={{ display: "none" }} />
        </label>
      </div>
      <Textarea value={html} onChange={(e) => setHtml(e.target.value)} spellCheck={false}
        placeholder="…or paste a self-contained HTML document here"
        aria-label="Prototype HTML source"
        style={{ minHeight: 160, background: c.bg, borderColor: c.border, color: c.text, fontSize: 12, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", resize: "vertical", borderRadius: 8 }} />
      <p style={{ fontSize: 11, color: c.muted, lineHeight: 1.5 }}>
        Theme tip: the hub sets <code style={{ color: c.text }}>class="dark"/"light"</code> and{" "}
        <code style={{ color: c.text }}>data-theme</code> on <code style={{ color: c.text }}>&lt;html&gt;</code>, exposes{" "}
        <code style={{ color: c.text }}>window.__story</code>, and forces <code style={{ color: c.text }}>prefers-color-scheme</code> for JS.
        Style against those (or Tailwind <code style={{ color: c.text }}>dark:</code>) so the Theme toggle drives your prototype — hardcoded colors won't switch.
      </p>
      <p style={{ fontSize: 11, color: c.muted, lineHeight: 1.5 }}>
        Media tip: use <code style={{ color: c.text }}>{'{{eonLogo}}'}</code>, <code style={{ color: c.text }}>{'{{acmeLogo}}'}</code>, any saved media key, or{" "}
        <code style={{ color: c.text }}>{'{{placeholder:320x180}}'}</code> as an image <code style={{ color: c.text }}>src</code> — they map to the Media library and update everywhere at once.
      </p>
      {err && <div role="alert" style={{ fontSize: 12, color: "#FF508F" }}>{err}</div>}
      <div style={{ display: "flex", gap: 8 }}>
        <Button onClick={() => html.trim() && onSave(html)} disabled={!html.trim()}
          style={{ height: 32, background: c.primary, color: c.primaryText, fontSize: 13, borderRadius: 8, opacity: html.trim() ? 1 : 0.5 }}>
          Save to story
        </Button>
        {story.prototype_html && (
          <button onClick={onClear}
            style={{ display: "flex", alignItems: "center", gap: 6, height: 32, padding: "0 12px", borderRadius: 8, border: `1px solid ${c.border}`, background: "transparent", color: c.muted, cursor: "pointer", fontSize: 13 }}>
            <Trash2 style={{ width: 13, height: 13 }} /> Remove uploaded HTML
          </button>
        )}
        <button onClick={onCancel}
          style={{ height: 32, padding: "0 12px", borderRadius: 8, border: `1px solid ${c.border}`, background: "transparent", color: c.muted, cursor: "pointer", fontSize: 13 }}>
          Cancel
        </button>
        <span style={{ fontSize: 12, color: c.muted, alignSelf: "center", marginLeft: "auto" }}>
          Saved to Supabase and shared with your team.
        </span>
      </div>
    </div>
  );
}

/* ---- Media manager. Assets persist via onSetAsset(key,url) and map into every
   prototype through {{key}} tokens (logos, placeholders). ---- */
export function MediaManager({ c, assets, onSetAsset }) {
  const [ph, setPh] = useState({ w: 320, h: 180, label: "", bg: "#E5E7EB", fg: "#94A3B8", name: "" });
  const [img, setImg] = useState({ name: "", url: "" });
  const [copied, setCopied] = useState("");
  const field = { height: 34, background: c.bg, borderColor: c.border, color: c.text, fontSize: 12, borderRadius: 8 };
  const panel = { background: c.panel, border: `1px solid ${c.border}`, borderRadius: 16, padding: 18 };
  const previewBox = { height: 96, borderRadius: 10, border: `1px solid ${c.border}`, background: c.bg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 };
  const btn = { height: 34, padding: "0 12px", flexShrink: 0, borderRadius: 8, border: `1px solid ${c.border}`, background: c.bg, color: c.muted, cursor: "pointer", fontSize: 12 };
  const copy = async (text, id) => { try { await navigator.clipboard.writeText(text); setCopied(id); setTimeout(() => setCopied(""), 1200); } catch (e) { /* clipboard blocked */ } };
  const Token = ({ name }) => (
    <button onClick={() => copy(`{{${name}}}`, `tok-${name}`)} title="Copy token"
      style={{ fontSize: 11, fontFamily: "ui-monospace, Menlo, monospace", color: c.text, background: c.raised, border: `1px solid ${c.border}`, padding: "2px 7px", borderRadius: 6, cursor: "pointer" }}>
      {copied === `tok-${name}` ? "copied" : `{{${name}}}`}
    </button>
  );

  const LogoRow = ({ label, keyName, current }) => (
    <div style={panel}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{label}</div>
        <Token name={keyName} />
      </div>
      <div style={previewBox}>
        {assets[keyName]
          ? <img src={assets[keyName]} alt={label} style={{ maxHeight: 56, maxWidth: "80%", objectFit: "contain", borderRadius: 8 }} />
          : <span dangerouslySetInnerHTML={{ __html: current }} />}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <Input defaultValue={assets[keyName] || ""} placeholder="Paste image URL to replace"
          onBlur={(e) => onSetAsset(keyName, e.target.value)} style={field} />
        <button onClick={() => copy(assets[keyName] || "", `link-${keyName}`)} disabled={!assets[keyName]} style={{ ...btn, opacity: assets[keyName] ? 1 : 0.5 }}>{copied === `link-${keyName}` ? "Copied" : "Copy link"}</button>
        <button onClick={() => onSetAsset(keyName, "")} style={btn}>Reset</button>
      </div>
    </div>
  );

  const cleanKey = (s) => s.trim().replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/(^-|-$)/g, "");
  const phData = MEDIA.placeholder(ph.w, ph.h, ph.label, ph.bg, ph.fg);
  const savePlaceholder = () => {
    const key = cleanKey(ph.name);
    if (!key) return;
    onSetAsset(key, phData);
    setPh({ ...ph, name: "" });
  };
  const addImage = () => {
    const key = cleanKey(img.name);
    if (!key || !img.url.trim()) return;
    onSetAsset(key, img.url.trim());
    setImg({ name: "", url: "" });
  };
  const customKeys = Object.keys(assets).filter((k) => !["eonLogo", "acmeLogo"].includes(k) && assets[k]);

  return (
    <div style={{ flex: 1 }}>
      <div style={{ height: 56, borderBottom: `1px solid ${c.border}`, background: c.nav, display: "flex", alignItems: "center", gap: 10, padding: "0 20px", position: "sticky", top: 0, zIndex: 5 }}>
        <span style={{ fontSize: 15, fontWeight: 500 }}>Media library</span>
        <span style={{ fontSize: 12, color: c.muted }}>Shared logos & images (paste a CDN URL) — reference them in any prototype as {"{{name}}"} and they map everywhere</span>
      </div>
      <div style={{ padding: 20 }}>
        <Tabs defaultValue="logos">
          <TabsList style={{ background: c.raised, borderRadius: 100, marginBottom: 18 }}>
            <TabsTrigger value="logos">Logos</TabsTrigger>
            <TabsTrigger value="placeholders">Images</TabsTrigger>
          </TabsList>
          <TabsContent value="logos" style={{ margin: 0 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <LogoRow label="Eon logo (hub)" keyName="eonLogo" current={MEDIA.logos.eon(c.text, c.brand)} />
              <LogoRow label="Acme logo (stories)" keyName="acmeLogo" current={MEDIA.logos.acme(40, 10, "#4F46E5")} />
            </div>
            <p style={{ fontSize: 12, color: c.muted, marginTop: 12 }}>
              Reference a logo in any uploaded prototype as <code style={{ color: c.text }}>{'<img src="{{acmeLogo}}">'}</code>. Replace it here and every prototype updates.
            </p>
          </TabsContent>
          <TabsContent value="placeholders" style={{ margin: 0 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 16 }}>
              <div style={panel}>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Add an image</div>
                <p style={{ fontSize: 12, color: c.muted, marginBottom: 12, lineHeight: 1.5 }}>
                  Paste an image/CDN URL and name it. Use it in any prototype as <code style={{ color: c.text }}>{'{{name}}'}</code> — replace it here and every prototype that uses it updates.
                </p>
                <Input value={img.name} onChange={(e) => setImg({ ...img, name: e.target.value })} placeholder="Name (e.g. heroImage)" style={{ ...field, marginBottom: 8 }} />
                <Input value={img.url} onChange={(e) => setImg({ ...img, url: e.target.value })} placeholder="https://cdn.example.com/image.png" style={{ ...field, marginBottom: 10 }} />
                <button onClick={addImage} disabled={!img.name.trim() || !img.url.trim()} style={{ ...btn, width: "100%", background: c.primary, color: c.primaryText, border: "none", opacity: img.name.trim() && img.url.trim() ? 1 : 0.5 }}>Add to media</button>
                {img.name.trim() && <p style={{ fontSize: 11, color: c.muted, marginTop: 8 }}>Will be available as <code style={{ color: c.text }}>{`{{${cleanKey(img.name)}}}`}</code></p>}
              </div>
              <div style={panel}>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Preview</div>
                <div style={{ height: 200, border: `1px solid ${c.border}`, borderRadius: 10, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", background: c.bg, padding: 12 }}>
                  {img.url
                    ? <img src={img.url} alt="preview" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} onError={(e) => { e.currentTarget.style.display = "none"; }} onLoad={(e) => { e.currentTarget.style.display = "block"; }} />
                    : <span style={{ fontSize: 12, color: c.muted }}>Paste an image URL to preview</span>}
                </div>
              </div>
            </div>

            <details style={{ ...panel, marginTop: 16 }}>
              <summary style={{ fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Generate a blank placeholder (optional)</summary>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 16, marginTop: 14 }}>
                <div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    <Input type="number" value={ph.w} onChange={(e) => setPh({ ...ph, w: +e.target.value || 0 })} style={field} />
                    <Input type="number" value={ph.h} onChange={(e) => setPh({ ...ph, h: +e.target.value || 0 })} style={field} />
                  </div>
                  <Input value={ph.label} onChange={(e) => setPh({ ...ph, label: e.target.value })} placeholder={`Label (default ${ph.w}×${ph.h})`} style={{ ...field, marginBottom: 8 }} />
                  <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                    <input type="color" value={ph.bg} onChange={(e) => setPh({ ...ph, bg: e.target.value })} style={{ flex: 1, height: 34, borderRadius: 8, border: `1px solid ${c.border}`, background: c.bg }} />
                    <input type="color" value={ph.fg} onChange={(e) => setPh({ ...ph, fg: e.target.value })} style={{ flex: 1, height: 34, borderRadius: 8, border: `1px solid ${c.border}`, background: c.bg }} />
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Input value={ph.name} onChange={(e) => setPh({ ...ph, name: e.target.value })} placeholder="Save as (e.g. blankHero)" style={field} />
                    <button onClick={savePlaceholder} disabled={!ph.name.trim()} style={{ ...btn, opacity: ph.name.trim() ? 1 : 0.5 }}>Save</button>
                  </div>
                  <p style={{ fontSize: 11, color: c.muted, marginTop: 8 }}>Or drop <code style={{ color: c.text }}>{'{{placeholder:320x180}}'}</code> straight into a prototype.</p>
                </div>
                <div style={{ border: `1px solid ${c.border}`, borderRadius: 10, overflow: "hidden", display: "flex", justifyContent: "center", background: c.bg, padding: 12 }}>
                  <img src={phData} alt="placeholder" style={{ maxWidth: "100%", maxHeight: 180, objectFit: "contain" }} />
                </div>
              </div>
            </details>

            {customKeys.length > 0 && (
              <div style={{ ...panel, marginTop: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Saved media</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
                  {customKeys.map((k) => (
                    <div key={k} style={{ border: `1px solid ${c.border}`, borderRadius: 10, padding: 10, background: c.bg }}>
                      <div style={{ height: 64, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
                        <img src={assets[k]} alt={k} style={{ maxHeight: 60, maxWidth: "100%", objectFit: "contain" }} />
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Token name={k} />
                        <button onClick={() => copy(assets[k], `link-${k}`)} style={{ ...btn, height: 26, padding: "0 8px" }}>{copied === `link-${k}` ? "Copied" : "Link"}</button>
                        <button onClick={() => onSetAsset(k, "")} title="Remove" style={{ ...btn, height: 26, width: 26, padding: 0, marginLeft: "auto" }}>×</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
