import { useState, useMemo, useEffect, useRef, memo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LinearIcon } from "@/components/BrandIcons";
import {
  ExternalLink, ChevronDown, Upload, Trash2, Copy, Check, AlertCircle, Loader2, LayoutGrid,
  ImageOff, Link2, MoreHorizontal, RotateCcw,
} from "lucide-react";
import { VIEWPORTS, MEDIA, PRESET_MEDIA, renderStory, currentArgs, stateCombos, safeMediaUrl } from "./prototypes";
import { buildSetupPrompt } from "./setupPrompt";
import { MEDIA_IMAGE_TYPES, mediaFileProblem, uploadMedia } from "@/lib/data";

export { buildSetupPrompt } from "./setupPrompt";


function parseHttpUrl(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed : null;
  } catch {
    return null;
  }
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
  const title = `${story.title}: ${tile.label}${tile.sub ? `, ${tile.sub}` : ""}`;

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
   or every viewport. Each combination renders in its own labeled tile. ------ */
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

/* ---- Linear issue card: live via edge function, static preview fallback.
   The whole card links to the issue. ---- */
export function LinearCard({ c, story, live, identifier, issueUrl }) {
  const safeIssueUrl = parseHttpUrl(issueUrl)?.href || "";
  const clickable = Boolean(safeIssueUrl);
  return (
    <div className="eon-linear-card"
      style={{ flex: "1 1 auto", minHeight: 240, borderRadius: 12, border: `1px solid ${c.border}`, background: c.bg, padding: 16, display: "flex", flexDirection: "column", color: c.text, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <LinearIcon size={15} style={{ color: c.muted }} />
        <span style={{ fontSize: 12, fontWeight: 500, color: c.muted, background: c.raised, padding: "3px 8px", borderRadius: 6 }}>{live?.identifier || identifier || "ISSUE"}</span>
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
        {live ? live.title : `${story.title}: design and build`}
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
          ? `Live from Linear. Updated ${new Date(live.updatedAt).toLocaleDateString()}`
          : identifier
            ? (live === undefined ? "Connecting to Linear…" : "Linear could not be reached. Check the integration and issue link.")
            : "Add an issue URL to pull status, assignee, and description."}
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
      setErr("Drop an HTML file. Other formats aren't supported.");
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
    <div className="eon-upload-panel">
      {fileLink ? (
        /* Live sync chip replaces the dropzone while a local file is linked. */
        <div className="eon-live-chip" style={{ borderColor: c.border, background: c.raised }}>
          <span className="eon-live-dot" aria-hidden="true" />
          <div className="eon-live-chip-meta">
            <strong style={{ color: c.text }}>
              <code>{fileLink.name}</code> is live
            </strong>
            <span style={{ color: c.muted }}>
              {fileLink.lastSyncAt
                ? `Synced ${new Date(fileLink.lastSyncAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
                : "Watching for saves"}
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
          <button type="button" onClick={onLinkFile} title="Render this prototype from a file on disk. Every editor save syncs automatically"
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
            style={{ minHeight: 150, background: c.raised, borderColor: c.border, color: c.text, fontSize: 12, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", resize: "vertical", borderRadius: 20 }} />
          <p style={{ fontSize: 11, color: c.muted, lineHeight: 1.5, margin: 0 }}>
            The hub sets <code style={{ color: c.text }}>class="dark"/"light"</code> and <code style={{ color: c.text }}>data-theme</code> on <code style={{ color: c.text }}>&lt;html&gt;</code>. It also exposes <code style={{ color: c.text }}>window.__story</code>. Use those values so the Theme toggle controls your prototype.
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
      </div>
    </div>
  );
}

/* ---- Media manager. Assets persist via onSetAsset(key,url) and map into every
   prototype through {{key}} tokens (logos, placeholders). An image comes from
   an upload into the media bucket or from a pasted link. Two sections keep it
   calm: the team's own library, then the built-in logos and presets. Per-image
   actions live behind a menu so the grid reads as images, not forms. ---- */
const EMPTY_DRAFT = { mode: "", name: "", url: "", file: null };
const IMAGE_ACCEPT = MEDIA_IMAGE_TYPES.join(",");
const LOGO_NOTES = { eonLogo: "Hub logo", acmeLogo: "Story logo" };

// "Team photo 2.png" -> "teamPhoto2", so a dropped file arrives with a usable token.
function keyFromFileName(fileName) {
  const words = String(fileName).replace(/\.[^.]+$/, "").split(/[^a-zA-Z0-9]+/).filter(Boolean);
  return words.map((word, index) => (index ? word[0].toUpperCase() : word[0].toLowerCase()) + word.slice(1)).join("") || "image";
}

function formatBytes(bytes) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const dragsFiles = (event) => [...(event.dataTransfer?.types || [])].includes("Files");
const isUploadedMedia = (url) => /\/storage\/v1\/object\/public\/media\/library\//.test(url || "");

export function MediaManager({ c, assets, onSetAsset, onDeleteAsset }) {
  const [ph, setPh] = useState({ w: 320, h: 180, label: "", bg: "#E5E7EB", fg: "#94A3B8", name: "" });
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [adding, setAdding] = useState(false);
  const [pageDrag, setPageDrag] = useState(false);
  const [busyKey, setBusyKey] = useState("");
  const [copied, setCopied] = useState("");
  const [mediaError, setMediaError] = useState("");
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [deletingKey, setDeletingKey] = useState("");
  const addFileRef = useRef(null);
  const replaceFileRef = useRef(null);
  const replaceKeyRef = useRef("");
  const stagedPreview = useMemo(() => (draft.file ? URL.createObjectURL(draft.file) : ""), [draft.file]);
  useEffect(() => () => { if (stagedPreview) URL.revokeObjectURL(stagedPreview); }, [stagedPreview]);

  // A file dropped outside a drop target would open in the tab and leave the hub.
  useEffect(() => {
    const guard = (event) => {
      if (!dragsFiles(event) || event.defaultPrevented) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "none";
    };
    window.addEventListener("dragover", guard);
    window.addEventListener("drop", guard);
    return () => {
      window.removeEventListener("dragover", guard);
      window.removeEventListener("drop", guard);
    };
  }, []);

  const field = { height: 36, background: c.raised, borderColor: c.border, color: c.text, fontSize: 13, borderRadius: 999 };
  const panel = { background: c.panel, border: `1px solid ${c.border}`, borderRadius: 16, padding: 18 };
  const btn = { height: 34, padding: "0 12px", flexShrink: 0, borderRadius: 999, border: `1px solid ${c.border}`, background: c.raised, color: c.muted, cursor: "pointer", fontSize: 12 };
  const copy = async (text, id) => { try { await navigator.clipboard.writeText(text); setCopied(id); setTimeout(() => setCopied(""), 1200); } catch (e) { /* clipboard blocked */ } };

  const cleanKey = (s) => s.trim().replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/(^-|-$)/g, "");
  const phData = MEDIA.placeholder(ph.w, ph.h, ph.label, ph.bg, ph.fg);
  const saveAssetUrl = (key, value) => {
    const candidate = value.trim();
    if (!candidate) {
      setMediaError("");
      if (onDeleteAsset) onDeleteAsset(key).catch((error) => {
        setMediaError(error?.message || "The media item could not be removed.");
      });
      else onSetAsset(key, "");
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
  const stageFile = (file) => {
    if (!file) return;
    const problem = mediaFileProblem(file);
    setMediaError(problem);
    if (problem) return;
    setDraft((current) => ({ ...current, mode: "file", file, url: "", name: current.name.trim() || keyFromFileName(file.name) }));
  };
  const addImage = async () => {
    const key = cleanKey(draft.name);
    if (!key || adding) return;
    if (draft.mode === "link") {
      if (draft.url.trim() && saveAssetUrl(key, draft.url)) setDraft(EMPTY_DRAFT);
      return;
    }
    setAdding(true);
    setMediaError("");
    try {
      await onSetAsset(key, await uploadMedia(draft.file));
      setDraft(EMPTY_DRAFT);
    } catch (error) {
      setMediaError(error?.message || "The image could not be uploaded. Try again.");
    } finally {
      setAdding(false);
    }
  };
  // Uploading onto an image swaps it in every prototype that uses its token.
  const replaceWithFile = async (key, file) => {
    if (!file || busyKey) return;
    const problem = mediaFileProblem(file);
    setMediaError(problem);
    if (problem) return;
    setBusyKey(key);
    try {
      await onSetAsset(key, await uploadMedia(file));
    } catch (error) {
      setMediaError(error?.message || "The image could not be uploaded. Try again.");
    } finally {
      setBusyKey("");
    }
  };
  const removeAsset = async (key) => {
    setDeletingKey(key);
    setMediaError("");
    try {
      if (onDeleteAsset) await onDeleteAsset(key);
      else await onSetAsset(key, "");
      setDeleteCandidate(null);
    } catch (error) {
      setMediaError(error?.message || "The media item could not be deleted. Try again.");
      throw error;
    } finally {
      setDeletingKey("");
    }
  };

  // A saved asset under a logo or preset key overrides it; Reset clears that.
  const logoHtml = { eonLogo: MEDIA.logos.eon(c.text, c.brand), acmeLogo: MEDIA.logos.acme(40, 10, "#4F46E5") };
  const safeAsset = (key) => safeMediaUrl(assets[key]);
  const builtIn = [
    ...Object.entries(LOGO_NOTES).map(([key, note]) => ({
      key, url: assets[key] || "", linkUrl: safeAsset(key), previewSrc: safeAsset(key),
      previewHtml: assets[key] ? null : logoHtml[key], note: assets[key] ? `${note} · replaced` : note,
    })),
    ...Object.keys(PRESET_MEDIA).map((key) => ({
      key, url: assets[key] || "", linkUrl: safeAsset(key) || PRESET_MEDIA[key],
      previewSrc: safeAsset(key) || PRESET_MEDIA[key], note: assets[key] ? "Replaced" : "Default",
    })),
  ];
  const library = Object.keys(assets)
    .filter((key) => !LOGO_NOTES[key] && !PRESET_MEDIA[key] && assets[key])
    .sort((left, right) => left.localeCompare(right))
    .map((key) => ({
      key, url: assets[key], linkUrl: safeAsset(key), previewSrc: safeAsset(key), removable: true,
      note: isUploadedMedia(assets[key]) ? "Uploaded" : "Link",
    }));
  const newKey = cleanKey(draft.name);
  const replacesKey = Boolean(newKey) && Boolean(assets[newKey] || LOGO_NOTES[newKey] || PRESET_MEDIA[newKey]);
  const canAdd = Boolean(newKey) && Boolean(draft.mode === "file" ? draft.file : draft.url.trim()) && !adding;

  const tile = (item) => (
    <MediaTile key={item.key} c={c} item={item}
      busy={busyKey === item.key || deletingKey === item.key}
      copied={copied === `tok-${item.key}`}
      onCopyToken={() => copy(`{{${item.key}}}`, `tok-${item.key}`)}
      onCopyLink={() => copy(item.linkUrl, `link-${item.key}`)}
      onPickFile={() => { replaceKeyRef.current = item.key; replaceFileRef.current?.click(); }}
      onDropFile={(file) => replaceWithFile(item.key, file)}
      onSaveLink={(value) => { if (value !== item.url) saveAssetUrl(item.key, value); }}
      onRemove={() => (item.removable ? setDeleteCandidate({ key: item.key, label: item.key }) : removeAsset(item.key).catch(() => {}))} />
  );

  return (
    <>
    <div className="eon-media-page"
      onDragOver={(event) => { if (!dragsFiles(event)) return; event.preventDefault(); setPageDrag(true); }}
      onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setPageDrag(false); }}
      onDrop={(event) => { if (!dragsFiles(event)) return; event.preventDefault(); setPageDrag(false); stageFile(event.dataTransfer.files?.[0]); }}>
      <header className="eon-media-head">
        <p style={{ color: c.muted }}>Use any image in a prototype as <code style={{ color: c.text }}>{"{{name}}"}</code>. Replace it here and every prototype updates.</p>
        <div className="eon-media-head-actions">
          <button type="button" className="eon-buttonish eon-secondary-button" onClick={() => { setMediaError(""); setDraft({ ...EMPTY_DRAFT, mode: "link" }); }}
            style={{ borderColor: c.border, color: c.secondary, background: "transparent" }}>
            <Link2 size={15} aria-hidden="true" /> Paste link
          </button>
          <Button type="button" className="eon-buttonish" onClick={() => addFileRef.current?.click()}
            style={{ minHeight: 40, background: c.primary, color: c.primaryText, borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
            <Upload size={15} aria-hidden="true" /> Upload image
          </Button>
        </div>
      </header>

      {draft.mode && (
        <form className="eon-media-draft" onSubmit={(event) => { event.preventDefault(); addImage(); }}
          style={{ background: c.panel, borderColor: c.border }}>
          {draft.mode === "file" && <img src={stagedPreview} alt="" className="eon-media-draft-thumb" style={{ background: c.bg }} />}
          <div className="eon-media-draft-fields">
            {draft.mode === "file"
              ? <span className="eon-media-draft-file" style={{ color: c.muted }}><span style={{ color: c.text }}>{draft.file.name}</span> · {formatBytes(draft.file.size)}</span>
              : <Input autoFocus value={draft.url} onChange={(e) => setDraft({ ...draft, url: e.target.value })} placeholder="Paste an image link" aria-label="Image link" style={{ ...field, flex: "1 1 260px" }} />}
            <Input autoFocus={draft.mode === "file"} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="Name, e.g. teamPhoto" aria-label="Image name" style={{ ...field, flex: "0 1 220px" }} />
            <span style={{ fontSize: 12, color: c.muted }}>
              {newKey ? <>{replacesKey ? "Replaces" : "Use it as"} <code style={{ color: c.text }}>{`{{${newKey}}}`}</code></> : "Name it to get a token"}
            </span>
          </div>
          <div className="eon-media-draft-actions">
            <button type="button" className="eon-buttonish eon-secondary-button" onClick={() => { setDraft(EMPTY_DRAFT); setMediaError(""); }} disabled={adding}
              style={{ borderColor: c.border, color: c.secondary, background: "transparent" }}>Cancel</button>
            <Button type="submit" className="eon-buttonish" disabled={!canAdd}
              style={{ minHeight: 40, background: c.primary, color: c.primaryText, borderRadius: 8, fontSize: 13, fontWeight: 600, opacity: canAdd || adding ? 1 : 0.5 }}>
              {adding ? <><Loader2 className="eon-spin" size={15} aria-hidden="true" />Uploading…</> : "Add to library"}
            </Button>
          </div>
        </form>
      )}
      {mediaError && <p role="alert" className="eon-media-error"><AlertCircle size={14} aria-hidden="true" />{mediaError}</p>}

      <section className="eon-media-section" aria-labelledby="eon-media-library"
        style={{ outline: pageDrag ? `1.5px dashed ${c.brand}` : "none" }}>
        <div className="eon-media-section-head">
          <h2 id="eon-media-library" style={{ color: c.text }}>Library</h2>
          <span className="eon-count" style={{ background: c.raised, color: c.muted }}>{library.length}</span>
          {pageDrag && <span style={{ marginLeft: "auto", fontSize: 12, color: c.brand }}>Drop to add it to the library</span>}
        </div>
        {library.length ? (
          <div className="eon-media-grid">{library.map(tile)}</div>
        ) : (
          <button type="button" className="eon-dropzone eon-media-empty" onClick={() => addFileRef.current?.click()}
            style={{ borderColor: c.border, color: c.secondary }}>
            <Upload size={16} color={c.muted} aria-hidden="true" />
            No images yet. Upload one or drop it here.
          </button>
        )}
      </section>

      <section className="eon-media-section" aria-labelledby="eon-media-builtin">
        <div className="eon-media-section-head">
          <h2 id="eon-media-builtin" style={{ color: c.text }}>Built-in</h2>
          <span className="eon-count" style={{ background: c.raised, color: c.muted }}>{builtIn.length}</span>
          <span style={{ fontSize: 12, color: c.muted }}>Always available. Replace one to use your own image.</span>
        </div>
        <div className="eon-media-grid">{builtIn.map(tile)}</div>
      </section>

      <details className="eon-media-placeholder">
        <summary style={{ color: c.secondary }}>Make a placeholder image</summary>
        <div style={{ ...panel, display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 16, marginTop: 12 }}>
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

      <input ref={addFileRef} type="file" accept={IMAGE_ACCEPT} className="eon-visually-hidden" tabIndex={-1} aria-hidden="true"
        onChange={(e) => { stageFile(e.target.files?.[0]); e.target.value = ""; }} />
      <input ref={replaceFileRef} type="file" accept={IMAGE_ACCEPT} className="eon-visually-hidden" tabIndex={-1} aria-hidden="true"
        onChange={(e) => { replaceWithFile(replaceKeyRef.current, e.target.files?.[0]); e.target.value = ""; }} />
    </div>
    {deleteCandidate && (
      <DeleteMediaDialog
        c={c}
        item={deleteCandidate}
        busy={deletingKey === deleteCandidate.key}
        error={mediaError}
        onClose={() => { if (!deletingKey) setDeleteCandidate(null); }}
        onConfirm={() => removeAsset(deleteCandidate.key).catch(() => {})}
      />
    )}
    </>
  );
}

// One image: the picture, its token (click to copy), and a menu for the rest.
// Dropping a file on it replaces the image for every prototype.
function MediaTile({ c, item, busy, copied, onCopyToken, onCopyLink, onPickFile, onDropFile, onSaveLink, onRemove }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingLink, setEditingLink] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [broken, setBroken] = useState(false);
  const actionsRef = useRef(null);
  const available = Boolean(item.linkUrl);

  useEffect(() => { setBroken(false); }, [item.previewSrc]);
  useEffect(() => {
    if (!menuOpen) return undefined;
    const close = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
      if (event.type === "mousedown" && !actionsRef.current?.contains(event.target)) setMenuOpen(false);
    };
    window.addEventListener("keydown", close);
    window.addEventListener("mousedown", close);
    return () => {
      window.removeEventListener("keydown", close);
      window.removeEventListener("mousedown", close);
    };
  }, [menuOpen]);

  const act = (action) => () => { setMenuOpen(false); action(); };

  return (
    <div className="eon-media-tile" style={{ background: c.panel, borderColor: dragOver ? c.brand : c.border }}
      onDragOver={(event) => { if (!dragsFiles(event)) return; event.preventDefault(); event.stopPropagation(); setDragOver(true); }}
      onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDragOver(false); }}
      onDrop={(event) => { if (!dragsFiles(event)) return; event.preventDefault(); event.stopPropagation(); setDragOver(false); onDropFile(event.dataTransfer.files?.[0]); }}>
      <div className="eon-media-thumb" style={{ background: c.bg }}>
        {item.previewHtml
          ? <span dangerouslySetInnerHTML={{ __html: item.previewHtml }} />
          : item.previewSrc && !broken
            ? <img src={item.previewSrc} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setBroken(true)} />
            : <span className="eon-media-thumb-empty" style={{ color: c.muted }}><ImageOff size={18} aria-hidden="true" />{item.previewSrc ? "Can't load this image" : "No image yet"}</span>}
        {(busy || dragOver) && (
          <span className="eon-media-thumb-note">
            {busy ? <><Loader2 className="eon-spin" size={14} aria-hidden="true" />Working…</> : "Drop to replace"}
          </span>
        )}
      </div>
      <div className="eon-media-meta">
        {editingLink ? (
          <Input autoFocus defaultValue={item.url} placeholder="Paste an image link" aria-label={`Image link for ${item.key}`}
            onFocus={(event) => event.currentTarget.select()}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
              if (event.key === "Escape") { event.currentTarget.dataset.cancel = "true"; event.currentTarget.blur(); }
            }}
            onBlur={(event) => {
              const cancelled = event.currentTarget.dataset.cancel === "true";
              setEditingLink(false);
              if (!cancelled) onSaveLink(event.currentTarget.value.trim());
            }}
            style={{ height: 34, background: c.raised, borderColor: c.brand, color: c.text, fontSize: 12, borderRadius: 8 }} />
        ) : (
          <>
            <button type="button" className="eon-media-token" onClick={onCopyToken} disabled={!available}
              title={available ? `Copy {{${item.key}}}` : "Upload an image or paste a link to use this token"}
              aria-label={available ? `Copy token ${item.key}` : `${item.key}, no image yet`}>
              <span className="eon-media-token-name" style={{ color: copied ? c.brand : c.text }}>{copied ? "Copied" : item.key}</span>
              <span className="eon-media-token-note" style={{ color: c.muted }}>{item.note}</span>
            </button>
            <div ref={actionsRef} className="eon-media-actions">
              <button type="button" className="eon-buttonish eon-icon-button" onClick={() => setMenuOpen((open) => !open)}
                aria-label={`Actions for ${item.key}`} aria-haspopup="menu" aria-expanded={menuOpen} style={{ width: 34, height: 34, flexBasis: 34, color: c.muted }}>
                <MoreHorizontal size={16} aria-hidden="true" />
              </button>
              {menuOpen && (
                <div className="eon-story-menu eon-media-menu" role="menu" style={{ background: c.panel, boxShadow: "var(--shadow-surface)" }}>
                  <button type="button" className="eon-buttonish" role="menuitem" onClick={act(onPickFile)} style={{ color: c.text }}><Upload size={14} /> Upload image</button>
                  <button type="button" className="eon-buttonish" role="menuitem" onClick={act(() => setEditingLink(true))} style={{ color: c.text }}><Link2 size={14} /> Paste link</button>
                  <button type="button" className="eon-buttonish" role="menuitem" onClick={act(onCopyLink)} disabled={!available} style={{ color: c.text }}><Copy size={14} /> Copy image link</button>
                  {item.removable
                    ? <button type="button" className="eon-buttonish" role="menuitem" onClick={act(onRemove)} style={{ color: "#D98295" }}><Trash2 size={14} /> Delete</button>
                    : item.url && <button type="button" className="eon-buttonish" role="menuitem" onClick={act(onRemove)} style={{ color: c.text }}><RotateCcw size={14} /> Reset to default</button>}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function DeleteMediaDialog({ c, item, busy, error, onClose, onConfirm }) {
  const dialogRef = useRef(null);
  const busyRef = useRef(busy);
  const closeRef = useRef(onClose);
  busyRef.current = busy;
  closeRef.current = onClose;

  // Runs once, so a busy flip or parent render can't hand focus back mid-dialog.
  useEffect(() => {
    const previousFocus = document.activeElement;
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

  return (
    <div className="eon-modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
      <div ref={dialogRef} className="eon-modal eon-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="eon-delete-media-title" aria-describedby="eon-delete-media-body" style={{ background: c.panel, borderColor: c.border }}>
        <div className="eon-confirm-icon" style={{ background: "rgba(217,130,149,.1)", color: "#D98295" }}><Trash2 size={18} /></div>
        <h2 id="eon-delete-media-title">Delete "{item.label}"?</h2>
        <p id="eon-delete-media-body" style={{ color: c.muted }}>This removes the shared token and image for everyone. Prototypes that use <code>{`{{${item.key}}}`}</code> will no longer resolve it.</p>
        {error && <p role="alert" className="eon-copy-error"><AlertCircle size={14} />{error}</p>}
        <div className="eon-confirm-actions">
          <button autoFocus className="eon-buttonish eon-secondary-button" type="button" onClick={onClose} disabled={busy} style={{ borderColor: c.border, color: c.secondary }}>Cancel</button>
          <Button className="eon-buttonish" type="button" onClick={onConfirm} disabled={busy} style={{ minHeight: 40, background: "#D98295", color: "#210C12", borderRadius: 10, fontWeight: 650 }}>
            {busy ? <><Loader2 className="eon-spin" size={15} />Deleting…</> : <><Trash2 size={15} />Delete media</>}
          </Button>
        </div>
      </div>
    </div>
  );
}
