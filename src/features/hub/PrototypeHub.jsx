import { useState, useMemo, useEffect, useRef, memo } from "react";
import { fetchLinearIssue } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FigmaIcon, LinearIcon } from "@/components/BrandIcons";
import { useSystemTheme } from "@/lib/systemTheme";
import {
  Search, Monitor, Laptop, Tablet, Smartphone, Maximize2, ExternalLink,
  Circle, ChevronDown, Link2, FileText, Plus, Minus, Shield, LogOut, Upload, Trash2,
  Square, LayoutGrid, Copy, Check,
} from "lucide-react";
import { HUB, VIEWPORTS, CANVAS_PRESETS, MEDIA, PRESET_MEDIA, renderStory, currentArgs, stateCombos, parsePrototypeConfig, safeMediaUrl } from "./prototypes";
import { buildSetupPrompt } from "./setupPrompt";

export { buildSetupPrompt } from "./setupPrompt";

const VP_ICON = { desktop: Monitor, laptop: Laptop, tablet: Tablet, mobile: Smartphone };

function parseHttpUrl(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed : null;
  } catch {
    return null;
  }
}

function decodeUrlPart(value) {
  try { return decodeURIComponent(value); } catch { return value; }
}

function renderMarkdownInline(value, keyPrefix) {
  const text = String(value || "");
  const tokenPattern = /(\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)|`([^`]+)`|\*\*([^*]+)\*\*|__([^_]+)__|~~([^~]+)~~)/g;
  const output = [];
  let cursor = 0;
  let match;

  while ((match = tokenPattern.exec(text))) {
    if (match.index > cursor) output.push(text.slice(cursor, match.index));
    const key = `${keyPrefix}-${match.index}`;
    if (match[2] && match[3]) {
      const href = parseHttpUrl(match[3])?.href;
      output.push(href
        ? <a key={key} href={href} target="_blank" rel="noreferrer">{match[2]}</a>
        : match[0]);
    } else if (match[4]) {
      output.push(<code key={key}>{match[4]}</code>);
    } else if (match[5] || match[6]) {
      output.push(<strong key={key}>{match[5] || match[6]}</strong>);
    } else if (match[7]) {
      output.push(<s key={key}>{match[7]}</s>);
    }
    cursor = tokenPattern.lastIndex;
  }
  if (cursor < text.length) output.push(text.slice(cursor));
  return output;
}

function MarkdownText({ children }) {
  const lines = String(children || "").replace(/\r\n?/g, "\n").split("\n");
  const blocks = [];
  const startsBlock = (line) => /^(#{1,6})\s+|^\s*[-*+]\s+|^\s*\d+[.)]\s+|^\s*>\s?|^\s*```/.test(line);
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) { index += 1; continue; }

    const fence = line.match(/^\s*```\s*([^\s]*)/);
    if (fence) {
      const code = [];
      index += 1;
      while (index < lines.length && !/^\s*```/.test(lines[index])) code.push(lines[index++]);
      if (index < lines.length) index += 1;
      blocks.push(<pre key={`code-${index}`}><code data-language={fence[1] || undefined}>{code.join("\n")}</code></pre>);
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)/);
    if (heading) {
      const Heading = heading[1].length <= 2 ? "h3" : "h4";
      blocks.push(<Heading key={`heading-${index}`}>{renderMarkdownInline(heading[2], `heading-${index}`)}</Heading>);
      index += 1;
      continue;
    }

    const bullet = line.match(/^\s*[-*+]\s+(.+)/);
    if (bullet) {
      const items = [];
      while (index < lines.length) {
        const item = lines[index].match(/^\s*[-*+]\s+(.+)/);
        if (!item) break;
        items.push(<li key={`bullet-${index}`}>{renderMarkdownInline(item[1], `bullet-${index}`)}</li>);
        index += 1;
      }
      blocks.push(<ul key={`list-${index}`}>{items}</ul>);
      continue;
    }

    const ordered = line.match(/^\s*\d+[.)]\s+(.+)/);
    if (ordered) {
      const items = [];
      while (index < lines.length) {
        const item = lines[index].match(/^\s*\d+[.)]\s+(.+)/);
        if (!item) break;
        items.push(<li key={`ordered-${index}`}>{renderMarkdownInline(item[1], `ordered-${index}`)}</li>);
        index += 1;
      }
      blocks.push(<ol key={`ordered-list-${index}`}>{items}</ol>);
      continue;
    }

    if (/^\s*>/.test(line)) {
      const quote = [];
      while (index < lines.length && /^\s*>/.test(lines[index])) quote.push(lines[index++].replace(/^\s*>\s?/, ""));
      blocks.push(<blockquote key={`quote-${index}`}>{renderMarkdownInline(quote.join(" "), `quote-${index}`)}</blockquote>);
      continue;
    }

    const paragraph = [];
    while (index < lines.length && lines[index].trim() && !startsBlock(lines[index])) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    blocks.push(<p key={`paragraph-${index}`}>{renderMarkdownInline(paragraph.join(" "), `paragraph-${index}`)}</p>);
  }

  return <div className="eon-linear-markdown">{blocks}</div>;
}

export default function PrototypeHub({
  projects, assets = {}, isAdmin, userEmail,
  onPatchProject, onSetAsset, onNewProject, onDeleteProject, onReorder, onOpenAdmin, onSignOut,
}) {
  const hubTheme = useSystemTheme();
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
    try {
      await navigator.clipboard.writeText(buildSetupPrompt({
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
      setTimeout(() => setCopiedPrompt(false), 1600);
    } catch (e) { /* clipboard blocked */ }
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
  const setupControlSource = story?.controls?.length
    ? "stored project controls (these override embedded eon-config controls)"
    : cfg.controls?.length ? "embedded eon-config" : "none";
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
          <button onClick={copySetupPrompt} title="Includes the current controls, selected values, viewports, and shared media variables"
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
              ? <Badge title="Live from Linear" style={{ background: `${liveLinear.state.color}26`, color: liveLinear.state.color, border: "none", fontWeight: 500 }}>
                {liveLinear.state.name} · {(liveLinear.team?.key || String(linearId).split("-")[0]).toUpperCase()}
              </Badge>
              : <Badge style={{ background: "rgba(255,122,138,.14)", color: "#FF7A8A", border: "none", fontWeight: 500 }}>
                {linearId ? `Linear unavailable · ${String(linearId).split("-")[0].toUpperCase()}` : "Linear not connected"}
              </Badge>}
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
              <StateGrid c={c} story={effStory} sourceProject={story} currentArgs={args} controlSource={setupControlSource}
                media={media} theme={protoTheme} viewport={viewport} by={effGridBy} />
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
                    <FigmaIcon size={13} /> Figma frame
                    {story.figma_url && !editFigma && <button onClick={() => setEditFigma(true)} style={{ marginLeft: "auto", fontSize: 11, color: c.muted, background: "transparent", border: "none", cursor: "pointer" }}>Edit link</button>}
                  </div>
                  {(!story.figma_url || editFigma) && (
                    <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                      <Input value={story.figma_url || ""} onChange={(e) => patch("figma_url", e.target.value)} placeholder="Paste a Figma URL" aria-label="Figma frame URL"
                        style={{ height: 34, background: c.bg, borderColor: c.border, color: c.text, fontSize: 12, borderRadius: 8 }} />
                      {editFigma && <button onClick={() => setEditFigma(false)} style={{ height: 34, padding: "0 12px", flexShrink: 0, borderRadius: 8, border: `1px solid ${c.border}`, background: c.bg, color: c.text, cursor: "pointer", fontSize: 12 }}>Done</button>}
                    </div>
                  )}
                  {story.figma_url
                    ? <FigmaCard c={c} url={story.figma_url} />
                    : <div style={{ height: 360, borderRadius: 12, overflow: "hidden", border: `1px dashed ${c.border}`, background: c.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, textAlign: "center", padding: 20 }}><FigmaIcon size={22} /><div style={{ fontSize: 13, color: c.text }}>No Figma frame linked</div><div style={{ fontSize: 12, color: c.muted }}>Paste a share URL to embed a live preview.</div></div>}
                </div>
                {/* resizer */}
                <div onMouseDown={startLinksResize} title="Drag to resize" role="separator" aria-orientation="vertical"
                  style={{ width: 16, flexShrink: 0, alignSelf: "stretch", cursor: "col-resize", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: 3, height: 44, borderRadius: 3, background: c.border }} />
                </div>
                {/* linear */}
                <div style={{ flex: 1, minWidth: 200, display: "flex", flexDirection: "column" }}>
                  <div style={{ fontSize: 12, color: c.muted, display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <LinearIcon size={13} style={{ color: "#5E6AD2" }} /> Linear issue
                    {story.issue_url && !editLinear && <button onClick={() => setEditLinear(true)} style={{ marginLeft: "auto", fontSize: 11, color: c.muted, background: "transparent", border: "none", cursor: "pointer" }}>Edit link</button>}
                  </div>
                  {(!story.issue_url || editLinear) && (
                    <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                      <Input value={story.issue_url || ""} onChange={(e) => patch("issue_url", e.target.value)} placeholder="https://linear.app/…/issue/DES-418/…" aria-label="Linear issue URL" style={{ height: 34, background: c.bg, borderColor: c.border, color: c.text, fontSize: 12, borderRadius: 8 }} />
                      {editLinear && <button onClick={() => setEditLinear(false)} style={{ height: 34, padding: "0 12px", flexShrink: 0, borderRadius: 8, border: `1px solid ${c.border}`, background: c.bg, color: c.text, cursor: "pointer", fontSize: 12 }}>Done</button>}
                    </div>
                  )}
                  <LinearCard c={c} story={story} live={liveLinear} identifier={linearId} issueUrl={story.issue_url} />
                </div>
              </div>
            </div>
          </div>
        </>)}
      </div>
    </div>
  );
}

const PREVIEW_SANDBOX = "allow-scripts allow-forms allow-modals allow-popups allow-downloads";

const StatePreviewTile = memo(function StatePreviewTile({ c, story, media, tile }) {
  const previewRef = useRef(null);
  const [previewWidth, setPreviewWidth] = useState(360);
  const [shouldRender, setShouldRender] = useState(false);
  const tvp = VIEWPORTS[tile.viewport];

  useEffect(() => {
    const node = previewRef.current;
    if (!node) return undefined;
    const updateWidth = (width) => {
      const next = Math.max(1, Math.round(width));
      setPreviewWidth((current) => current === next ? current : next);
    };
    updateWidth(node.getBoundingClientRect().width);
    if (typeof ResizeObserver === "undefined") {
      const onResize = () => updateWidth(node.getBoundingClientRect().width);
      window.addEventListener("resize", onResize);
      return () => window.removeEventListener("resize", onResize);
    }
    const observer = new ResizeObserver(([entry]) => updateWidth(entry.contentRect.width));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const node = previewRef.current;
    if (!node) return undefined;
    if (typeof IntersectionObserver === "undefined") {
      setShouldRender(true);
      return undefined;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setShouldRender(true);
      observer.disconnect();
    }, { rootMargin: "320px 0px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const source = useMemo(
    () => shouldRender ? renderStory(story, tile.theme, media, tile.args) : "",
    [shouldRender, story, tile.theme, tile.args, media],
  );
  const scale = Math.min(previewWidth / tvp.w, 1);
  const title = `${story.title} — ${tile.label}${tile.sub ? ` (${tile.sub})` : ""}`;

  return (
    <div style={{ display: "flex", minWidth: 0, width: "100%", maxWidth: 360, flex: "1 1 280px", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: c.text, background: c.panel, border: `1px solid ${c.border}`, borderRadius: 6, padding: "3px 8px", textTransform: "capitalize", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tile.label}</span>
        {tile.sub && <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 11, color: c.muted, textTransform: "capitalize" }}>{tile.sub}</span>}
      </div>
      <div ref={previewRef} style={{ position: "relative", width: "100%", aspectRatio: `${tvp.w} / ${tvp.h}`, borderRadius: 10, overflow: "hidden", border: `1px solid ${c.border}`, background: "#fff", boxShadow: "0 8px 30px rgba(0,0,0,.22)" }}>
        {shouldRender ? (
          <iframe title={title} srcDoc={source} loading="lazy" sandbox={PREVIEW_SANDBOX} referrerPolicy="no-referrer"
            style={{ position: "absolute", inset: 0, width: tvp.w, height: tvp.h, border: "none", background: "#fff", colorScheme: tile.theme, transform: `scale(${scale})`, transformOrigin: "top left" }} />
        ) : (
          <div aria-hidden="true" style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: c.raised, color: c.muted, fontSize: 12 }}>
            Preview loads when visible
          </div>
        )}
      </div>
    </div>
  );
});

/* ---- All-states grid. `by` fans out over control states, light/dark themes,
   or every viewport — each combination rendered in its own labeled tile. ---- */
export function StateGrid({ c, story, sourceProject = story, currentArgs: selectedArgs, controlSource, media, theme, viewport, by }) {
  const tiles = useMemo(() => {
    const base = currentArgs(story);
    if (by === "themes") {
      return ["light", "dark"].map((tileTheme) => ({ key: `t-${tileTheme}`, label: tileTheme, sub: null, theme: tileTheme, viewport, args: base }));
    }
    if (by === "screens") {
      return Object.keys(VIEWPORTS).map((screen) => ({ key: `v-${screen}`, label: VIEWPORTS[screen].label, sub: `${VIEWPORTS[screen].w}×${VIEWPORTS[screen].h}`, theme, viewport: screen, args: base }));
    }
    const combos = stateCombos(story);
    if (!combos) return null;
    return combos.map((combo) => ({ key: JSON.stringify(combo), label: Object.values(combo).join(" · ") || "Default", sub: theme, theme, viewport, args: { ...base, ...combo } }));
  }, [story, by, theme, viewport]);

  if (!tiles) return (
    <StatesNotice c={c} prompt={buildSetupPrompt({
      project: sourceProject,
      controls: story?.controls,
      defaults: story?.defaults,
      currentArgs: selectedArgs || currentArgs(story),
      assets: media,
      theme,
      viewport,
      controlSource,
    })} />
  );

  return (
    <div style={{ width: "100%", display: "flex", flexWrap: "wrap", gap: 20, alignContent: "flex-start", alignItems: "flex-start" }}>
      {tiles.map((tile) => <StatePreviewTile key={tile.key} c={c} story={story} media={media} tile={tile} />)}
    </div>
  );
}

/* ---- Shown by the states grid when a prototype declares no states: the hub
   can only fan out what the HTML declares via its eon-config block. ---- */
function StatesNotice({ c, prompt }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt || buildSetupPrompt());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch { /* Clipboard may be blocked by the browser. */ }
  };
  return (
    <div style={{ maxWidth: 460, margin: "48px auto", padding: "28px 26px", borderRadius: 14, background: c.panel, border: `1px solid ${c.border}`, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center", color: c.muted }}>
      <LayoutGrid size={22} color={c.brand} aria-hidden="true" />
      <strong style={{ color: c.text, fontSize: 14, marginTop: 4 }}>This prototype doesn't declare states</strong>
      <span style={{ fontSize: 13, lineHeight: 1.55 }}>
        Copy the setup prompt and regenerate this prototype with its states declared, like popups, errors, and empty views.
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
  const parsed = parseHttpUrl(url);
  const host = parsed?.hostname.toLowerCase() || "";
  const valid = Boolean(parsed)
    && (host === "figma.com" || host.endsWith(".figma.com"))
    && !/REPLACE/i.test(url);
  let title = "Figma file", node = null;
  if (!valid) return { valid: false, title, node };
  const match = parsed.pathname.match(/^\/(?:file|design|proto|board)\/[^/]+\/([^/]+)/i);
  if (match) title = decodeUrlPart(match[1]).replace(/-+/g, " ").trim() || title;
  node = parsed.searchParams.get("node-id") || null;
  return { valid, title, node };
}

/* ---- Figma unfurl card: icon + file name + Open in Figma, over a live preview.
   Mirrors how Linear renders an embedded link. ---- */
export function FigmaCard({ c, url }) {
  const meta = figmaMeta(url);
  return (
    <div style={{ height: 360, borderRadius: 12, overflow: "hidden", border: `1px solid ${c.border}`, background: c.bg, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderBottom: `1px solid ${c.border}`, flexShrink: 0 }}>
        <FigmaIcon size={15} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: c.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{meta.title}</div>
          {meta.node && <div style={{ fontSize: 11, color: c.muted }}>Node {meta.node}</div>}
        </div>
        {meta.valid && (
          <a href={url} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0, fontSize: 12, color: c.text, background: c.raised, border: `1px solid ${c.border}`, borderRadius: 8, padding: "5px 10px", textDecoration: "none" }}>
            <ExternalLink style={{ width: 13, height: 13 }} /> Open in Figma
          </a>
        )}
      </div>
      <div style={{ flex: 1, minHeight: 0, background: "#1e1e1e" }}>
        {meta.valid
          ? <FigmaEmbed url={url} />
          : <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: c.muted, fontSize: 12, padding: 16, textAlign: "center" }}>Use a valid figma.com share URL to embed this frame.</div>}
      </div>
    </div>
  );
}

/* ---- Linear issue card: live via edge function, static preview fallback.
   The whole card links to the issue. ---- */
export function LinearCard({ c, story, live, identifier, issueUrl }) {
  const stateColor = live?.state?.color;
  const teamKey = live?.team?.key?.toUpperCase()
    || String(identifier || "").split("-")[0]?.toUpperCase()
    || "";
  const errorColor = c.bg === "#000000" ? "#FF7A8A" : "#B42335";
  const connectionLabel = live?.state
    ? `${live.state.name}${teamKey ? ` · ${teamKey}` : ""}`
    : !identifier
      ? "Linear not connected"
      : live === undefined
        ? `Connecting Linear${teamKey ? ` · ${teamKey}` : ""}`
        : `Linear unavailable${teamKey ? ` · ${teamKey}` : ""}`;
  const connectionColor = live?.state ? (stateColor || c.text) : identifier && live === undefined ? c.muted : errorColor;
  const safeIssueUrl = parseHttpUrl(issueUrl)?.href || "";
  const clickable = Boolean(safeIssueUrl);
  return (
    <div className="eon-linear-card"
      style={{ flex: "1 1 auto", minHeight: 240, borderRadius: 12, border: `1px solid ${c.border}`, background: c.bg, padding: 16, display: "flex", flexDirection: "column", color: c.text, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <LinearIcon size={15} style={{ color: c.muted }} />
        <span style={{ fontSize: 12, fontWeight: 500, color: c.muted, background: c.raised, padding: "3px 8px", borderRadius: 6 }}>{live?.identifier || identifier || "ISSUE"}</span>
        <Badge style={{ background: `${connectionColor}26`, color: connectionColor, border: "none", fontWeight: 500, fontSize: 11 }}>
          {connectionLabel}
        </Badge>
        {live?.priorityLabel && live.priorityLabel !== "No priority" && (
          <span style={{ fontSize: 11, color: c.muted }}>{live.priorityLabel}</span>
        )}
        {clickable && (
          <a className="eon-linear-open" href={safeIssueUrl} target="_blank" rel="noreferrer" aria-label="Open issue in Linear" title="Open issue in Linear" style={{ color: c.muted }}>
            <ExternalLink style={{ width: 14, height: 14 }} />
          </a>
        )}
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
        ? <div className="eon-linear-description" style={{ color: c.secondary }}><MarkdownText>{live.description}</MarkdownText></div>
        : <div style={{ fontSize: 13, color: c.muted, marginTop: 10, flex: 1 }}>{live ? "No description in Linear." : ""}</div>}
      <div style={{ fontSize: 11, color: c.muted, paddingTop: 12, marginTop: 8, borderTop: `1px solid ${c.border}`, flexShrink: 0 }}>
        {live
          ? `Live from Linear — updated ${new Date(live.updatedAt).toLocaleDateString()}`
          : identifier
            ? (live === undefined ? "Connecting to Linear…" : "Linear could not be reached. Check the integration and issue link.")
            : "Linear is not connected. Paste an issue URL above."}
      </div>
    </div>
  );
}

/* ---- Upload prototype HTML (persists via projects.prototype_html) ---- */
/* ---- Compact upload panel: a drag-and-drop zone up top, the bulky HTML editor
   and tips tucked behind a disclosure so the panel stays short, and a tight
   Save · Re-upload · Remove · Cancel action row. ---- */
export function UploadPanel({
  c, story, onSave, onClear, onCancel,
  canLinkFile = false, fileLink = null, fileLinkError = "",
  autoPublish = true, onToggleAutoPublish, onLinkFile, onUnlinkFile, onPublishFile,
}) {
  const [html, setHtml] = useState(story.prototype_html || "");
  const [dragOver, setDragOver] = useState(false);
  const [err, setErr] = useState("");
  const [fileName, setFileName] = useState("");
  const [showSource, setShowSource] = useState(false);
  const fileInputRef = useRef(null);

  const readFile = (file) => {
    if (!file) return;
    if (!/\.html?$/i.test(file.name) && file.type !== "text/html") {
      setErr("Drop a .html file — other formats aren't supported.");
      return;
    }
    setErr("");
    const reader = new FileReader();
    reader.onload = () => { setHtml(String(reader.result)); setFileName(file.name); };
    reader.readAsText(file);
  };

  const hasHtml = Boolean(html.trim());
  const sizeKb = hasHtml ? Math.max(1, Math.round(new Blob([html]).size / 1024)) : 0;
  const outline = { display: "flex", alignItems: "center", gap: 6, height: 34, padding: "0 12px", borderRadius: 8, border: `1px solid ${c.border}`, background: "transparent", cursor: "pointer", fontSize: 13 };

  return (
    <div className="eon-upload-panel" style={{ borderBottom: `1px solid ${c.border}`, background: c.nav }}>
      <div className="eon-upload-head" style={{ color: c.text }}>
        <Upload style={{ width: 14, height: 14, color: c.muted }} aria-hidden="true" />
        <span>Upload prototype HTML for “{story.title}”</span>
        <span style={{ fontSize: 12, fontWeight: 400, color: c.muted }}>
          {story.prototype_html ? "This prototype renders uploaded HTML." : "Renders a built-in builder or placeholder until HTML is uploaded."}
        </span>
      </div>

      {fileLink ? (
        /* Live sync chip replaces the dropzone while a local file is linked. */
        <div className="eon-live-chip" style={{ borderColor: c.border, background: c.raised }}>
          <span className="eon-live-dot" aria-hidden="true" />
          <div className="eon-live-chip-meta">
            <strong style={{ color: c.text }}>
              <code>{fileLink.name}</code> is live
            </strong>
            <span style={{ color: c.muted }}>
              {autoPublish ? "Every save publishes to your team" : "Rendering locally — publish when ready"}
              {fileLink.lastSyncAt ? ` · synced ${new Date(fileLink.lastSyncAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}` : ""}
            </span>
          </div>
          <label className="eon-live-toggle" style={{ color: c.secondary }}>
            <input type="checkbox" checked={autoPublish} onChange={onToggleAutoPublish} />
            Auto-publish
          </label>
          {!autoPublish && (
            <button type="button" onClick={onPublishFile}
              style={{ minHeight: 32, padding: "0 12px", border: 0, borderRadius: 8, background: c.primary, color: c.primaryText, cursor: "pointer", fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
              Publish now
            </button>
          )}
          <button type="button" onClick={onUnlinkFile}
            style={{ minHeight: 32, padding: "0 12px", border: `1px solid ${c.border}`, borderRadius: 8, background: "transparent", color: c.muted, cursor: "pointer", fontSize: 13, flexShrink: 0 }}>
            Unlink
          </button>
        </div>
      ) : (
      <div className="eon-upload-drop"
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); readFile(e.dataTransfer.files?.[0]); }}
        style={{ borderColor: dragOver ? c.brand : c.border, background: dragOver ? c.active : "transparent" }}>
        <Upload size={15} color={dragOver ? c.brand : c.muted} aria-hidden="true" />
        <span style={{ fontSize: 13, color: c.secondary, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {hasHtml
            ? <>HTML ready{fileName ? <> · <code style={{ color: c.text }}>{fileName}</code></> : null} · {sizeKb} KB</>
            : "Drag & drop a .html file here, or"}
        </span>
        <button type="button" onClick={() => fileInputRef.current?.click()}
          style={{ minHeight: 32, padding: "0 12px", border: `1px solid ${c.border}`, borderRadius: 8, background: c.bg, color: c.brand, cursor: "pointer", fontSize: 13, flexShrink: 0 }}>
          {hasHtml ? "Re-upload" : "Browse files"}
        </button>
        {canLinkFile && (
          <button type="button" onClick={onLinkFile} title="Render this prototype straight from a file on disk — every editor save syncs automatically"
            style={{ minHeight: 32, padding: "0 12px", border: `1px solid ${c.border}`, borderRadius: 8, background: c.bg, color: c.brand, cursor: "pointer", fontSize: 13, flexShrink: 0 }}>
            Link local file
          </button>
        )}
        <input ref={fileInputRef} type="file" accept=".html,.htm,text/html" tabIndex={-1} aria-hidden="true"
          onChange={(e) => { readFile(e.target.files?.[0]); e.target.value = ""; }}
          style={{ position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clipPath: "inset(50%)", whiteSpace: "nowrap", border: 0 }} />
      </div>
      )}
      {fileLinkError && <div role="alert" style={{ fontSize: 12, color: "#FF508F" }}>{fileLinkError}</div>}

      <button type="button" className="eon-buttonish eon-upload-disclosure" onClick={() => setShowSource((v) => !v)}
        aria-expanded={showSource} style={{ color: c.secondary }}>
        <ChevronDown size={13} className={showSource ? "" : "is-collapsed"} aria-hidden="true" />
        {showSource ? "Hide HTML source" : (hasHtml ? "Edit HTML source" : "Paste HTML source")}
      </button>

      {showSource && (
        <>
          <Textarea value={html} onChange={(e) => { setHtml(e.target.value); setFileName(""); }} spellCheck={false}
            placeholder="…paste a self-contained HTML document here"
            aria-label="Prototype HTML source"
            style={{ minHeight: 150, background: c.bg, borderColor: c.border, color: c.text, fontSize: 12, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", resize: "vertical", borderRadius: 8 }} />
          <p style={{ fontSize: 11, color: c.muted, lineHeight: 1.5, margin: 0 }}>
            Theme tip: the hub sets <code style={{ color: c.text }}>class="dark"/"light"</code> and <code style={{ color: c.text }}>data-theme</code> on <code style={{ color: c.text }}>&lt;html&gt;</code>, and exposes <code style={{ color: c.text }}>window.__story</code> — style against those so the Theme toggle drives your prototype.
          </p>
          <p style={{ fontSize: 11, color: c.muted, lineHeight: 1.5, margin: 0 }}>
            Media tip: <code style={{ color: c.text }}>{'{{eonLogo}}'}</code>, <code style={{ color: c.text }}>{'{{heroImage}}'}</code>, any saved media key, or <code style={{ color: c.text }}>{'{{placeholder:320x180}}'}</code> as an image <code style={{ color: c.text }}>src</code> map to the Media library.
          </p>
        </>
      )}

      {err && <div role="alert" style={{ fontSize: 12, color: "#FF508F" }}>{err}</div>}

      <div className="eon-upload-actions">
        <Button onClick={() => hasHtml && onSave(html)} disabled={!hasHtml}
          style={{ height: 34, background: c.primary, color: c.primaryText, fontSize: 13, borderRadius: 8, opacity: hasHtml ? 1 : 0.5 }}>
          Save
        </Button>
        <button type="button" onClick={() => fileInputRef.current?.click()} style={{ ...outline, color: c.secondary }}>
          <Upload style={{ width: 13, height: 13 }} aria-hidden="true" /> Re-upload
        </button>
        {story.prototype_html && (
          <button type="button" onClick={onClear} style={{ ...outline, color: c.muted }}>
            <Trash2 style={{ width: 13, height: 13 }} aria-hidden="true" /> Remove
          </button>
        )}
        <button type="button" onClick={onCancel} style={{ ...outline, color: c.muted }}>Cancel</button>
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
  const [mediaError, setMediaError] = useState("");
  const field = { height: 34, background: c.bg, borderColor: c.border, color: c.text, fontSize: 12, borderRadius: 8 };
  const panel = { background: c.panel, border: `1px solid ${c.border}`, borderRadius: 16, padding: 18 };
  const btn = { height: 34, padding: "0 12px", flexShrink: 0, borderRadius: 8, border: `1px solid ${c.border}`, background: c.bg, color: c.muted, cursor: "pointer", fontSize: 12 };
  const copy = async (text, id) => { try { await navigator.clipboard.writeText(text); setCopied(id); setTimeout(() => setCopied(""), 1200); } catch (e) { /* clipboard blocked */ } };
  const Token = ({ name, available = true }) => (
    <button onClick={() => available && copy(`{{${name}}}`, `tok-${name}`)} disabled={!available}
      title={available ? "Copy token" : "Add a valid image URL to activate this token"}
      style={{ fontSize: 11, fontFamily: "ui-monospace, Menlo, monospace", color: c.text, background: c.raised, border: `1px solid ${c.border}`, padding: "2px 7px", borderRadius: 6, cursor: available ? "pointer" : "not-allowed", opacity: available ? 1 : 0.5 }}>
      {copied === `tok-${name}` ? "copied" : `{{${name}}}`}
    </button>
  );

  const cleanKey = (s) => s.trim().replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/(^-|-$)/g, "");
  const phData = MEDIA.placeholder(ph.w, ph.h, ph.label, ph.bg, ph.fg);
  const saveAssetUrl = (key, value) => {
    const candidate = value.trim();
    if (!candidate) {
      setMediaError("");
      onSetAsset(key, "");
      return true;
    }
    const safe = safeMediaUrl(candidate);
    if (!safe) {
      setMediaError("Use an http(s), relative, or data:image URL for shared media.");
      return false;
    }
    setMediaError("");
    onSetAsset(key, safe);
    return true;
  };
  const savePlaceholder = () => {
    const key = cleanKey(ph.name);
    if (!key) return;
    setMediaError("");
    onSetAsset(key, safeMediaUrl(phData));
    setPh({ ...ph, name: "" });
  };
  const addImage = () => {
    const key = cleanKey(img.name);
    if (!key || !img.url.trim()) return;
    if (saveAssetUrl(key, img.url)) setImg({ name: "", url: "" });
  };

  // One flat list: team logos, the always-available preset photos, then
  // anything saved in this team's library. A saved asset under a logo/preset
  // key overrides it; Reset clears the override.
  const logoDefaults = {
    eonLogo: { label: "Eon logo (hub)", html: MEDIA.logos.eon(c.text, c.brand) },
    acmeLogo: { label: "Acme logo (stories)", html: MEDIA.logos.acme(40, 10, "#4F46E5") },
  };
  const safeAsset = (key) => safeMediaUrl(assets[key]);
  const customKeys = Object.keys(assets).filter((k) => !logoDefaults[k] && !PRESET_MEDIA[k] && assets[k]);
  const items = [
    ...Object.entries(logoDefaults).map(([k, d]) => ({
      key: k, label: d.label, kind: assets[k] ? "Logo" : "Logo · add URL", url: assets[k] || "", linkUrl: safeAsset(k),
      previewHtml: assets[k] ? null : d.html, previewSrc: safeAsset(k),
    })),
    ...Object.keys(PRESET_MEDIA).map((k) => ({
      key: k, label: k, kind: assets[k] ? "Preset · replaced" : "Preset", url: assets[k] || "",
      linkUrl: safeAsset(k) || PRESET_MEDIA[k], previewSrc: safeAsset(k) || PRESET_MEDIA[k],
    })),
    ...customKeys.map((k) => ({
      key: k, label: k, kind: "Saved", url: assets[k], linkUrl: safeAsset(k), previewSrc: safeAsset(k), removable: true,
    })),
  ];

  const mediaCard = (item) => (
    <div key={item.key} style={{ border: `1px solid ${c.border}`, borderRadius: 12, padding: 12, background: c.panel, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 500, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label}</span>
        <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase", color: c.muted, background: c.raised, borderRadius: 100, padding: "3px 8px", flexShrink: 0 }}>{item.kind}</span>
      </div>
      <div style={{ height: 110, borderRadius: 10, border: `1px solid ${c.border}`, background: c.bg, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        {item.previewHtml
          ? <span dangerouslySetInnerHTML={{ __html: item.previewHtml }} />
          : item.previewSrc
            ? <img src={item.previewSrc} alt={item.label} loading="lazy" referrerPolicy="no-referrer" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
            : <span style={{ padding: 12, color: c.muted, fontSize: 12, textAlign: "center" }}>Add a valid image URL to preview this asset.</span>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <Token name={item.key} available={Boolean(item.linkUrl)} />
        <button onClick={() => copy(item.linkUrl, `link-${item.key}`)} disabled={!item.linkUrl} style={{ ...btn, height: 26, padding: "0 8px", opacity: item.linkUrl ? 1 : 0.5 }}>{copied === `link-${item.key}` ? "Copied" : "Link"}</button>
        {(item.url || item.removable) && (
          <button onClick={() => onSetAsset(item.key, "")} title={item.removable ? "Remove from library" : "Reset to default"} style={{ ...btn, height: 26, padding: "0 8px", marginLeft: "auto" }}>
            {item.removable ? "Remove" : "Reset"}
          </button>
        )}
      </div>
      <Input key={`${item.key}-${item.url}`} defaultValue={item.url} placeholder="Paste image URL to replace" aria-label={`Image URL for ${item.key}`}
        onBlur={(e) => { const v = e.target.value.trim(); if (v !== item.url) saveAssetUrl(item.key, v); }} style={field} />
    </div>
  );

  return (
    <div style={{ flex: 1 }}>
      <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
        <p style={{ margin: 0, color: c.muted, fontSize: 12, lineHeight: 1.5 }}>Use any shared image as {"{{name}}"}. Replacing its URL updates every prototype that references it.</p>
        <div style={{ ...panel, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginRight: 4 }}>Add an image</div>
          <Input value={img.name} onChange={(e) => setImg({ ...img, name: e.target.value })} placeholder="Name (e.g. teamPhoto)" aria-label="New image name" style={{ ...field, flex: "0 1 200px" }} />
          <Input value={img.url} onChange={(e) => setImg({ ...img, url: e.target.value })} placeholder="https://cdn.example.com/image.png" aria-label="New image URL" style={{ ...field, flex: "1 1 240px" }} />
          <button onClick={addImage} disabled={!img.name.trim() || !img.url.trim()} style={{ ...btn, background: c.primary, color: c.primaryText, border: "none", opacity: img.name.trim() && img.url.trim() ? 1 : 0.5 }}>Add to media</button>
          {img.name.trim() && <span style={{ fontSize: 11, color: c.muted }}>Will be available as <code style={{ color: c.text }}>{`{{${cleanKey(img.name)}}}`}</code></span>}
        </div>
        {mediaError && <p role="alert" style={{ margin: 0, color: "#FF508F", fontSize: 12 }}>{mediaError}</p>}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
          {items.map(mediaCard)}
        </div>

        <details style={panel}>
          <summary style={{ fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Generate a blank placeholder (optional)</summary>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 16, marginTop: 14 }}>
            <div>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <Input type="number" min={1} max={4096} value={ph.w} onChange={(e) => setPh({ ...ph, w: +e.target.value || 0 })} aria-label="Placeholder width in pixels" style={field} />
                <Input type="number" min={1} max={4096} value={ph.h} onChange={(e) => setPh({ ...ph, h: +e.target.value || 0 })} aria-label="Placeholder height in pixels" style={field} />
              </div>
              <Input value={ph.label} onChange={(e) => setPh({ ...ph, label: e.target.value })} placeholder={`Label (default ${ph.w}×${ph.h})`} aria-label="Placeholder label" style={{ ...field, marginBottom: 8 }} />
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <input type="color" value={ph.bg} onChange={(e) => setPh({ ...ph, bg: e.target.value })} aria-label="Placeholder background color" style={{ flex: 1, height: 34, borderRadius: 8, border: `1px solid ${c.border}`, background: c.bg }} />
                <input type="color" value={ph.fg} onChange={(e) => setPh({ ...ph, fg: e.target.value })} aria-label="Placeholder foreground color" style={{ flex: 1, height: 34, borderRadius: 8, border: `1px solid ${c.border}`, background: c.bg }} />
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <Input value={ph.name} onChange={(e) => setPh({ ...ph, name: e.target.value })} placeholder="Save as (e.g. blankHero)" aria-label="Placeholder asset name" style={field} />
                <button onClick={savePlaceholder} disabled={!ph.name.trim()} style={{ ...btn, opacity: ph.name.trim() ? 1 : 0.5 }}>Save</button>
              </div>
              <p style={{ fontSize: 11, color: c.muted, marginTop: 8 }}>Or drop <code style={{ color: c.text }}>{'{{placeholder:320x180}}'}</code> straight into a prototype.</p>
            </div>
            <div style={{ border: `1px solid ${c.border}`, borderRadius: 10, overflow: "hidden", display: "flex", justifyContent: "center", background: c.bg, padding: 12 }}>
              <img src={phData} alt="placeholder" style={{ maxWidth: "100%", maxHeight: 180, objectFit: "contain" }} />
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}
