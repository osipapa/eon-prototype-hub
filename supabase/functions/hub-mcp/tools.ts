// Tool handlers for the hub MCP. All I/O goes through PrototypeStore, so the
// compare-and-swap logic is tested against a fake store.
import { applyEdit, contextAround, pageLines, searchLines } from "./lib.ts";

export const MAX_HTML_BYTES = 2 * 1024 * 1024;
export const EDIT_ATTEMPTS = 3;

export type ProtoRow = { id: string; slug: string; title: string; prototype_html: string | null; html_version: number };
export type ProtoSummary = { slug: string; title: string; group_name: string; status: string; html_version: number; size: number; updated_at: string };
export type RevisionSummary = { version: number; kind: string; source: string; author: string | null; created_at: string; size: number };

export class VersionConflict extends Error {
  constructor(public current: number) { super("version_conflict"); }
}
export class RevisionNotFound extends Error {
  constructor() { super("revision_not_found"); }
}

export interface PrototypeStore {
  list(): Promise<ProtoSummary[]>;
  get(slug: string): Promise<ProtoRow | null>;
  // Saves only if html_version still equals baseVersion. New version, or null on conflict.
  swap(id: string, html: string, baseVersion: number): Promise<number | null>;
  revisions(projectId: string): Promise<RevisionSummary[]>;
  // Throws VersionConflict or RevisionNotFound.
  restore(projectId: string, version: number, baseVersion: number): Promise<number>;
}

export type ToolResult = { text: string; isError?: boolean };

const ok = (value: unknown): ToolResult => ({ text: typeof value === "string" ? value : JSON.stringify(value, null, 2) });
const fail = (message: string): ToolResult => ({ text: message, isError: true });
const bytes = (text: string) => new TextEncoder().encode(text).length;

const notFound = (slug: string) => fail(`No prototype with slug "${slug}". Call list_prototypes for the slugs.`);
const noHtml = (slug: string) =>
  fail(`"${slug}" has no uploaded HTML yet (it shows a built-in demo or a placeholder). To give it HTML, call write_prototype with base_version 0.`);
const tooBig = () => fail("That HTML is over the 2 MB limit. Keep prototypes self-contained but lean (host large images in the hub's Media).");

export async function guard(run: () => Promise<ToolResult>): Promise<ToolResult> {
  try {
    return await run();
  } catch (error) {
    const message = (error as { message?: string })?.message ?? String(error);
    return fail(`Hub error: ${message}`);
  }
}

export function createTools(store: PrototypeStore) {
  return {
    async list_prototypes(): Promise<ToolResult> {
      return ok(await store.list());
    },

    async read_prototype({ slug, start_line, end_line }: { slug: string; start_line?: number; end_line?: number }): Promise<ToolResult> {
      const row = await store.get(slug);
      if (!row) return notFound(slug);
      if (row.prototype_html == null) return noHtml(slug);
      const page = pageLines(row.prototype_html, start_line ?? 1, end_line);
      const more = page.nextStartLine ? ` · more: call read_prototype with start_line=${page.nextStartLine}` : "";
      return ok(`slug: ${slug} · version: ${row.html_version} · lines ${page.startLine}-${page.endLine} of ${page.totalLines}${more}\n\n${page.text}`);
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
      for (let attempt = 0; attempt < EDIT_ATTEMPTS; attempt++) {
        const row = await store.get(slug);
        if (!row) return notFound(slug);
        if (row.prototype_html == null) return noHtml(slug);
        const edit = applyEdit(row.prototype_html, old_string, new_string, replace_all ?? false);
        if (!edit.ok) return fail(edit.error);
        if (bytes(edit.html) > MAX_HTML_BYTES) return tooBig();
        const version = await store.swap(row.id, edit.html, row.html_version);
        if (version !== null) {
          const plural = edit.count === 1 ? "" : "s";
          return ok(`Saved version ${version} (${edit.count} replacement${plural}).\n\n${contextAround(edit.html, edit.firstIndex)}`);
        }
      }
      return fail("The prototype is changing too fast to apply this edit. Try again.");
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
      return ok(`Saved version ${version}.`);
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
        return ok(`Restored version ${version} as version ${next}.`);
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
  };
}
