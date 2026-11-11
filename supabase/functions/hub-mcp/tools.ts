// Tool handlers for the hub MCP. All I/O goes through PrototypeStore and
// MediaStore, so the compare-and-swap logic is tested against fakes.
import { applyEdit, applyEdits, contextAround, type EditSpec, pageLines, searchLines, sha256Hex } from "./lib.ts";
import {
  checkPrototype, type Control, controlProblems, defaultsProblems, effectiveStates, fileControls, formatFindings, readConfig,
  VIEWPORT_KEYS,
} from "./check.ts";
import {
  decodeBase64, extensionFor, type InlineMedia, inlineMedia, kb, MAX_VIDEO_BYTES, MEDIA_KEY, mediaProblem,
  PRESET_MEDIA_KEYS, sniffType, VIDEO_TYPES,
} from "./media.ts";

export const MAX_HTML_BYTES = 2 * 1024 * 1024;
export const EDIT_ATTEMPTS = 3;
export const MAX_EDITS = 100;
export const STATUSES = ["Exploration", "In review", "Handoff", "Shipped"] as const;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DEFAULT_HUB_URL = "https://osipapa.github.io/eon-prototype-hub/";

export type ProtoRow = {
  id: string; slug: string; title: string; prototype_html: string | null; html_version: number;
  controls?: unknown; defaults?: unknown;
};
export type ProtoSummary = {
  slug: string; title: string; group_name: string; status: string; html_version: number;
  size: number; sha256: string | null; updated_at: string;
};
export type RevisionSummary = {
  version: number; kind: string; source: string; author: string | null; created_at: string; size: number; sha256?: string | null;
};
export type NewPrototype = { slug: string; title: string; group_name: string; status: string; prototype_html: string | null };

export class VersionConflict extends Error {
  constructor(public current: number) { super("version_conflict"); }
}
export class RevisionNotFound extends Error {
  constructor() { super("revision_not_found"); }
}
export class SlugTaken extends Error {
  constructor() { super("slug_taken"); }
}

export interface PrototypeStore {
  list(): Promise<ProtoSummary[]>;
  get(slug: string): Promise<ProtoRow | null>;
  // Saves only if html_version still equals baseVersion. New version, or null on conflict.
  swap(id: string, html: string, baseVersion: number): Promise<number | null>;
  revisions(projectId: string): Promise<RevisionSummary[]>;
  // Throws VersionConflict or RevisionNotFound.
  restore(projectId: string, version: number, baseVersion: number): Promise<number>;
  // Throws SlugTaken when the team already has the slug.
  create(input: NewPrototype): Promise<ProtoRow>;
  // The states saved in the hub (projects.controls/defaults); empty means the file's eon-config applies.
  setStates(id: string, controls: Control[], defaults: Record<string, unknown>): Promise<void>;
}

export interface MediaStore {
  // Saved media keys and their URLs: the {{key}} tokens.
  assets(): Promise<Record<string, string>>;
  // Uploads into the media library and returns the public URL.
  upload(bytes: Uint8Array, type: string, filename: string): Promise<string>;
  saveAsset(key: string, url: string): Promise<void>;
  // Deletes a media library upload; ignores any other URL.
  removeFile(url: string): Promise<void>;
}

export type ToolDeps = { media?: MediaStore; hubUrl?: string; fetch?: typeof fetch };
export type ToolResult = { text: string; isError?: boolean };

const ok = (value: unknown): ToolResult => ({ text: typeof value === "string" ? value : JSON.stringify(value, null, 2) });
const fail = (message: string): ToolResult => ({ text: message, isError: true });
const bytes = (text: string) => new TextEncoder().encode(text).length;
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
const isObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
// Size and checksum of saved HTML: compare with `shasum -a 256 file.html`.
const stamp = async (html: string) => `${bytes(html).toLocaleString("en-US")} bytes · sha256 ${await sha256Hex(html)}`;

const notFound = (slug: string) => fail(`No prototype with slug "${slug}". Call list_prototypes for the slugs.`);
const noHtml = (slug: string) =>
  fail(`"${slug}" has no uploaded HTML yet (it shows a built-in demo or a placeholder). To give it HTML, call write_prototype with base_version 0.`);
const tooBig = () => fail("That HTML is over the 2 MB limit. Keep prototypes self-contained but lean: move large images to the Media library with extract_media or upload_media.");
const noMedia = () => fail("The media library isn't available on this connection.");
const badKey = (key: string) =>
  MEDIA_KEY.test(key) ? null : fail(`Media key "${key}" must start with a letter or digit and use only letters, digits, _, ., or - (max 64).`);

export function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || `prototype-${Date.now().toString(36)}`;
}

export async function guard(run: () => Promise<ToolResult>): Promise<ToolResult> {
  try {
    return await run();
  } catch (error) {
    const message = (error as { message?: string })?.message ?? String(error);
    return fail(`Hub error: ${message}`);
  }
}

type Change<T> = ({ ok: true; html: string } & T) | { ok: false; error: string };
type Saved<T> = { version: number; html: string; before: string; change: { ok: true; html: string } & T } | { failed: ToolResult };

// Applies a change to the latest saved HTML and compare-and-swaps it. On a
// conflict it re-reads and re-applies, so teammates' saves elsewhere are kept.
async function saveChange<T>(store: PrototypeStore, slug: string, change: (html: string) => Change<T>): Promise<Saved<T>> {
  for (let attempt = 0; attempt < EDIT_ATTEMPTS; attempt++) {
    const row = await store.get(slug);
    if (!row) return { failed: notFound(slug) };
    if (row.prototype_html == null) return { failed: noHtml(slug) };
    const next = change(row.prototype_html);
    if (!next.ok) return { failed: fail(next.error) };
    if (bytes(next.html) > MAX_HTML_BYTES) return { failed: tooBig() };
    const version = await store.swap(row.id, next.html, row.html_version);
    if (version !== null) return { version, html: next.html, before: row.prototype_html, change: next };
  }
  return { failed: fail("The prototype is changing too fast to apply this edit. Try again.") };
}

// What renders in the hub, and where each part comes from.
function statesReport(row: ProtoRow): string {
  const config = readConfig(row.prototype_html ?? "");
  const effective = effectiveStates(row.controls, row.defaults, config);
  const report: Record<string, unknown> = {
    source: effective.source,
    effective: { controls: effective.controls, defaults: effective.defaults, combinations: effective.combinations },
    saved_in_hub: { controls: Array.isArray(row.controls) ? row.controls : [], defaults: isObject(row.defaults) ? row.defaults : {} },
    file: config.error
      ? { error: config.error }
      : { controls: Array.isArray(config.controls) ? config.controls : [], defaults: isObject(config.defaults) ? config.defaults : {}, viewport: config.viewport ?? null },
  };
  if (effective.source === "hub" && fileControls(config).length) {
    report.note = "States saved in the hub override the file's eon-config. set_states with use_file: true switches to the file's.";
  }
  return JSON.stringify(report, null, 2);
}

// Every combination of the controls' options, capped like the hub's grid.
function stateCombos(controls: Control[], cap = 16): Record<string, string>[] {
  let out: Record<string, string>[] = [{}];
  for (const control of controls) {
    out = out.flatMap((combo) => control.options.map((option) => ({ ...combo, [control.key]: option }))).slice(0, cap);
  }
  return controls.length ? out : [];
}

const listInline = (items: InlineMedia[]) =>
  items.map((item, i) => `${i + 1}. ${item.type}, ${kb(item.bytes)}${item.copies > 1 ? `, ${item.copies} copies` : ""}, line ${item.line}`).join("\n");

async function fetchMedia(url: string, fetcher: typeof fetch): Promise<{ data: Uint8Array; type: string } | { error: string }> {
  let target: URL;
  try { target = new URL(url); } catch { return { error: "url isn't a valid URL." }; }
  if (target.protocol !== "https:") return { error: "url must start with https://." };
  let response: Response;
  try {
    response = await fetcher(target, { redirect: "follow", signal: AbortSignal.timeout(20_000) });
  } catch (error) {
    return { error: `Couldn't fetch the url: ${(error as Error).message}` };
  }
  if (!response.ok) return { error: `Fetching the url returned HTTP ${response.status}.` };
  if (response.url && !response.url.startsWith("https://")) return { error: "The url redirected to a non-https address." };
  if (Number(response.headers.get("content-length") ?? 0) > MAX_VIDEO_BYTES) return { error: "That file is over 50 MB." };
  const data = new Uint8Array(await response.arrayBuffer());
  return { data, type: (response.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase() };
}

export function createTools(store: PrototypeStore, deps: ToolDeps = {}) {
  const { media } = deps;
  const hubUrl = (deps.hubUrl ?? DEFAULT_HUB_URL).replace(/\/?$/, "/");

  // Saves bytes under a media key. Replacing a key repoints every prototype
  // that uses it, so that needs replace: true; the old upload is deleted once
  // no other key points at it, as the hub does.
  async function saveMedia(library: MediaStore, key: string, data: Uint8Array, type: string, replace = false, filename?: string) {
    const assets = await library.assets();
    const previous = assets[key];
    if ((previous || PRESET_MEDIA_KEYS.includes(key)) && !replace) {
      return fail(`{{${key}}} already exists${previous ? "" : " as a built-in preset"}. Pass replace: true to point it at this file: every prototype using {{${key}}} changes.`);
    }
    const name = (filename || `${key}.${extensionFor(type)}`).replace(/[^\w.-]+/g, "-");
    const url = await library.upload(data, type, name);
    await library.saveAsset(key, url);
    if (previous && previous !== url && !Object.entries(assets).some(([other, value]) => other !== key && value === previous)) {
      await library.removeFile(previous).catch(() => {});
    }
    return null;
  }

  return {
    async list_prototypes(): Promise<ToolResult> {
      return ok(await store.list());
    },

    async read_prototype(
      { slug, start_line, end_line, start_char }: { slug: string; start_line?: number; end_line?: number; start_char?: number },
    ): Promise<ToolResult> {
      const row = await store.get(slug);
      if (!row) return notFound(slug);
      if (row.prototype_html == null) return noHtml(slug);
      const page = pageLines(row.prototype_html, start_line ?? 1, end_line, undefined, start_char ?? 0);
      const from = page.startChar ? ` (line ${page.startLine} from char ${page.startChar})` : "";
      const next = page.nextStartChar ? `start_line=${page.nextStartLine}, start_char=${page.nextStartChar}` : `start_line=${page.nextStartLine}`;
      const more = page.nextStartLine ? ` · more: call read_prototype with ${next}` : "";
      const head = `slug: ${slug} · version: ${row.html_version} · ${await stamp(row.prototype_html)}`;
      return ok(`${head}\nlines ${page.startLine}-${page.endLine} of ${page.totalLines}${from}${more}\n\n${page.text}`);
    },

    async search_prototype({ slug, pattern, regex }: { slug: string; pattern: string; regex?: boolean }): Promise<ToolResult> {
      const row = await store.get(slug);
      if (!row) return notFound(slug);
      if (row.prototype_html == null) return noHtml(slug);
      const found = searchLines(row.prototype_html, pattern, regex ?? false);
      if ("error" in found) return fail(found.error);
      return ok({ version: row.html_version, total: found.total, matches: found.matches });
    },

    async edit_prototype(
      { slug, old_string, new_string, replace_all }: { slug: string; old_string: string; new_string: string; replace_all?: boolean },
    ): Promise<ToolResult> {
      const saved = await saveChange(store, slug, (html) => applyEdit(html, old_string, new_string, replace_all ?? false));
      if ("failed" in saved) return saved.failed;
      const { count, firstIndex } = saved.change;
      return ok(`Saved version ${saved.version} (${plural(count, "replacement")}) · ${await stamp(saved.html)}\n\n${contextAround(saved.html, firstIndex)}`);
    },

    async multi_edit_prototype({ slug, edits }: { slug: string; edits: EditSpec[] }): Promise<ToolResult> {
      if (!edits?.length) return fail("Pass at least one edit.");
      if (edits.length > MAX_EDITS) return fail(`At most ${MAX_EDITS} edits per call.`);
      const saved = await saveChange(store, slug, (html) => applyEdits(html, edits));
      if ("failed" in saved) return saved.failed;
      const counts = saved.change.counts;
      const total = counts.reduce((sum, n) => sum + n, 0);
      const each = counts.some((n) => n !== 1) ? `\nReplacements per edit, in order: ${counts.join(", ")}.` : "";
      return ok(`Saved version ${saved.version}: ${plural(edits.length, "edit")} as one version (${plural(total, "replacement")}) · ${await stamp(saved.html)}${each}`);
    },

    async write_prototype({ slug, html, base_version }: { slug: string; html: string; base_version: number }): Promise<ToolResult> {
      if (bytes(html) > MAX_HTML_BYTES) return tooBig();
      const row = await store.get(slug);
      if (!row) return notFound(slug);
      const version = await store.swap(row.id, html, base_version);
      if (version === null) {
        const current = (await store.get(slug))?.html_version ?? row.html_version;
        return fail(`version_conflict: someone saved since version ${base_version}. Current version is ${current}. Re-read, re-apply your change, and pass base_version=${current}.`);
      }
      return ok(`Saved version ${version} · ${await stamp(html)}`);
    },

    async list_revisions({ slug }: { slug: string }): Promise<ToolResult> {
      const row = await store.get(slug);
      if (!row) return notFound(slug);
      return ok({ current_version: row.html_version, revisions: await store.revisions(row.id) });
    },

    async restore_revision({ slug, version, base_version }: { slug: string; version: number; base_version: number }): Promise<ToolResult> {
      const row = await store.get(slug);
      if (!row) return notFound(slug);
      try {
        const next = await store.restore(row.id, version, base_version);
        const html = (await store.get(slug))?.prototype_html;
        return ok(`Restored version ${version} as version ${next}${html == null ? "." : ` · ${await stamp(html)}`}`);
      } catch (error) {
        if (error instanceof VersionConflict) {
          return fail(`version_conflict: current version is ${error.current}. Check list_revisions, then pass base_version=${error.current} to restore anyway.`);
        }
        if (error instanceof RevisionNotFound) {
          return fail(`No revision ${version} for "${slug}". Call list_revisions for the versions you can restore.`);
        }
        throw error;
      }
    },

    async create_prototype(
      { title, slug, group, status, html }: { title: string; slug?: string; group?: string; status?: string; html?: string },
    ): Promise<ToolResult> {
      const name = title.trim();
      if (!name) return fail("title is empty.");
      const id = slug?.trim() || slugify(name);
      if (!SLUG.test(id) || id.length > 80) return fail(`Slug "${id}" must be lowercase letters and numbers joined by single dashes (max 80).`);
      if (status && !(STATUSES as readonly string[]).includes(status)) return fail(`status must be one of ${STATUSES.join(", ")}.`);
      if (html != null && bytes(html) > MAX_HTML_BYTES) return tooBig();
      try {
        const row = await store.create({
          slug: id, title: name, group_name: group?.trim() || "General", status: status ?? "In review", prototype_html: html ?? null,
        });
        const saved = row.prototype_html == null
          ? " with no HTML yet (write_prototype with base_version 0 adds it)"
          : ` · version ${row.html_version} · ${await stamp(row.prototype_html)}`;
        return ok(`Created "${name}" as ${id}${saved}.\nOpen it in the hub: ${hubUrl}#/p/${id}`);
      } catch (error) {
        if (error instanceof SlugTaken) return fail(`The team already has a prototype with slug "${id}". Pass another slug, or edit that one.`);
        throw error;
      }
    },

    async get_states({ slug }: { slug: string }): Promise<ToolResult> {
      const row = await store.get(slug);
      if (!row) return notFound(slug);
      return ok(statesReport(row));
    },

    async set_states(
      { slug, controls, defaults, use_file }: { slug: string; controls?: Control[]; defaults?: Record<string, string>; use_file?: boolean },
    ): Promise<ToolResult> {
      const row = await store.get(slug);
      if (!row) return notFound(slug);
      if (use_file) {
        if (controls || defaults) return fail("use_file clears the states saved in the hub so the file's eon-config applies: don't pass controls or defaults with it.");
        await store.setStates(row.id, [], {});
        return ok(`Cleared the states saved in the hub: "${slug}" now uses its file's eon-config.\n\n${statesReport({ ...row, controls: [], defaults: {} })}`);
      }
      if (!controls && !defaults) return fail("Pass controls, defaults, or use_file: true.");
      const savedControls = Array.isArray(row.controls) ? row.controls as Control[] : [];
      const savedDefaults = isObject(row.defaults) ? row.defaults : {};
      const nextControls = controls ? controls.map((c) => ({ key: c.key, label: c.label || c.key, options: c.options })) : savedControls;
      // Defaults are checked against the controls that will actually render.
      const rendered = nextControls.length ? nextControls : fileControls(readConfig(row.prototype_html ?? ""));
      let nextDefaults: Record<string, unknown> = defaults ?? savedDefaults;
      let dropped: string[] = [];
      if (controls && !defaults) {
        nextDefaults = Object.fromEntries(Object.entries(savedDefaults)
          .filter(([key, value]) => rendered.some((c) => c.key === key && c.options.includes(value as string))));
        dropped = Object.keys(savedDefaults).filter((key) => !(key in nextDefaults));
      }
      const problems = [...(controls ? controlProblems(nextControls) : []), ...defaultsProblems(rendered, nextDefaults)];
      if (problems.length) return fail(`Not saved:\n- ${problems.join("\n- ")}`);
      await store.setStates(row.id, nextControls, nextDefaults);
      const note = dropped.length ? `\nDropped saved defaults that no longer match: ${dropped.join(", ")}.` : "";
      return ok(`Saved the states for "${slug}".${note}\n\n${statesReport({ ...row, controls: nextControls, defaults: nextDefaults })}`);
    },

    // Links into the hub's own workspace (src/features/hub/PrototypeWorkspace.jsx
    // reads these params), so a browser signed in to the hub shows each state,
    // theme, and screen size exactly as teammates see it.
    async preview_links(
      { slug, theme, viewport }: { slug: string; theme?: "light" | "dark"; viewport?: string },
    ): Promise<ToolResult> {
      const row = await store.get(slug);
      if (!row) return notFound(slug);
      const config = readConfig(row.prototype_html ?? "");
      const effective = effectiveStates(row.controls, row.defaults, config);
      const frame = viewport ?? (VIEWPORT_KEYS.includes(config.viewport as string) ? config.viewport as string : "laptop");
      if (!VIEWPORT_KEYS.includes(frame)) return fail(`viewport must be one of ${VIEWPORT_KEYS.join(", ")}.`);
      const tone = theme ?? "light";
      const link = (params: Record<string, string>) => `${hubUrl}#/p/${slug}?${new URLSearchParams(params)}`;
      const args = (combo: Record<string, string>) =>
        Object.fromEntries(Object.entries(combo).map(([key, value]) => [`arg.${key}`, value]));
      const lines = [
        `Open these in a browser signed in to the hub: they render "${slug}" in the hub itself (${frame} frame, ${tone} theme unless noted).`,
        "",
        `This view: ${link({ viewport: frame, theme: tone })}`,
        `Both themes side by side: ${link({ viewport: frame, layout: "grid", grid: "themes" })}`,
        `Every screen size: ${link({ theme: tone, layout: "grid", grid: "screens" })}`,
      ];
      const combos = stateCombos(effective.controls);
      if (combos.length) {
        lines.push(`Every state in one grid: ${link({ viewport: frame, theme: tone, layout: "grid", grid: "states" })}`, "", "Each state:");
        for (const combo of combos) {
          const name = Object.entries(combo).map(([key, value]) => `${key}=${value}`).join(", ");
          lines.push(`- ${name}: ${link({ viewport: frame, theme: tone, ...args(combo) })}`);
        }
      }
      return ok(lines.join("\n"));
    },

    async check_prototype({ slug, html }: { slug?: string; html?: string }): Promise<ToolResult> {
      if (!slug && html == null) return fail("Pass slug to check the saved HTML, or html to check a draft.");
      const row = slug ? await store.get(slug) : null;
      if (slug && !row) return notFound(slug);
      const source = html ?? row?.prototype_html;
      if (source == null) return noHtml(slug!);
      const assets = media ? await media.assets() : {};
      const findings = checkPrototype(source, { savedControls: row?.controls, savedDefaults: row?.defaults, assets });
      const what = html != null ? `draft${slug ? ` for ${slug}` : ""}` : `${slug} · version ${row!.html_version}`;
      return ok(`Checked ${what} · ${await stamp(source)}\n\n${formatFindings(findings)}`);
    },

    async upload_media(
      { key, data_base64, url, content_type, filename, replace }:
        { key: string; data_base64?: string; url?: string; content_type?: string; filename?: string; replace?: boolean },
    ): Promise<ToolResult> {
      if (!media) return noMedia();
      const keyProblem = badKey(key);
      if (keyProblem) return keyProblem;
      if ((data_base64 == null) === (url == null)) return fail("Pass exactly one of data_base64 or url.");
      let data: Uint8Array;
      let type = content_type?.split(";")[0].trim().toLowerCase() ?? "";
      if (data_base64 != null) {
        const text = data_base64.trim();
        const prefix = /^data:([^;,]+);base64,/i.exec(text);
        if (prefix && !type) type = prefix[1].toLowerCase();
        try {
          data = decodeBase64(prefix ? text.slice(prefix[0].length) : text);
        } catch {
          return fail("data_base64 isn't valid base64.");
        }
      } else {
        const fetched = await fetchMedia(url!, deps.fetch ?? fetch);
        if ("error" in fetched) return fail(fetched.error);
        data = fetched.data;
        type ||= fetched.type;
      }
      if (!extensionFor(type)) type = sniffType(data) ?? type;
      const problem = mediaProblem(type, data.length);
      if (problem) return fail(problem);
      const refused = await saveMedia(media, key, data, type, replace, filename);
      if (refused) return refused;
      const token = `{{${key}}}`;
      const usage = VIDEO_TYPES[type]
        ? `<video src="${token}" autoplay muted loop playsinline></video>`
        : `<img src="${token}" alt="..."> or background-image:url("${token}")`;
      return ok(`Saved ${token} (${type}, ${kb(data.length)}) to the Media library. Use it as ${usage}. The hub swaps in the file; outside the hub the token stays literal.`);
    },

    async extract_media(
      { slug, key, index, replace }: { slug: string; key: string; index?: number; replace?: boolean },
    ): Promise<ToolResult> {
      if (!media) return noMedia();
      const keyProblem = badKey(key);
      if (keyProblem) return keyProblem;
      const row = await store.get(slug);
      if (!row) return notFound(slug);
      if (row.prototype_html == null) return noHtml(slug);
      const found = inlineMedia(row.prototype_html).filter((item) => extensionFor(item.type));
      if (!found.length) return fail(`"${slug}" has no inline base64 images or videos to move.`);
      const pick = index ?? 1;
      if (pick < 1 || pick > found.length) return fail(`Pick an index from 1 to ${found.length}:\n${listInline(found)}`);
      const item = found[pick - 1];
      let data: Uint8Array;
      try {
        data = decodeBase64(item.uri.slice(item.uri.indexOf(",") + 1));
      } catch {
        return fail("That inline file's base64 doesn't decode.");
      }
      const problem = mediaProblem(item.type, data.length);
      if (problem) return fail(problem);
      const refused = await saveMedia(media, key, data, item.type, replace);
      if (refused) return refused;
      const token = `{{${key}}}`;
      const saved = await saveChange(store, slug, (html) => html.includes(item.uri)
        ? { ok: true as const, html: html.split(item.uri).join(token) }
        : { ok: false as const, error: `Saved ${token} to the Media library, but that file is no longer in "${slug}" (someone changed it), so the HTML is unchanged.` });
      if ("failed" in saved) return saved.failed;
      const copies = item.copies > 1 ? `, ${item.copies} copies` : "";
      const others = found.filter((_, i) => i !== pick - 1);
      const rest = others.length ? `\n\nStill inline (index for the next extract_media):\n${listInline(others)}` : "";
      return ok(
        `Moved ${item.type} (${kb(data.length)}${copies}, line ${item.line}) to the Media library as ${token}. ` +
          `Saved version ${saved.version}: ${kb(bytes(saved.before))} → ${kb(bytes(saved.html))} · sha256 ${await sha256Hex(saved.html)}${rest}`,
      );
    },
  };
}
