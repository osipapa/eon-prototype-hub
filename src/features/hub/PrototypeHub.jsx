import { useState, useMemo, useEffect, useRef, memo } from "react";
import { fetchLinearIssue } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Search, Monitor, Laptop, Tablet, Smartphone, Sun, Moon, Maximize2, ExternalLink,
  Figma, CircleDot, ChevronDown, Link2, FileText, Plus, Shield, LogOut, Upload, Trash2,
  Square, LayoutGrid,
} from "lucide-react";
import { HUB, VIEWPORTS, STATUS_COLOR, CANVAS_PRESETS, MEDIA, renderStory, currentArgs, stateCombos } from "./prototypes";

const VP_ICON = { desktop: Monitor, laptop: Laptop, tablet: Tablet, mobile: Smartphone };

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
  const args = story ? currentArgs(story, liveArgs[story.id]) : {};
  const vp = VIEWPORTS[viewport];
  const media = { eonLogo: assets.eonLogo, acmeLogo: assets.acmeLogo };

  const html = useMemo(
    () => (story ? renderStory(story, protoTheme, media, args) : ""),
    [story, args, protoTheme, media.eonLogo, media.acmeLogo]
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

  const gridOptions = (story.controls || []).length ? ["states", "themes", "screens"] : ["themes", "screens"];
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
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search stories" aria-label="Search stories"
              style={{ paddingLeft: 30, height: 34, background: c.raised, borderColor: c.border, color: c.text, borderRadius: 8 }} />
          </div>
          <div style={{ display: "flex", gap: 3, marginTop: 12, background: c.raised, border: `1px solid ${c.border}`, borderRadius: 8, padding: 3 }}>
            {["stories", "media"].map((v) => {
              const on = view === v;
              return (
                <button key={v} onClick={() => setView(v)}
                  style={{ flex: 1, height: 28, borderRadius: 6, fontSize: 12, cursor: "pointer", border: "none",
                    background: on ? c.panel : "transparent", color: on ? c.text : c.muted, fontWeight: on ? 500 : 400 }}>
                  {v === "stories" ? "Stories" : "Media"}
                </button>
              );
            })}
          </div>
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
                  <button onClick={() => { setActiveId(s.id); setView("stories"); }}
                    style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0, textAlign: "left", padding: "8px 10px 8px 22px", borderRadius: 8, border: "none", cursor: "inherit",
                      fontSize: 14, color: activeId === s.id ? c.text : c.secondary, background: "transparent", fontWeight: activeId === s.id ? 500 : 400 }}>
                    <CircleDot style={{ width: 13, height: 13, flexShrink: 0, color: activeId === s.id ? c.brand : c.muted }} />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.title}</span>
                  </button>
                  {isAdmin && (
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
          <div style={{ height: 56, borderBottom: `1px solid ${c.border}`, background: c.nav, display: "flex", alignItems: "center", gap: 12, padding: "0 16px", flexShrink: 0, position: "sticky", top: 0, zIndex: 5 }}>
            <span style={{ fontSize: 15, fontWeight: 500 }}>{story.title}</span>
            <Badge style={{ background: sc0, color: sc1, border: "none", fontWeight: 500 }}>{story.status}</Badge>
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

          {/* canvas (single) or all-states grid + shared floating controls */}
          <div style={{ position: "relative" }}>
            <div style={{ height: canvasH, overflow: "auto", background: canvasBg, display: "flex", alignItems: layout === "single" ? "center" : "flex-start", justifyContent: "center", padding: "32px 24px 88px" }}>
            {layout === "single" ? (
              <div style={{ width: vp.w * scale, height: vp.h * scale, flexShrink: 0 }}>
                <iframe key={`${story.id}-${JSON.stringify(args)}-${protoTheme}`} title={story.title} srcDoc={html}
                  style={{ width: vp.w, height: vp.h, border: "none", borderRadius: 10, background: "#fff", colorScheme: protoTheme, transform: `scale(${scale})`, transformOrigin: "top left", boxShadow: "0 12px 48px rgba(0,0,0,.28)" }} />
              </div>
            ) : (
              <StateGrid c={c} story={story} media={media} theme={protoTheme} viewport={viewport} by={effGridBy} />
            )}
            </div>
            <div style={{ position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: 14, background: c.panel, border: `1px solid ${c.border}`, borderRadius: 100, padding: "8px 14px", boxShadow: "0 8px 30px rgba(0,0,0,.35)", maxWidth: "92%", flexWrap: "wrap", justifyContent: "center" }}>
              {layout === "single" && (story.controls || []).map((ctrl, i) => (
                <div key={ctrl.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {i > 0 && <span style={{ width: 1, height: 20, background: c.border }} />}
                  <span style={{ fontSize: 12, color: c.muted }}>{ctrl.label}</span>
                  {seg(ctrl.options, args[ctrl.key], (o) => setArg(ctrl.key, o))}
                </div>
              ))}
              {layout === "single" && (story.controls || []).length > 0 && <span style={{ width: 1, height: 20, background: c.border }} />}
              {layout === "grid" && (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 12, color: c.muted }}>Lay out by</span>
                    {seg(gridOptions, effGridBy, setGridBy)}
                  </div>
                  <span style={{ width: 1, height: 20, background: c.border }} />
                </>
              )}
              {!(layout === "grid" && effGridBy === "themes") && (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 12, color: c.muted }}>Theme</span>
                    {seg(["light", "dark"], protoTheme, setProtoTheme)}
                  </div>
                  <span style={{ width: 1, height: 20, background: c.border }} />
                </>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, color: c.muted }}>Canvas</span>
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
            <div onMouseDown={startCanvasResize} onMouseEnter={() => setResizeHover(true)} onMouseLeave={() => setResizeHover(false)}
              title="Drag to resize canvas" role="separator" aria-orientation="horizontal"
              style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 16, cursor: "ns-resize", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 6 }}>
              <div style={{ width: 46, height: 5, borderRadius: 3, background: resizeHover ? c.brand : "transparent", transition: "background .15s" }} />
            </div>
          </div>

          {/* links + docs */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: 20 }}>
            <div style={{ background: c.panel, border: `1px solid ${c.border}`, borderRadius: 16, padding: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, fontSize: 14, fontWeight: 500 }}><Link2 style={{ width: 15, height: 15, color: c.muted }} /> Links</div>
              <div ref={linksRowRef} style={{ display: "flex", alignItems: "stretch" }}>
                {/* figma */}
                <div style={{ flexBasis: `${linksSplit * 100}%`, minWidth: 200, display: "flex", flexDirection: "column" }}>
                  <div style={{ fontSize: 12, color: c.muted, display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}><Figma style={{ width: 13, height: 13, color: c.brand }} /> Figma frame</div>
                  <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                    <Input value={story.figma_url || ""} onChange={(e) => patch("figma_url", e.target.value)} placeholder="Paste a Figma URL"
                      style={{ height: 34, background: c.bg, borderColor: c.border, color: c.text, fontSize: 12, borderRadius: 8 }} />
                    <button onClick={() => story.figma_url && window.open(story.figma_url, "_blank")} aria-label="Open Figma link in a new tab" style={{ width: 34, height: 34, flexShrink: 0, borderRadius: 8, border: `1px solid ${c.border}`, background: c.bg, color: c.muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><ExternalLink style={{ width: 14, height: 14 }} /></button>
                  </div>
                  <div style={{ height: 360, borderRadius: 12, overflow: "hidden", border: `1px solid ${c.border}`, background: c.bg }}>
                    {isFigma
                      ? <FigmaEmbed url={story.figma_url} />
                      : story.figma_url
                        ? <a href={story.figma_url} target="_blank" rel="noreferrer" style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, textAlign: "center", padding: 20, color: c.text, textDecoration: "none" }}><Figma style={{ width: 22, height: 22, color: c.brand }} /><div style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 4 }}>Open in Figma <ExternalLink style={{ width: 12, height: 12 }} /></div><div style={{ fontSize: 12, color: c.muted, wordBreak: "break-all" }}>{story.figma_url}</div></a>
                        : <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, textAlign: "center", padding: 20 }}><Figma style={{ width: 22, height: 22, color: c.muted }} /><div style={{ fontSize: 13, color: c.text }}>No Figma frame linked</div><div style={{ fontSize: 12, color: c.muted }}>Paste a share URL to embed a live preview.</div></div>}
                  </div>
                </div>
                {/* resizer */}
                <div onMouseDown={startLinksResize} title="Drag to resize" role="separator" aria-orientation="vertical"
                  style={{ width: 16, flexShrink: 0, alignSelf: "stretch", cursor: "col-resize", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: 3, height: 44, borderRadius: 3, background: c.border }} />
                </div>
                {/* linear */}
                <div style={{ flex: 1, minWidth: 200, display: "flex", flexDirection: "column" }}>
                  <div style={{ fontSize: 12, color: c.muted, display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}><CircleDot style={{ width: 13, height: 13, color: "#5E6AD2" }} /> Linear issue</div>
                  <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                    <Input value={story.issue_url || ""} onChange={(e) => patch("issue_url", e.target.value)} placeholder="https://linear.app/…/issue/DES-418/…" style={{ height: 34, background: c.bg, borderColor: c.border, color: c.text, fontSize: 12, borderRadius: 8 }} />
                    <button onClick={() => story.issue_url && window.open(story.issue_url, "_blank")} aria-label="Open Linear issue in a new tab" style={{ width: 34, height: 34, flexShrink: 0, borderRadius: 8, border: `1px solid ${c.border}`, background: c.bg, color: c.muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><ExternalLink style={{ width: 14, height: 14 }} /></button>
                  </div>
                  <LinearCard c={c} story={story} sc0={sc0} sc1={sc1} identifier={linearId} issueUrl={story.issue_url} />
                </div>
              </div>
            </div>
            <div style={{ background: c.panel, border: `1px solid ${c.border}`, borderRadius: 16, padding: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, fontSize: 14, fontWeight: 500 }}><FileText style={{ width: 15, height: 15, color: c.muted }} /> Docs</div>
              <Textarea value={story.notes || ""} onChange={(e) => patch("notes", e.target.value)} placeholder="Describe the project, goals, open questions..."
                style={{ minHeight: 120, background: c.bg, borderColor: c.border, color: c.text, fontSize: 13, resize: "vertical", borderRadius: 8 }} />
              <p style={{ fontSize: 11, color: c.muted, marginTop: 8 }}>Saved to Supabase and shared with your team.</p>
            </div>
          </div>
        </>)}
      </div>
    </div>
  );
}

/* ---- All-states grid. `by` fans out over control states, light/dark themes,
   or every viewport — each combination rendered in its own labeled tile. ---- */
function StateGrid({ c, story, media, theme, viewport, by }) {
  const base = currentArgs(story);
  let tiles;
  if (by === "themes") {
    tiles = ["light", "dark"].map((t) => ({ key: `t-${t}`, label: t, sub: null, theme: t, viewport, args: base }));
  } else if (by === "screens") {
    tiles = Object.keys(VIEWPORTS).map((v) => ({ key: `v-${v}`, label: VIEWPORTS[v].label, sub: `${VIEWPORTS[v].w}×${VIEWPORTS[v].h}`, theme, viewport: v, args: base }));
  } else {
    const combos = stateCombos(story) || [{}];
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

/* ---- Figma embed, memoized on the URL so it doesn't reload on every parent
   re-render (typing notes, toggling theme, realtime updates). ---- */
const FigmaEmbed = memo(function FigmaEmbed({ url }) {
  const src = `https://www.figma.com/embed?embed_host=eon-hub&url=${encodeURIComponent(url)}`;
  return <iframe title="Figma preview" src={src} allowFullScreen style={{ width: "100%", height: "100%", border: "none", display: "block" }} />;
});

/* ---- Linear issue card: live via edge function, static preview fallback.
   The whole card links to the issue. ---- */
function LinearCard({ c, story, sc0, sc1, identifier, issueUrl }) {
  const [live, setLive] = useState(null);

  useEffect(() => {
    let stale = false;
    setLive(null);
    if (identifier) {
      fetchLinearIssue(identifier).then((issue) => { if (!stale) setLive(issue); });
    }
    return () => { stale = true; };
  }, [story.id, identifier]);

  const stateColor = live?.state?.color;
  const clickable = Boolean(issueUrl);
  return (
    <a href={issueUrl || undefined} target={clickable ? "_blank" : undefined} rel="noreferrer"
      style={{ height: 360, borderRadius: 12, border: `1px solid ${c.border}`, background: c.bg, padding: 16, display: "flex", flexDirection: "column", textDecoration: "none", color: c.text, cursor: clickable ? "pointer" : "default" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: c.muted, background: c.raised, padding: "3px 8px", borderRadius: 6 }}>{live?.identifier || identifier || "ISSUE"}</span>
        {live?.state
          ? <Badge style={{ background: stateColor ? `${stateColor}26` : c.raised, color: stateColor || c.text, border: "none", fontWeight: 500, fontSize: 11 }}>{live.state.name}</Badge>
          : <Badge style={{ background: sc0, color: sc1, border: "none", fontWeight: 500, fontSize: 11 }}>{story.status}</Badge>}
        {clickable && <ExternalLink style={{ width: 13, height: 13, color: c.muted, marginLeft: "auto" }} />}
      </div>
      <div style={{ fontSize: 15, fontWeight: 500, marginTop: 12 }}>
        {live ? live.title : `${story.title} — design + build`}
      </div>
      {live?.assignee && (
        <div style={{ fontSize: 12, color: c.muted, marginTop: 6 }}>Assigned to {live.assignee.displayName || live.assignee.name}</div>
      )}
      <div style={{ fontSize: 13, color: c.secondary, marginTop: 6, lineHeight: 1.5, flex: 1 }}>{(story.notes || "").slice(0, 200)}{(story.notes || "").length > 200 ? "…" : ""}</div>
      <div style={{ fontSize: 11, color: c.muted, paddingTop: 12, borderTop: `1px solid ${c.border}` }}>
        {live
          ? `Live from Linear — updated ${new Date(live.updatedAt).toLocaleDateString()}`
          : identifier
            ? "Live title/status/assignee appear here once LINEAR_API_KEY is set in Supabase secrets."
            : "Paste a Linear issue URL to link it."}
      </div>
    </a>
  );
}

/* ---- Upload prototype HTML (persists via projects.prototype_html) ---- */
function UploadPanel({ c, story, onSave, onClear, onCancel }) {
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

/* ---- Media manager (assets persist via onSetAsset) ---- */
function MediaManager({ c, assets, onSetAsset }) {
  const [ph, setPh] = useState({ w: 320, h: 180, label: "", bg: "#E5E7EB", fg: "#94A3B8" });
  const field = { height: 34, background: c.bg, borderColor: c.border, color: c.text, fontSize: 12, borderRadius: 8 };
  const panel = { background: c.panel, border: `1px solid ${c.border}`, borderRadius: 16, padding: 18 };
  const previewBox = { height: 96, borderRadius: 10, border: `1px solid ${c.border}`, background: c.bg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 };

  const LogoRow = ({ label, keyName, current }) => (
    <div style={panel}>
      <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>{label}</div>
      <div style={previewBox}>
        {assets[keyName]
          ? <img src={assets[keyName]} alt={label} style={{ maxHeight: 56, maxWidth: "80%", objectFit: "contain", borderRadius: 8 }} />
          : <span dangerouslySetInnerHTML={{ __html: current }} />}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <Input defaultValue={assets[keyName] || ""} placeholder="Paste image URL to replace"
          onBlur={(e) => onSetAsset(keyName, e.target.value)} style={field} />
        <button onClick={() => onSetAsset(keyName, "")} style={{ height: 34, padding: "0 12px", flexShrink: 0, borderRadius: 8, border: `1px solid ${c.border}`, background: c.bg, color: c.muted, cursor: "pointer", fontSize: 12 }}>Reset</button>
      </div>
    </div>
  );

  return (
    <div style={{ flex: 1 }}>
      <div style={{ height: 56, borderBottom: `1px solid ${c.border}`, background: c.nav, display: "flex", alignItems: "center", gap: 10, padding: "0 20px", position: "sticky", top: 0, zIndex: 5 }}>
        <span style={{ fontSize: 15, fontWeight: 500 }}>Media library</span>
        <span style={{ fontSize: 12, color: c.muted }}>Shared assets used across every story</span>
      </div>
      <div style={{ padding: 20 }}>
        <Tabs defaultValue="logos">
          <TabsList style={{ background: c.raised, borderRadius: 100, marginBottom: 18 }}>
            <TabsTrigger value="logos">Logos</TabsTrigger>
            <TabsTrigger value="placeholders">Placeholders</TabsTrigger>
          </TabsList>
          <TabsContent value="logos" style={{ margin: 0 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <LogoRow label="Eon logo (hub)" keyName="eonLogo" current={MEDIA.logos.eon(c.text, c.brand)} />
              <LogoRow label="Acme logo (stories)" keyName="acmeLogo" current={MEDIA.logos.acme(40, 10, "#4F46E5")} />
            </div>
          </TabsContent>
          <TabsContent value="placeholders" style={{ margin: 0 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 16 }}>
              <div style={panel}>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Generate placeholder</div>
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <Input type="number" value={ph.w} onChange={(e) => setPh({ ...ph, w: +e.target.value || 0 })} style={field} />
                  <Input type="number" value={ph.h} onChange={(e) => setPh({ ...ph, h: +e.target.value || 0 })} style={field} />
                </div>
                <Input value={ph.label} onChange={(e) => setPh({ ...ph, label: e.target.value })} placeholder={`${ph.w}×${ph.h}`} style={{ ...field, marginBottom: 8 }} />
                <div style={{ display: "flex", gap: 8 }}>
                  <input type="color" value={ph.bg} onChange={(e) => setPh({ ...ph, bg: e.target.value })} style={{ flex: 1, height: 34, borderRadius: 8, border: `1px solid ${c.border}`, background: c.bg }} />
                  <input type="color" value={ph.fg} onChange={(e) => setPh({ ...ph, fg: e.target.value })} style={{ flex: 1, height: 34, borderRadius: 8, border: `1px solid ${c.border}`, background: c.bg }} />
                </div>
              </div>
              <div style={panel}>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Preview</div>
                <div style={{ border: `1px solid ${c.border}`, borderRadius: 10, overflow: "hidden", display: "flex", justifyContent: "center", background: c.bg, padding: 12 }}>
                  <img src={MEDIA.placeholder(ph.w, ph.h, ph.label, ph.bg, ph.fg)} alt="placeholder" style={{ maxWidth: "100%", maxHeight: 220, objectFit: "contain" }} />
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
