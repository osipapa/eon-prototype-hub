import { useState, useMemo, useEffect, useRef, memo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FigmaIcon, LinearIcon } from "@/components/BrandIcons";
import {
  ExternalLink, ChevronDown, Upload, Trash2, Copy, Check, AlertCircle, Loader2, LayoutGrid,
} from "lucide-react";
import { VIEWPORTS, MEDIA, PRESET_MEDIA, renderStory, currentArgs, stateCombos, safeMediaUrl } from "./prototypes";
import { buildSetupPrompt } from "./setupPrompt";

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
   prototype through {{key}} tokens (logos, placeholders). ---- */
export function MediaManager({ c, assets, onSetAsset, onDeleteAsset }) {
  const [ph, setPh] = useState({ w: 320, h: 180, label: "", bg: "#E5E7EB", fg: "#94A3B8", name: "" });
  const [img, setImg] = useState({ name: "", url: "" });
  const [copied, setCopied] = useState("");
  const [mediaError, setMediaError] = useState("");
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [deletingKey, setDeletingKey] = useState("");
  const field = { height: 34, background: c.raised, borderColor: c.border, color: c.text, fontSize: 12, borderRadius: 999 };
  const panel = { background: c.panel, border: `1px solid ${c.border}`, borderRadius: 16, padding: 18 };
  const btn = { height: 34, padding: "0 12px", flexShrink: 0, borderRadius: 999, border: `1px solid ${c.border}`, background: c.raised, color: c.muted, cursor: "pointer", fontSize: 12 };
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
  const addImage = () => {
    const key = cleanKey(img.name);
    if (!key || !img.url.trim()) return;
    if (saveAssetUrl(key, img.url)) setImg({ name: "", url: "" });
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
          <button
            className="eon-buttonish"
            onClick={() => item.removable ? setDeleteCandidate(item) : removeAsset(item.key).catch(() => {})}
            disabled={deletingKey === item.key}
            title={item.removable ? "Delete from library" : "Reset to default"}
            aria-label={`${item.removable ? "Delete" : "Reset"} ${item.label}`}
            style={{ ...btn, height: 30, minWidth: 40, padding: "0 8px", marginLeft: "auto", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5, color: item.removable ? "#D98295" : c.muted }}
          >
            {deletingKey === item.key
              ? <Loader2 className="eon-spin" size={13} aria-hidden="true" />
              : item.removable && <Trash2 size={13} aria-hidden="true" />}
            {item.removable ? "Delete" : "Reset"}
          </button>
        )}
      </div>
      <Input key={`${item.key}-${item.url}`} defaultValue={item.url} placeholder="Paste image URL to replace" aria-label={`Image URL for ${item.key}`}
        onBlur={(e) => { const v = e.target.value.trim(); if (v !== item.url) saveAssetUrl(item.key, v); }} style={field} />
    </div>
  );

  return (
    <>
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

function DeleteMediaDialog({ c, item, busy, error, onClose, onConfirm }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const previousFocus = document.activeElement;
    const onKeyDown = (event) => {
      if (event.key === "Escape" && !busy) onClose();
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
  }, [busy, onClose]);

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
