// Knowledge base entries <-> Open Knowledge Format (https://okf.md, v0.2):
// a bundle is index.md plus one markdown file per entry, each with typed YAML
// frontmatter. Shared by the hub (render, export, link checks) and hub-mcp.
//
// An entry is a kb_entries row: { slug, type, title, summary, group_path,
// status, body_md, refs, sort_order, version, updated_at }.
// A ref is "<slug>" or "<slug>#<heading-id>". Bodies link with [text](kb:<ref>).
import { tokenTableMarkdown, TOKEN_SETS } from "./tokens.js";
import { blockMarkdown, BLOCK_NAMES, trackingData } from "./blocks.js";

export const OKF_VERSION = "0.2";
export const KB_TYPES = ["concept", "howto", "reference", "decision", "metric"];
export const KB_STATUSES = ["draft", "published"];
export const SLUG = /^[a-z0-9][a-z0-9-]*$/;

export function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/[`*_~]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "section";
}

const plainHeading = (text) => text
  .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
  .replace(/[`*_~]/g, "")
  .trim();

// Walks markdown lines outside fenced code, plus each fence as one unit.
function scan(md, { onLine, onFence }) {
  const lines = String(md ?? "").split("\n");
  for (let i = 0; i < lines.length; i++) {
    const open = lines[i].match(/^(`{3,}|~{3,})\s*([^\s`]*)\s*$/);
    if (open) {
      let end = i + 1;
      while (end < lines.length && !lines[end].startsWith(open[1])) end++;
      onFence?.({ lang: open[2], body: lines.slice(i + 1, end).join("\n"), start: i, end });
      i = end;
      continue;
    }
    onLine?.(lines[i], i);
  }
}

// H2 and H3 headings with stable ids (GitHub-style -2 suffix on repeats).
// `line` is 1-based, matching the markdown parser's positions.
export function headings(md) {
  const seen = new Map();
  const out = [];
  scan(md, {
    onLine(line, i) {
      const match = line.match(/^(#{2,3})\s+(.+?)\s*#*\s*$/);
      if (!match) return;
      const text = plainHeading(match[2]);
      const base = slugify(text);
      const count = seen.get(base) ?? 0;
      seen.set(base, count + 1);
      out.push({ depth: match[1].length, text, id: count ? `${base}-${count}` : base, line: i + 1 });
    },
  });
  return out;
}

export function parseRef(ref) {
  const [slug, anchor] = String(ref).replace(/^kb:/, "").split("#");
  return { slug, anchor: anchor || null };
}

export function linkRefs(md) {
  const refs = [];
  scan(md, {
    onLine(line) {
      for (const match of line.matchAll(/\]\(kb:([a-z0-9-]+(?:#[a-z0-9-]+)?)\)/g)) refs.push(match[1]);
    },
  });
  return refs;
}

export function entryRefs(entry) {
  return [...new Set([...(entry.refs ?? []), ...linkRefs(entry.body_md)])];
}

// Every ref that points at a missing entry or a missing heading.
export function validateRefs(entries) {
  const bySlug = new Map(entries.map((entry) => [entry.slug, entry]));
  const problems = [];
  for (const entry of entries) {
    for (const ref of entryRefs(entry)) {
      const { slug, anchor } = parseRef(ref);
      const target = bySlug.get(slug);
      if (!target) problems.push({ from: entry.slug, ref, problem: "missing-entry" });
      else if (anchor && !headings(target.body_md).some((h) => h.id === anchor)) {
        problems.push({ from: entry.slug, ref, problem: "missing-section" });
      }
    }
  }
  return problems;
}

// Entries whose refs or links point at `slug`, with the anchors they use.
export function backlinks(entries, slug) {
  return entries
    .filter((entry) => entry.slug !== slug)
    .map((entry) => ({ entry, anchors: entryRefs(entry).map(parseRef).filter((ref) => ref.slug === slug).map((ref) => ref.anchor) }))
    .filter((link) => link.anchors.length);
}

export function blockFences(md) {
  const fences = [];
  scan(md, {
    onFence({ lang, body }) {
      const [kind, name] = lang.split(":");
      if ((kind === "tokens" && name) || (kind === "eon" && name)) fences.push({ kind, name, arg: body.trim() });
    },
  });
  return fences;
}

// Markdown an agent can read without the hub: token and block fences become
// tables and text, and tracking data is appended once as JSON.
export function expandForAgent(md) {
  const lines = String(md ?? "").split("\n");
  const out = [];
  const tracking = [];
  let cursor = 0;
  scan(md, {
    onFence({ lang, body, start, end }) {
      const [kind, name] = lang.split(":");
      if (kind !== "tokens" && kind !== "eon") return;
      out.push(...lines.slice(cursor, start));
      if (kind === "tokens") out.push(tokenTableMarkdown(name));
      else {
        if (name === "tracking") tracking.push(body.trim());
        out.push(blockMarkdown(name, body.trim()));
      }
      cursor = end + 1;
    },
  });
  out.push(...lines.slice(cursor));
  let text = out.join("\n");
  if (tracking.length) {
    text += `\n\n## Reference data\n\n\`\`\`json\n${JSON.stringify(trackingData(tracking), null, 2)}\n\`\`\`\n`;
  }
  return text;
}

const yamlValue = (value) => {
  if (Array.isArray(value)) return value.length ? `\n${value.map((item) => `  - ${yamlValue(item)}`).join("\n")}` : " []";
  if (typeof value === "number") return String(value);
  return JSON.stringify(String(value ?? ""));
};

export function frontmatter(fields) {
  const lines = Object.entries(fields)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${key}:${Array.isArray(value) && value.length ? yamlValue(value) : ` ${yamlValue(value).trimStart()}`}`);
  return `---\n${lines.join("\n")}\n---\n`;
}

export function okfFile(entry) {
  const head = frontmatter({
    type: entry.type,
    title: entry.title,
    slug: entry.slug,
    group: entry.group_path || undefined,
    status: entry.status,
    summary: entry.summary || undefined,
    refs: entryRefs(entry),
    version: entry.version ?? undefined,
    updated: entry.updated_at || undefined,
  });
  const summary = entry.summary ? `${entry.summary}\n\n` : "";
  return `${head}\n# ${entry.title}\n\n${summary}${expandForAgent(entry.body_md).trim()}\n`;
}

export const sortEntries = (entries) => [...entries].sort((a, b) =>
  (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.title.localeCompare(b.title));

export function okfIndex(entries, { title = "Eon Design knowledge base", version = "1.0.0", includeDrafts = false } = {}) {
  const listed = sortEntries(entries.filter((entry) => includeDrafts || entry.status !== "draft"));
  const head = frontmatter({
    title,
    version,
    okf: OKF_VERSION,
    entries: listed.map((entry) => `${entry.slug}.md`),
  });
  const groups = new Map();
  for (const entry of listed) {
    const group = entry.group_path || "General";
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(entry);
  }
  const body = [...groups].map(([group, items]) => [
    `## ${group}`,
    "",
    ...items.map((entry) => `- [${entry.title}](${entry.slug}.md) · \`${entry.type}\`${entry.summary ? ` · ${entry.summary}` : ""}`),
  ].join("\n")).join("\n\n");
  return `${head}\n# ${title}\n\nRead an entry for its full text. Refs look like \`slug#section\`.\n\n${body}\n`;
}

export function okfBundle(entries, options) {
  const listed = entries.filter((entry) => options?.includeDrafts || entry.status !== "draft");
  return [
    { path: "index.md", text: okfIndex(entries, options) },
    ...sortEntries(listed).map((entry) => ({ path: `${entry.slug}.md`, text: okfFile(entry) })),
  ];
}

// Problems that stop a save: shape, plus fences naming unknown blocks.
export function entryProblems(entry) {
  const problems = [];
  if (!SLUG.test(entry.slug ?? "")) problems.push("Slug must be lowercase letters, numbers, and dashes.");
  if (!KB_TYPES.includes(entry.type)) problems.push(`Type must be one of ${KB_TYPES.join(", ")}.`);
  if (!String(entry.title ?? "").trim()) problems.push("Title is required.");
  for (const fence of blockFences(entry.body_md)) {
    if (fence.kind === "tokens" && !TOKEN_SETS[fence.name]) problems.push(`Unknown token set "${fence.name}". Use ${Object.keys(TOKEN_SETS).join(", ")}.`);
    if (fence.kind === "eon" && !BLOCK_NAMES.includes(fence.name)) problems.push(`Unknown block "${fence.name}". Use ${BLOCK_NAMES.join(", ")}.`);
  }
  return problems;
}
