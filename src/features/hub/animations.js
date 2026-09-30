/* Animation assets. A prototype declares each piece of motion once as an
   inert <template data-eon-animation> demo; the Assets panel previews and
   downloads them. Prototypes written before that contract fall back to the
   @keyframes found in their CSS, shown on a sample shape.

   Plain string parsing (no DOMParser) so this also runs in Node. */

const RAW_TEXT_TAG = /<(script|style|textarea|title)(?=[\s>/])/iy;
const TEMPLATE_OPEN = /<template(?=[\s>/])/iy;
const TEMPLATE_CLOSE = /<\/template\s*>/iy;
const STYLE_OPEN = /<style(?=[\s>/])/iy;
const ATTRIBUTE = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
const KEYFRAMES = /^@(?:-webkit-|-moz-|-o-|-ms-)?keyframes\s+([\s\S]+)$/i;
const GROUP_RULES = new Set(["media", "supports", "container", "layer", "document", "-moz-document", "scope", "starting-style"]);
const ANIMATION_PROPS = new Set(["animation", "-webkit-animation"]);
const ANIMATION_NAME_PROPS = new Set(["animation-name", "-webkit-animation-name"]);
const DURATION = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:ms|s)$/i;
const EASING_KEYWORDS = new Set(["ease", "ease-in", "ease-out", "ease-in-out", "linear", "step-start", "step-end"]);
const EASING_FUNCTION = /^(?:cubic-bezier|steps|linear)\(/i;
const ENTITIES = { amp: "&", quot: "\"", apos: "'", lt: "<", gt: ">", nbsp: " " };
const DETECTED_NOTE = "Found in the prototype's CSS and shown on a sample shape.";

export function extractAnimations(html) {
  if (typeof html !== "string" || !html) return [];
  try {
    const declared = declaredAnimations(html);
    return declared.length ? declared : detectedAnimations(html);
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

function styleBlocks(html) {
  const blocks = [];
  let index = 0;
  while (index < html.length) {
    const next = html.indexOf("<", index);
    if (next === -1) break;
    if (matchAt(STYLE_OPEN, html, next)) {
      const open = tagEnd(html, next + 6);
      if (open === -1) break;
      const close = /<\/style\s*>/ig;
      close.lastIndex = open;
      const found = close.exec(html);
      blocks.push(html.slice(open, found ? found.index : html.length));
      index = found ? found.index + found[0].length : html.length;
      continue;
    }
    const skipped = skipOpaque(html, next);
    index = skipped === -1 ? next + 1 : skipped;
  }
  return blocks;
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

// Removes the common indentation. With skipFirst, the first line (already
// flush, e.g. a selector sliced from mid-line) is left out of the measure.
function dedent(text, { skipFirst = false } = {}) {
  const lines = text.replace(/\r\n?/g, "\n").replace(/\s+$/, "").split("\n");
  if (!skipFirst) while (lines.length && !lines[0].trim()) lines.shift();
  const measured = lines.slice(skipFirst ? 1 : 0).filter((line) => line.trim());
  if (!measured.length) return lines.join("\n").trim();
  const depth = measured.reduce((least, line) => Math.min(least, leadingSpace(line)), Infinity);
  return lines
    .map((line, index) => (skipFirst && index === 0 ? line : line.slice(Math.min(depth, leadingSpace(line)))))
    .join("\n")
    .trim();
}

function indent(text, spaces = "  ") {
  return text.split("\n").map((line) => (line ? spaces + line : line)).join("\n");
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
      source: "declared",
      content,
      code: dedent(content),
    });
  }
  return animations;
}

// ---- CSS scanning ---------------------------------------------------------

function skipComment(css, index) {
  const end = css.indexOf("*/", index + 2);
  return end === -1 ? css.length : end + 2;
}

function skipString(css, index) {
  const quote = css[index];
  for (let cursor = index + 1; cursor < css.length; cursor += 1) {
    if (css[cursor] === "\\") cursor += 1;
    else if (css[cursor] === quote || css[cursor] === "\n") return cursor + 1;
  }
  return css.length;
}

function matchingBrace(css, open) {
  let depth = 0;
  let index = open;
  while (index < css.length) {
    const char = css[index];
    if (char === "/" && css[index + 1] === "*") {
      index = skipComment(css, index);
      continue;
    }
    if (char === "\"" || char === "'") {
      index = skipString(css, index);
      continue;
    }
    if (char === "{") depth += 1;
    else if (char === "}" && --depth === 0) return index;
    index += 1;
  }
  return css.length;
}

function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?(?:\*\/|$)/g, " ");
}

// Start of the next statement: past whitespace, comments, and <!-- -->.
function statementStart(css, index) {
  while (index < css.length) {
    if (/\s/.test(css[index])) index += 1;
    else if (css.startsWith("/*", index)) index = skipComment(css, index);
    else if (css.startsWith("<!--", index)) index += 4;
    else if (css.startsWith("-->", index)) index += 3;
    else break;
  }
  return index;
}

// One level of `prelude { body }` blocks. Braceless statements (@import, or
// declarations inside a nested rule's body) are stepped over.
function cssBlocks(css) {
  const blocks = [];
  let start = statementStart(css, 0);
  let index = start;
  while (index < css.length) {
    const char = css[index];
    if (char === "/" && css[index + 1] === "*") {
      index = skipComment(css, index);
    } else if (char === "\"" || char === "'") {
      index = skipString(css, index);
    } else if (char === ";" || char === "}") {
      index = statementStart(css, index + 1);
      start = index;
    } else if (char === "{") {
      const close = matchingBrace(css, index);
      blocks.push({
        prelude: stripComments(css.slice(start, index)).replace(/\s+/g, " ").trim(),
        body: css.slice(index + 1, close),
        source: css.slice(start, close + 1) + (close >= css.length ? "}" : ""),
      });
      index = statementStart(css, close + 1);
      start = index;
    } else {
      index += 1;
    }
  }
  return blocks;
}

// Splits at top-level separators, ignoring those inside () and strings.
function splitTop(value, isSeparator) {
  const parts = [];
  let depth = 0;
  let start = 0;
  let index = 0;
  while (index < value.length) {
    const char = value[index];
    if (char === "\"" || char === "'") {
      index = skipString(value, index);
      continue;
    }
    if (char === "(") depth += 1;
    else if (char === ")") depth = Math.max(0, depth - 1);
    else if (depth === 0 && isSeparator(char)) {
      parts.push(value.slice(start, index));
      start = index + 1;
    }
    index += 1;
  }
  parts.push(value.slice(start));
  return parts.map((part) => part.trim()).filter(Boolean);
}

// Top-level declarations of a rule body; nested rules are dropped.
function declarations(body) {
  let flat = "";
  let index = 0;
  let segment = 0;
  while (index < body.length) {
    const char = body[index];
    if (char === "/" && body[index + 1] === "*") {
      flat += body.slice(segment, index) + " ";
      index = skipComment(body, index);
      segment = index;
    } else if (char === "\"" || char === "'") {
      index = skipString(body, index);
    } else if (char === "{") {
      // Drop the nested selector (back to the previous ";") and its block.
      const kept = flat + body.slice(segment, index);
      flat = kept.slice(0, kept.lastIndexOf(";") + 1);
      index = matchingBrace(body, index) + 1;
      segment = index;
    } else {
      index += 1;
    }
  }
  flat += body.slice(segment);
  return splitTop(flat, (char) => char === ";")
    .map((declaration) => {
      const colon = declaration.indexOf(":");
      if (colon === -1) return null;
      return {
        property: declaration.slice(0, colon).trim().toLowerCase(),
        value: declaration.slice(colon + 1).replace(/!\s*important\s*$/i, "").trim(),
      };
    })
    .filter(Boolean);
}

function unquote(value) {
  const text = value.trim();
  return /^(["']).*\1$/.test(text) ? text.slice(1, -1) : text;
}

function timing(tokens) {
  return {
    duration: tokens.find((token) => DURATION.test(token)),
    easing: tokens.find((token) => EASING_KEYWORDS.has(token.toLowerCase()) || EASING_FUNCTION.test(token)),
  };
}

// Walks rules in source order, carrying the at-rules / parent selectors that
// wrap each one so a snippet can be rebuilt valid on its own.
function walkCss(css, wrappers, visit) {
  for (const block of cssBlocks(css)) {
    const at = /^@([\w-]+)/.exec(block.prelude);
    if (at) {
      const kind = at[1].toLowerCase();
      if (KEYFRAMES.test(block.prelude)) visit.keyframes(block);
      else if (GROUP_RULES.has(kind)) walkCss(block.body, [...wrappers, block.prelude], visit);
      continue;
    }
    visit.rule(block, wrappers);
    if (block.body.includes("{")) walkCss(block.body, [...wrappers, block.prelude], visit);
  }
}

function wrapRule(text, wrappers) {
  return wrappers.reduceRight((inner, prelude) => `${prelude} {\n${indent(inner)}\n}`, text);
}

// ---- Detected -------------------------------------------------------------

function detectedAnimations(html) {
  const keyframes = new Map();
  const rules = [];

  for (const css of styleBlocks(html)) {
    walkCss(css, [], {
      keyframes(block) {
        const raw = KEYFRAMES.exec(block.prelude)[1].trim();
        const name = unquote(raw);
        if (!name) return;
        const prefixed = /^@-/.test(block.prelude);
        const existing = keyframes.get(name);
        // First wins, except an unprefixed block replaces a vendor-prefixed one.
        if (existing && (existing.prefixed === false || prefixed)) return;
        keyframes.set(name, { raw, prefixed, text: dedent(block.source, { skipFirst: true }) });
      },
      rule(block, wrappers) {
        const list = declarations(block.body);
        if (list.some(({ property }) => ANIMATION_PROPS.has(property) || ANIMATION_NAME_PROPS.has(property))) {
          rules.push({ block, wrappers, declarations: list });
        }
      },
    });
  }

  return [...keyframes.entries()].map(([name, frames]) => {
    const texts = [];
    let shorthand;
    let longhand;
    for (const rule of rules) {
      let references = false;
      for (const { property, value } of rule.declarations) {
        if (ANIMATION_PROPS.has(property)) {
          const layer = splitTop(value, (char) => char === ",")
            .map((part) => splitTop(part, (char) => /\s/.test(char)))
            .find((tokens) => tokens.some((token) => unquote(token) === name));
          if (layer) {
            references = true;
            if (!shorthand) shorthand = timing(layer);
          }
        } else if (ANIMATION_NAME_PROPS.has(property)) {
          if (splitTop(value, (char) => char === ",").some((part) => unquote(part) === name)) {
            references = true;
            if (!longhand) {
              const find = (props) => rule.declarations.find((item) => props.includes(item.property))?.value;
              const first = (list) => (list ? splitTop(list, (char) => char === ",")[0] : undefined);
              longhand = {
                duration: first(find(["animation-duration", "-webkit-animation-duration"])),
                easing: first(find(["animation-timing-function", "-webkit-animation-timing-function"])),
              };
            }
          }
        }
      }
      if (references) texts.push(wrapRule(dedent(rule.block.source, { skipFirst: true }), rule.wrappers));
    }

    const duration = shorthand?.duration || longhand?.duration || undefined;
    const easing = shorthand?.easing || longhand?.easing || undefined;
    const sample = `.eon-sample { width: 96px; height: 96px; border-radius: 20px; background: #F19DFF; animation: ${frames.raw} ${duration || "600ms"} ${easing || "ease"} both; }`;

    return {
      id: name,
      name: humanize(name),
      trigger: undefined,
      duration,
      easing,
      reducedMotion: undefined,
      source: "detected",
      content: `<style>\n${frames.text}\n${sample}\n</style>\n<div class="eon-sample" aria-hidden="true"></div>`,
      code: [frames.text, ...texts].join("\n\n"),
    };
  });
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
  const note = animation?.source === "detected" ? `\n<p class="note">${DETECTED_NOTE}</p>` : "";
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
.note { margin: 0 0 16px; color: var(--muted); }
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
<h1>${escapeHtml(name)}</h1>${list}${note}
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
