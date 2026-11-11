// Static checks against the hub's setup guide (src/features/hub/setupPrompt.js):
// everything that can be read from the HTML alone. Contrast, overflow, and how
// each theme and state actually look need a real render and aren't covered.
import { lineAt } from "./lib.ts";
import { inlineMedia, isVideoUrl, kb, PRESET_MEDIA_KEYS } from "./media.ts";

export const VIEWPORT_KEYS = ["desktop", "laptop", "tablet", "mobile"];
export const CONTROL_KEY = /^[a-z][a-z0-9_-]*$/;
export const MAX_STATES = 16;
const ANIMATION_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const LARGE_INLINE_BYTES = 50 * 1024;
const MAX_HTML_BYTES = 2 * 1024 * 1024;

export type Control = { key: string; label?: string; options: string[] };
export type Defaults = Record<string, unknown>;
export type Finding = { level: "error" | "warning"; section: string; message: string; line?: number };
export type Config = {
  present: boolean; index?: number; error?: string;
  controls?: unknown; defaults?: unknown; viewport?: unknown;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

// The eon-config block, matched the way the hub's parsePrototypeConfig matches it.
export function readConfig(html: string): Config {
  const match = /<script[^>]*id=["']eon-config["'][^>]*>([\s\S]*?)<\/script>/i.exec(html);
  if (!match) return { present: false };
  let value: unknown;
  try {
    value = JSON.parse(match[1].trim());
  } catch (error) {
    return { present: true, index: match.index, error: `eon-config isn't valid JSON (no comments or trailing commas): ${(error as Error).message}` };
  }
  if (!isObject(value)) return { present: true, index: match.index, error: "eon-config must be a JSON object." };
  return { present: true, index: match.index, controls: value.controls, defaults: value.defaults, viewport: value.viewport };
}

// The controls the hub keeps from eon-config (it drops malformed ones).
export function fileControls(config: Config): Control[] {
  return Array.isArray(config.controls)
    ? config.controls.filter((c) => c && c.key && Array.isArray(c.options)) as Control[]
    : [];
}

export const combinations = (controls: Control[]) =>
  controls.length ? controls.reduce((total, c) => total * Math.max(1, c.options.length), 1) : 0;

// What the hub renders: saved controls win, else the file's; saved defaults
// sit on top of the file's (effectiveStory in src/features/hub/prototypes.js).
export function effectiveStates(savedControls: unknown, savedDefaults: unknown, config: Config) {
  const saved = Array.isArray(savedControls) ? savedControls as Control[] : [];
  const file = fileControls(config);
  const controls = saved.length ? saved : file;
  return {
    source: saved.length ? "hub" : file.length ? "file" : "none",
    controls,
    defaults: { ...(isObject(config.defaults) ? config.defaults : {}), ...(isObject(savedDefaults) ? savedDefaults : {}) },
    combinations: combinations(controls),
  };
}

export function controlProblems(controls: unknown): string[] {
  if (!Array.isArray(controls)) return ["controls must be an array."];
  const problems: string[] = [];
  const keys = new Set<string>();
  controls.forEach((control, i) => {
    const at = `controls[${i}]`;
    if (!isObject(control)) { problems.push(`${at} must be an object with key, label, and options.`); return; }
    const key = control.key;
    if (typeof key !== "string" || !CONTROL_KEY.test(key)) problems.push(`${at}.key "${key}" must match ${CONTROL_KEY}.`);
    else if (keys.has(key)) problems.push(`${at}.key "${key}" is used twice.`);
    else keys.add(key);
    if (control.label !== undefined && typeof control.label !== "string") problems.push(`${at}.label must be a string.`);
    const options = control.options;
    if (!Array.isArray(options) || !options.length) { problems.push(`${at}.options must be a non-empty array.`); return; }
    if (options.some((o) => typeof o !== "string" || !o.trim())) problems.push(`${at}.options must be non-empty strings.`);
    else if (new Set(options).size !== options.length) problems.push(`${at}.options has a duplicate.`);
  });
  const valid = controls.filter((c) => isObject(c) && Array.isArray(c.options)) as Control[];
  const total = combinations(valid);
  if (total > MAX_STATES) problems.push(`${total} state combinations; the hub's grid shows at most ${MAX_STATES}.`);
  return problems;
}

export function defaultsProblems(controls: Control[], defaults: unknown): string[] {
  if (defaults === undefined || defaults === null) return [];
  if (!isObject(defaults)) return ["defaults must be an object of control key to option."];
  return Object.entries(defaults).flatMap(([key, value]) => {
    const control = controls.find((c) => c.key === key);
    if (!control) return [`defaults.${key} has no matching control.`];
    return control.options.includes(value as string) ? [] : [`defaults.${key} "${value}" isn't one of its options (${control.options.join(", ")}).`];
  });
}

type Template = { index: number; attrs: Record<string, string>; body: string };

const TEMPLATE = /<template\b([^>]*)>([\s\S]*?)<\/template\s*>/gi;
const ATTRIBUTE = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

function animationTemplates(html: string): Template[] {
  const out: Template[] = [];
  for (const match of html.matchAll(TEMPLATE)) {
    const attrs: Record<string, string> = {};
    for (const attr of match[1].matchAll(ATTRIBUTE)) {
      attrs[attr[1].toLowerCase()] ??= attr[2] ?? attr[3] ?? attr[4] ?? "";
    }
    if ("data-eon-animation" in attrs) out.push({ index: match.index!, attrs, body: match[2] });
  }
  return out;
}

// Blanks animation demos (keeping line breaks, so indexes still line up):
// page-level rules don't apply inside them.
const withoutTemplates = (html: string) =>
  html.replace(TEMPLATE, (block, attrs: string) => /data-eon-animation/i.test(attrs) ? block.replace(/[^\n]/g, " ") : block);

export type CheckContext = { savedControls?: unknown; savedDefaults?: unknown; assets?: Record<string, string> };

export function checkPrototype(html: string, ctx: CheckContext = {}): Finding[] {
  const findings: Finding[] = [];
  const add = (level: Finding["level"], section: string, message: string, index?: number) =>
    findings.push({ level, section, message, ...(index !== undefined && index >= 0 ? { line: lineAt(html, index) } : {}) });
  const page = withoutTemplates(html);
  const templates = animationTemplates(html);

  // 1 Deliverable
  const start = html.replace(/^﻿/, "").trimStart();
  if (start.startsWith("```")) add("error", "1 Deliverable", "Remove the Markdown fence: the file must be raw HTML.");
  else if (!/^<!doctype html>/i.test(start)) add("error", "1 Deliverable", "Start the file with <!doctype html>.");
  if (!/<\/html>\s*$/i.test(html)) add("warning", "1 Deliverable", "End the file with </html>, with nothing after it.");
  if (!/<meta\b[^>]*\bcharset\s*=\s*["']?utf-8/i.test(html)) add("warning", "1 Deliverable", 'Add <meta charset="utf-8">.');
  if (!/<meta\b[^>]*\bname\s*=\s*["']?viewport/i.test(html)) {
    add("warning", "1 Deliverable", 'Add <meta name="viewport" content="width=device-width, initial-scale=1">.');
  }
  const size = new TextEncoder().encode(html).length;
  if (size > MAX_HTML_BYTES) add("error", "1 Deliverable", `The file is ${kb(size)}, over the hub's 2 MB limit.`);
  const local = [...page.matchAll(/<(?:img|script|link|source|video|audio|iframe)\b[^>]*?\s(?:src|href)\s*=\s*["']([^"']+)["']/gi)]
    .filter((m) => !/^(?:https?:|data:|blob:|about:|mailto:|tel:|javascript:|#|\/\/|\{\{)/i.test(m[1].trim()) && !m[1].includes("${"));
  if (local.length) {
    const names = [...new Set(local.map((m) => m[1]))].slice(0, 3).join(", ");
    add("error", "1 Deliverable", `References local files (${names}), which don't exist in the hub. Inline them, use HTTPS, or use {{media tokens}}.`, local[0].index);
  }

  // 2 Theming
  if (!/data-theme|data-color-mode|\.dark\b|\.light\b|__story|prefers-color-scheme/i.test(page)) {
    add("warning", "2 Theming", "No theme hooks: style both themes with html.dark / [data-theme] selectors or window.__story.theme.");
  }

  // 3 States
  const config = readConfig(html);
  const saved = Array.isArray(ctx.savedControls) ? ctx.savedControls as Control[] : [];
  if (config.error) add("error", "3 States", config.error, config.index);
  else if (!config.present && !saved.length) {
    add("warning", "3 States", 'No eon-config block, so the hub shows no states or viewport. Add <script type="application/json" id="eon-config">{"viewport": "...", "controls": [...], "defaults": {...}}</script>.');
  }
  if (config.present && !config.error) {
    if (config.viewport === undefined) {
      add("warning", "3 States", `eon-config has no "viewport" (${VIEWPORT_KEYS.join(", ")}), so the hub can't open the right frame.`, config.index);
    } else if (!VIEWPORT_KEYS.includes(config.viewport as string)) {
      add("error", "3 States", `eon-config viewport "${config.viewport}" isn't one of ${VIEWPORT_KEYS.join(", ")}.`, config.index);
    }
    if (config.controls !== undefined) {
      for (const problem of controlProblems(config.controls)) add("error", "3 States", `eon-config: ${problem}`, config.index);
    }
    for (const problem of defaultsProblems(fileControls(config), config.defaults)) add("error", "3 States", `eon-config: ${problem}`, config.index);
  }
  const fromFile = fileControls(config);
  const shape = (controls: Control[]) => JSON.stringify(controls.map((c) => [c.key, c.options]));
  if (saved.length && fromFile.length && shape(saved) !== shape(fromFile)) {
    const list = (controls: Control[]) => controls.map((c) => `${c.key}: ${c.options.join("/")}`).join("; ");
    add("warning", "3 States", `States saved in the hub (${list(saved)}) override this file's eon-config (${list(fromFile)}). Call set_states with use_file: true to use the file's.`, config.index);
  }
  if (isObject(ctx.savedDefaults) && isObject(config.defaults)) {
    const fileDefaults = config.defaults;
    const differing = Object.entries(ctx.savedDefaults).filter(([key, value]) => key in fileDefaults && fileDefaults[key] !== value);
    if (differing.length) {
      const list = differing.map(([key, value]) => `${key}=${value} (file: ${fileDefaults[key]})`).join(", ");
      add("warning", "3 States", `Defaults saved in the hub override the file's: ${list}.`, config.index);
    }
  }
  const effective = effectiveStates(ctx.savedControls, ctx.savedDefaults, config);
  if (effective.controls.length && !/__story/.test(page)) {
    const unread = effective.controls
      .filter((c) => !new RegExp(`data-${c.key.replace(/[-]/g, "\\-")}\\b`).test(page))
      .map((c) => c.key);
    if (unread.length) {
      add("warning", "3 States", `Nothing reads window.__story or [data-${unread[0]}], so switching ${unread.join(", ")} changes nothing.`);
    }
  }

  // 4 Media
  const assets = ctx.assets ?? {};
  const known = new Set([...PRESET_MEDIA_KEYS, ...Object.keys(assets)]);
  const unknown = new Map<string, number>();
  for (const match of page.matchAll(/\{\{\s*([^}]+?)\s*\}\}/g)) {
    const token = match[1].trim();
    if (/^placeholder:\d+x\d+(?::.*)?$/i.test(token)) continue;
    if (!known.has(token)) {
      if (!unknown.has(token)) unknown.set(token, match.index!);
      continue;
    }
    if (assets[token] && isVideoUrl(assets[token])) {
      const before = page.slice(Math.max(0, match.index! - 300), match.index);
      if (/<img\b[^>]*$/i.test(before) || /url\(\s*["']?$/i.test(before)) {
        add("warning", "4 Media", `{{${token}}} is a video: use <video src="{{${token}}}" autoplay muted loop playsinline>, not <img> or CSS url().`, match.index);
      }
    }
  }
  for (const [token, index] of unknown) {
    add("error", "4 Media", `{{${token}}} isn't a saved media key or preset, so it renders as a broken link. Save it with upload_media or use an existing key.`, index);
  }
  const resolved = page.search(/https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\/media\/library\/|picsum\.photos\/seed\/eon-/i);
  if (resolved >= 0) add("warning", "4 Media", "Uses a resolved Media library URL: keep the {{key}} token so library changes reach this prototype.", resolved);
  for (const item of inlineMedia(page).filter((i) => i.bytes >= LARGE_INLINE_BYTES)) {
    const copies = item.copies > 1 ? `, stored ${item.copies} times` : "";
    findings.push({
      level: "warning", section: "4 Media", line: item.line,
      message: `Inline ${item.type} of ${kb(item.bytes)}${copies}: move it to the Media library with extract_media.`,
    });
  }

  // 5 Maps
  const mapbox = page.search(/mapbox-gl/i);
  if (mapbox >= 0) {
    if (!/workerClass/.test(page)) {
      add("error", "5 Maps", "Set mapboxgl.workerClass to classic workers before creating the map: module workers can't start in the hub's frame, so the map never loads.", mapbox);
    }
    const geolocation = page.search(/navigator\.geolocation/);
    if (geolocation >= 0) add("warning", "5 Maps", "The frame has no geolocation: use fixed mock coordinates.", geolocation);
  }

  // 6 Layout: safe areas in the iPhone mockup
  if (config.viewport === "mobile") {
    if (!/safe-area-inset-top/.test(page)) {
      add("warning", "6 Layout", "Nothing uses env(safe-area-inset-top): pad top content with max(59px, env(safe-area-inset-top)) so the Dynamic Island doesn't cover it.");
    }
    if (!/safe-area-inset-bottom/.test(page)) {
      add("warning", "6 Layout", "Nothing uses env(safe-area-inset-bottom): keep controls clear of the home indicator with max(34px, env(safe-area-inset-bottom)).");
    }
    const clock = page.search(/>\s*9:41\s*</);
    if (clock >= 0) add("warning", "6 Layout", "Looks like a painted status bar (9:41): remove it, the hub's iPhone mockup supplies one.", clock);
  }

  // 7 Accessibility
  const motion = page.search(/@keyframes|\banimation(?:-name)?\s*:|\.animate\s*\(/i);
  if (motion >= 0 && !/prefers-reduced-motion/i.test(page)) {
    add("warning", "7 Accessibility", "Animates without a prefers-reduced-motion fallback.", motion);
  }
  const noAlt = [...page.matchAll(/<img\b(?![^>]*\balt\s*=)[^>]*>/gi)];
  if (noAlt.length) add("warning", "7 Accessibility", `${noAlt.length} <img> without alt text.`, noAlt[0].index);
  if (/<(?:button|input|select|textarea)\b/i.test(page) && !/:focus-visible/.test(page)) {
    add("warning", "7 Accessibility", "No :focus-visible styles, so keyboard focus is invisible.");
  }

  // 8 Animations
  if (motion >= 0 && !templates.length) {
    add("warning", "8 Animations", "The prototype animates but declares no <template data-eon-animation> demos, so the Assets panel shows none.", motion);
  }
  const ids = new Set<string>();
  for (const template of templates) {
    const id = template.attrs["data-eon-animation"];
    if (!ANIMATION_ID.test(id)) add("error", "8 Animations", `Animation id "${id}" must be kebab-case.`, template.index);
    else if (ids.has(id)) add("error", "8 Animations", `Animation id "${id}" is used twice.`, template.index);
    ids.add(id);
    if (!template.attrs["data-name"]) add("warning", "8 Animations", `Animation "${id}" has no data-name.`, template.index);
    if (!template.attrs["data-trigger"]) add("warning", "8 Animations", `Animation "${id}" has no data-trigger (what starts it).`, template.index);
    if (/\{\{/.test(template.body)) add("error", "8 Animations", `Animation "${id}" uses a {{media token}}: demos must be self-contained.`, template.index);
    if (/prefers-reduced-motion/i.test(template.body)) {
      add("warning", "8 Animations", `Animation "${id}" checks prefers-reduced-motion, but demos always play: describe it in data-reduced-motion instead.`, template.index);
    }
  }

  // 9 Sandbox
  const storage = page.search(/\b(?:localStorage|sessionStorage|indexedDB)\b|document\.cookie|serviceWorker/);
  if (storage >= 0) {
    add("warning", "9 Sandbox", "Uses browser storage, which throws in the hub's opaque-origin frame: keep state in memory, or wrap it in try/catch.", storage);
  }
  const parent = page.search(/\b(?:top|parent)\.(?:document|location)\b/);
  if (parent >= 0) add("warning", "9 Sandbox", "Reaches into the parent page (top/parent), which the sandbox blocks.", parent);

  return findings.sort((a, b) =>
    (a.level === b.level ? 0 : a.level === "error" ? -1 : 1) || (a.line ?? 0) - (b.line ?? 0));
}

export function formatFindings(findings: Finding[]): string {
  const errors = findings.filter((f) => f.level === "error");
  const warnings = findings.filter((f) => f.level === "warning");
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
  const row = (f: Finding) => `- [§${f.section}]${f.line ? ` line ${f.line}` : ""}: ${f.message}`;
  const lines = [`${plural(errors.length, "error")}, ${plural(warnings.length, "warning")} against the hub guide.`];
  if (errors.length) lines.push("", "Errors:", ...errors.map(row));
  if (warnings.length) lines.push("", "Warnings:", ...warnings.map(row));
  lines.push("", "Not covered here (needs a real render): contrast, overflow, and how each theme, state, and viewport looks.");
  return lines.join("\n");
}
