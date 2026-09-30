/* Animation assets. A prototype declares each piece of motion once as an
   inert <template data-eon-animation> demo; the Assets panel previews and
   downloads exactly those. Nothing is guessed from the prototype's CSS.

   Plain string parsing (no DOMParser) so this also runs in Node. */

const RAW_TEXT_TAG = /<(script|style|textarea|title)(?=[\s>/])/iy;
const TEMPLATE_OPEN = /<template(?=[\s>/])/iy;
const TEMPLATE_CLOSE = /<\/template\s*>/iy;
const ATTRIBUTE = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
const ENTITIES = { amp: "&", quot: "\"", apos: "'", lt: "<", gt: ">", nbsp: " " };

export function extractAnimations(html) {
  if (typeof html !== "string" || !html) return [];
  try {
    return declaredAnimations(html);
  } catch {
    return [];
  }
}

// ---- HTML scanning --------------------------------------------------------

function decodeEntities(value) {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code) => {
    if (code[0] !== "#") return Object.hasOwn(ENTITIES, code.toLowerCase()) ? ENTITIES[code.toLowerCase()] : match;
    const point = code[1] === "x" || code[1] === "X" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
    return Number.isInteger(point) && point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : match;
  });
}

// Index just past the ">" that closes the tag starting at `from`, honoring quotes.
function tagEnd(html, from) {
  let quote = null;
  for (let index = from; index < html.length; index += 1) {
    const char = html[index];
    if (quote) {
      if (char === quote) quote = null;
    } else if (char === "\"" || char === "'") {
      quote = char;
    } else if (char === ">") {
      return index + 1;
    }
  }
  return -1;
}

function parseAttributes(source) {
  const attributes = Object.create(null);
  ATTRIBUTE.lastIndex = 0;
  let match;
  while ((match = ATTRIBUTE.exec(source))) {
    const name = match[1].toLowerCase();
    if (name in attributes) continue;
    attributes[name] = decodeEntities(match[2] ?? match[3] ?? match[4] ?? "");
  }
  return attributes;
}

function matchAt(pattern, html, index) {
  pattern.lastIndex = index;
  return pattern.exec(html);
}

// Past comments and raw-text elements, so markup inside JS strings is ignored.
// Returns the index to resume from, or -1 when `index` is not one of those.
function skipOpaque(html, index) {
  if (html.startsWith("<!--", index)) {
    const end = html.indexOf("-->", index + 4);
    return end === -1 ? html.length : end + 3;
  }
  const raw = matchAt(RAW_TEXT_TAG, html, index);
  if (!raw) return -1;
  const open = tagEnd(html, index + raw[0].length);
  if (open === -1) return html.length;
  const close = new RegExp(`</${raw[1]}\\s*>`, "ig");
  close.lastIndex = open;
  const found = close.exec(html);
  return found ? found.index + found[0].length : html.length;
}

// Finds the </template> matching an already-opened template (nesting aware).
function templateClose(html, from) {
  let depth = 1;
  let index = from;
  while (index < html.length) {
    const next = html.indexOf("<", index);
    if (next === -1) break;
    const skipped = skipOpaque(html, next);
    if (skipped !== -1) {
      index = skipped;
      continue;
    }
    const close = matchAt(TEMPLATE_CLOSE, html, next);
    if (close) {
      depth -= 1;
      if (depth === 0) return { start: next, end: next + close[0].length };
      index = next + close[0].length;
      continue;
    }
    if (matchAt(TEMPLATE_OPEN, html, next)) {
      const end = tagEnd(html, next + 9);
      if (end === -1) break;
      depth += 1;
      index = end;
      continue;
    }
    index = next + 1;
  }
  return { start: html.length, end: html.length };
}

function templates(html) {
  const found = [];
  let index = 0;
  while (index < html.length) {
    const next = html.indexOf("<", index);
    if (next === -1) break;
    const skipped = skipOpaque(html, next);
    if (skipped !== -1) {
      index = skipped;
      continue;
    }
    if (!matchAt(TEMPLATE_OPEN, html, next)) {
      index = next + 1;
      continue;
    }
    const openEnd = tagEnd(html, next + 9);
    if (openEnd === -1) break;
    const attributes = parseAttributes(html.slice(next + 9, openEnd - 1));
    const close = templateClose(html, openEnd);
    found.push({ attributes, content: html.slice(openEnd, close.start) });
    index = close.end;
  }
  return found;
}

// ---- Text helpers ---------------------------------------------------------

function humanize(id) {
  const words = String(id)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_\s]+/g, " ")
    .trim()
    .toLowerCase();
  return words ? words[0].toUpperCase() + words.slice(1) : "Animation";
}

function attribute(value) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || undefined;
}

function leadingSpace(line) {
  return line.match(/^[ \t]*/)[0].length;
}

// Removes the common indentation so a demo's code reads flush left.
function dedent(text) {
  const lines = text.replace(/\r\n?/g, "\n").replace(/\s+$/, "").split("\n");
  while (lines.length && !lines[0].trim()) lines.shift();
  const measured = lines.filter((line) => line.trim());
  if (!measured.length) return lines.join("\n").trim();
  const depth = measured.reduce((least, line) => Math.min(least, leadingSpace(line)), Infinity);
  return lines.map((line) => line.slice(Math.min(depth, leadingSpace(line)))).join("\n").trim();
}

// ---- Declared -------------------------------------------------------------

function declaredAnimations(html) {
  const seen = new Set();
  const animations = [];
  for (const { attributes, content } of templates(html)) {
    if (!("data-eon-animation" in attributes)) continue;
    const id = attributes["data-eon-animation"].trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    animations.push({
      id,
      name: attribute(attributes["data-name"]) || humanize(id),
      trigger: attribute(attributes["data-trigger"]),
      duration: attribute(attributes["data-duration"]),
      easing: attribute(attributes["data-easing"]),
      reducedMotion: attribute(attributes["data-reduced-motion"]),
      content,
      code: dedent(content),
    });
  }
  return animations;
}

// ---- Documents ------------------------------------------------------------

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttribute(value) {
  return String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

export function animationStageDocument(animation, { theme = "dark" } = {}) {
  const mode = theme === "light" ? "light" : "dark";
  const background = mode === "light" ? "#F4F4F5" : "#0D0D0D";
  return `<!doctype html>
<html class="${mode}" data-theme="${mode}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
:root { color-scheme: ${mode}; }
body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: ${background}; font-family: "DM Sans", system-ui, sans-serif; }
</style>
</head>
<body>
${animation?.content || ""}
</body>
</html>`;
}

export function animationDocument(animation, { theme = "dark", prototypeTitle } = {}) {
  const name = animation?.name || "Animation";
  const title = prototypeTitle ? `${name} · ${prototypeTitle}` : name;
  const details = [
    ["Trigger", animation?.trigger],
    ["Duration", animation?.duration],
    ["Easing", animation?.easing],
    ["Reduced motion", animation?.reducedMotion],
  ].filter(([, value]) => value);
  const list = details.length
    ? `\n<dl>\n${details.map(([term, value]) => `<dt>${term}</dt><dd>${escapeHtml(value)}</dd>`).join("\n")}\n</dl>`
    : "";
  const code = animation?.code
    ? `\n<section aria-labelledby="code-title">\n<h2 id="code-title">Code</h2>\n<pre><code>${escapeHtml(animation.code)}</code></pre>\n</section>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
:root { color-scheme: light dark; --bg: #FFFFFF; --text: #18181B; --muted: #71717A; --line: #E4E4E7; --panel: #F4F4F5; }
@media (prefers-color-scheme: dark) {
  :root { --bg: #0D0D0D; --text: #F4F4F5; --muted: #A1A1AA; --line: #2E2E33; --panel: #18181B; }
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--text); font: 15px/1.5 "DM Sans", system-ui, sans-serif; }
main { max-width: 760px; margin: 0 auto; padding: 40px 20px 64px; }
h1 { margin: 0 0 16px; font-size: 24px; line-height: 1.25; font-weight: 600; }
h2 { margin: 0 0 8px; font-size: 16px; font-weight: 600; }
dl { display: grid; grid-template-columns: max-content 1fr; gap: 4px 16px; margin: 0 0 16px; }
dt { color: var(--muted); }
dd { margin: 0; }
.stage { display: block; width: 100%; height: 320px; border: 0; border-radius: 16px; background: var(--panel); }
.actions { display: flex; justify-content: flex-end; margin: 12px 0 32px; }
button { font: inherit; color: inherit; background: transparent; border: 1px solid var(--line); border-radius: 999px; padding: 6px 16px; cursor: pointer; }
button:hover { background: var(--panel); }
button:focus-visible { outline: 2px solid #F19DFF; outline-offset: 2px; }
pre { margin: 0; padding: 16px; overflow: auto; background: var(--panel); border-radius: 12px; font: 13px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace; tab-size: 2; }
</style>
</head>
<body>
<main>
<header>
<h1>${escapeHtml(name)}</h1>${list}
</header>
<iframe class="stage" id="stage" title="Animation" sandbox="allow-scripts" srcdoc="${escapeAttribute(animationStageDocument(animation, { theme }))}"></iframe>
<div class="actions"><button type="button" id="replay">Replay</button></div>${code}
</main>
<script>
(function () {
  var stage = document.getElementById("stage");
  var source = stage.getAttribute("srcdoc");
  var runs = 0;
  document.getElementById("replay").addEventListener("click", function () {
    // A changing trailing comment makes every browser reload the frame.
    runs += 1;
    stage.srcdoc = source + "<!-- " + runs + " -->";
  });
})();
</script>
</body>
</html>`;
}

function slugPart(value) {
  return String(value ?? "")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function animationFileName(animation, prototypeSlug) {
  const base = [slugPart(prototypeSlug), slugPart(animation?.id || animation?.name)]
    .filter(Boolean)
    .join("-")
    .replace(/-+/g, "-")
    .slice(0, 120)
    .replace(/-+$/, "");
  return `${base || "animation"}.html`;
}

// ---- ZIP (store, no compression) -----------------------------------------

let crcTable;

function crc32(bytes) {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n += 1) {
      let c = n;
      for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let index = 0; index < bytes.length; index += 1) {
    crc = crcTable[(crc ^ bytes[index]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date) {
  const year = Math.max(1980, Math.min(2107, date.getFullYear()));
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

function entryName(name) {
  const clean = String(name || "")
    .replace(/\\/g, "/")
    .split("/")
    .filter((part) => part && part !== "." && part !== "..")
    .join("/");
  return clean || "file";
}

function uniqueNames(files) {
  const taken = new Set();
  return files.map((file) => {
    const name = entryName(file?.name);
    const slash = name.lastIndexOf("/");
    const dot = name.lastIndexOf(".");
    const split = dot > slash + 1 ? dot : name.length;
    let candidate = name;
    for (let count = 2; taken.has(candidate.toLowerCase()); count += 1) {
      candidate = `${name.slice(0, split)}-${count}${name.slice(split)}`;
    }
    taken.add(candidate.toLowerCase());
    return candidate;
  });
}

export function zipFiles(files) {
  const list = Array.isArray(files) ? files : [];
  const encoder = new TextEncoder();
  const { time, date } = dosDateTime(new Date());
  const names = uniqueNames(list);

  const entries = list.map((file, index) => {
    const content = file?.content;
    const data = content instanceof Uint8Array ? content : encoder.encode(String(content ?? ""));
    return { name: encoder.encode(names[index]), data, crc: crc32(data) };
  });

  const localSize = entries.reduce((total, entry) => total + 30 + entry.name.length + entry.data.length, 0);
  const centralSize = entries.reduce((total, entry) => total + 46 + entry.name.length, 0);
  const output = new Uint8Array(localSize + centralSize + 22);
  const view = new DataView(output.buffer);
  let offset = 0;

  const u16 = (value) => {
    view.setUint16(offset, value, true);
    offset += 2;
  };
  const u32 = (value) => {
    view.setUint32(offset, value, true);
    offset += 4;
  };
  const bytes = (value) => {
    output.set(value, offset);
    offset += value.length;
  };

  // Bit 11: names are UTF-8.
  const FLAGS = 0x0800;

  for (const entry of entries) {
    entry.offset = offset;
    u32(0x04034b50);
    u16(20);
    u16(FLAGS);
    u16(0);
    u16(time);
    u16(date);
    u32(entry.crc);
    u32(entry.data.length);
    u32(entry.data.length);
    u16(entry.name.length);
    u16(0);
    bytes(entry.name);
    bytes(entry.data);
  }

  const centralStart = offset;
  for (const entry of entries) {
    u32(0x02014b50);
    u16(20);
    u16(20);
    u16(FLAGS);
    u16(0);
    u16(time);
    u16(date);
    u32(entry.crc);
    u32(entry.data.length);
    u32(entry.data.length);
    u16(entry.name.length);
    u16(0);
    u16(0);
    u16(0);
    u16(0);
    u32(0);
    u32(entry.offset);
    bytes(entry.name);
  }

  const centralLength = offset - centralStart;
  u32(0x06054b50);
  u16(0);
  u16(0);
  u16(entries.length);
  u16(entries.length);
  u32(centralLength);
  u32(centralStart);
  u16(0);

  return output;
}
