/* Animation assets. A prototype declares each piece of motion once as an
   inert <template data-eon-animation> demo; the Assets panel and the hosted
   Animations page play exactly those. Nothing is guessed from the CSS.

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

// ---- Stage ----------------------------------------------------------------

// The page an animation plays in: its demo alone, centred, in the given theme.
// Used as an iframe srcdoc in the Assets panel and on the Animations page.
//
// A srcdoc frame can parse before its parent has laid it out, so a demo that
// measures itself as it starts (a canvas sized from the viewport, say) would
// see 0x0 and draw nothing. The demo waits in an inert template until the
// frame has a size, then goes in; its scripts are recreated so they run.
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
<template id="eon-demo">${animation?.content || ""}</template>
<script>
(function () {
  function start() {
    if (!window.innerWidth || !window.innerHeight) { setTimeout(start, 30); return; }
    var source = document.getElementById("eon-demo");
    var demo = source.content.cloneNode(true);
    demo.querySelectorAll("script").forEach(function (inert) {
      var live = document.createElement("script");
      for (var i = 0; i < inert.attributes.length; i++) live.setAttribute(inert.attributes[i].name, inert.attributes[i].value);
      live.textContent = inert.textContent;
      inert.replaceWith(live);
    });
    source.replaceWith(demo);
  }
  start();
})();
</script>
</body>
</html>`;
}

// The hosted Animations page for a prototype, or one animation on it.
export function animationsHref(slug, id) {
  return `#/animations/${encodeURIComponent(slug || "")}${id ? `/${encodeURIComponent(id)}` : ""}`;
}
