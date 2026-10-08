// Knowledge base tools for the hub MCP: the team's Eon Design pages as an
// Open Knowledge Format bundle. All I/O goes through KbStore, so the logic is
// tested against a fake store.
import { applyEdit } from "./lib.ts";
import type { ToolResult } from "./tools.ts";
import { entryProblems, headings, KB_TYPES, okfFile, okfIndex, validateRefs } from "./kb/okf.js";

export type KbRow = {
  id: string; slug: string; type: string; title: string; summary: string; group_path: string;
  status: string; body_md: string; refs: string[]; sort_order: number; version: number; updated_at: string;
};
export type KbPatch = Partial<Pick<KbRow, "type" | "title" | "summary" | "group_path" | "status" | "body_md" | "refs" | "sort_order">>;

export interface KbStore {
  list(): Promise<KbRow[]>;
  get(slug: string): Promise<KbRow | null>;
  // Slugs ranked by full-text match.
  search(query: string): Promise<string[]>;
  insert(row: KbPatch & { slug: string }): Promise<KbRow>;
  // Saves only if version still equals baseVersion. The row, or null on conflict.
  swap(id: string, patch: KbPatch, baseVersion: number): Promise<KbRow | null>;
}

export const KB_EDIT_ATTEMPTS = 3;
const MAX_BODY_BYTES = 256 * 1024;

const ok = (text: string): ToolResult => ({ text });
const fail = (message: string): ToolResult => ({ text: message, isError: true });
const notFound = (slug: string) => fail(`No knowledge base page "${slug}". Call kb_index for the slugs, or kb_search.`);
const bytes = (text: string) => new TextEncoder().encode(text).length;

// The heading's own section: from it to the next heading of the same or a higher level.
export function sliceSection(md: string, anchor: string): string | null {
  const all = headings(md);
  const at = all.findIndex((h) => h.id === anchor);
  if (at === -1) return null;
  const lines = md.split("\n");
  const next = all.slice(at + 1).find((h) => h.depth <= all[at].depth);
  return lines.slice(all[at].line - 1, next ? next.line - 1 : lines.length).join("\n").trim();
}

function snippet(row: KbRow, terms: string[]): string {
  const lines = row.body_md.split("\n").map((line) => line.trim()).filter((line) => line && !line.startsWith("```"));
  const hit = lines.find((line) => terms.some((term) => line.toLowerCase().includes(term)));
  const text = hit ?? row.summary ?? "";
  return text.length > 220 ? `${text.slice(0, 217)}…` : text;
}

export function createKbTools(store: KbStore, { hubUrl }: { hubUrl: string }) {
  const pageUrl = (slug: string, section?: string) => `${hubUrl}#/design/${slug}${section ? `?s=${section}` : ""}`;

  return {
    async kb_index(): Promise<ToolResult> {
      const rows = await store.list();
      return ok(okfIndex(rows));
    },

    async kb_read({ slug, section }: { slug: string; section?: string }): Promise<ToolResult> {
      const [pageSlug, hashSection] = slug.replace(/^kb:/, "").split("#");
      const anchor = section ?? hashSection;
      const row = await store.get(pageSlug);
      if (!row) return notFound(pageSlug);
      const header = `version: ${row.version} · hub: ${pageUrl(row.slug, anchor)}\n\n`;
      if (!anchor) return ok(header + okfFile(row));
      const part = sliceSection(row.body_md, anchor);
      if (part == null) {
        const ids = headings(row.body_md).map((h) => h.id).join(", ");
        return fail(`"${pageSlug}" has no section "${anchor}". Sections: ${ids || "none"}.`);
      }
      return ok(header + okfFile({ ...row, summary: "", body_md: part }));
    },

    async kb_search({ query, type }: { query: string; type?: string }): Promise<ToolResult> {
      const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
      if (!terms.length) return fail("query is empty.");
      const rows = await store.list();
      const bySlug = new Map(rows.map((row) => [row.slug, row]));
      let ranked = (await store.search(query)).map((slug) => bySlug.get(slug)).filter((row): row is KbRow => Boolean(row));
      // Token names like --spacing-16 split oddly in full-text search; fall back to plain text.
      if (!ranked.length) {
        ranked = rows
          .map((row) => {
            const title = row.title.toLowerCase(), body = `${row.summary}\n${row.body_md}`.toLowerCase();
            const score = terms.reduce((sum, term) => sum + (title.includes(term) ? 3 : 0) + (body.includes(term) ? 1 : 0), 0);
            return { row, score };
          })
          .filter((hit) => hit.score > 0)
          .sort((a, b) => b.score - a.score)
          .map((hit) => hit.row);
      }
      const results = ranked
        .filter((row) => !type || row.type === type)
        .slice(0, 12)
        .map((row) => ({ slug: row.slug, title: row.title, type: row.type, group: row.group_path, status: row.status, snippet: snippet(row, terms) }));
      return ok(results.length ? JSON.stringify(results, null, 2) : `No pages match "${query}". Call kb_index to browse.`);
    },

    async kb_edit(
      { slug, old_string, new_string, replace_all }: { slug: string; old_string: string; new_string: string; replace_all?: boolean },
    ): Promise<ToolResult> {
      for (let attempt = 0; attempt < KB_EDIT_ATTEMPTS; attempt++) {
        const row = await store.get(slug);
        if (!row) return notFound(slug);
        const edit = applyEdit(row.body_md, old_string, new_string, replace_all ?? false);
        if (!edit.ok) return fail(edit.error.replaceAll("prototype", "page"));
        if (bytes(edit.html) > MAX_BODY_BYTES) return fail("That page would be over 256 KB. Split it into several pages.");
        const problems = entryProblems({ ...row, body_md: edit.html });
        if (problems.length) return fail(problems.join(" "));
        const saved = await store.swap(row.id, { body_md: edit.html }, row.version);
        if (saved) return ok(`Saved version ${saved.version} of "${slug}" (${edit.count} replacement${edit.count === 1 ? "" : "s"}).`);
      }
      return fail("The page is changing too fast to apply this edit. Try again.");
    },

    async kb_write(
      args: { slug: string; base_version: number; title?: string; body_md?: string; summary?: string; type?: string; group?: string; status?: string; refs?: string[] },
    ): Promise<ToolResult> {
      const patch: KbPatch = {};
      if (args.title !== undefined) patch.title = args.title;
      if (args.body_md !== undefined) patch.body_md = args.body_md;
      if (args.summary !== undefined) patch.summary = args.summary;
      if (args.type !== undefined) patch.type = args.type;
      if (args.group !== undefined) patch.group_path = args.group;
      if (args.status !== undefined) patch.status = args.status;
      if (args.refs !== undefined) patch.refs = args.refs.map((ref) => ref.replace(/^kb:/, ""));
      if (bytes(patch.body_md ?? "") > MAX_BODY_BYTES) return fail("That page is over 256 KB. Split it into several pages.");

      const existing = await store.get(args.slug);
      const merged = { ...(existing ?? { slug: args.slug, type: "concept", title: "", summary: "", group_path: "", status: "published", body_md: "", refs: [] }), ...patch };
      const problems = entryProblems(merged);
      if (problems.length) return fail(problems.join(" "));
      const rows = await store.list();
      const warnings = validateRefs([...rows.filter((row) => row.slug !== args.slug), merged])
        .filter((problem: { from: string }) => problem.from === args.slug)
        .map((problem: { ref: string; problem: string }) => `${problem.ref} (${problem.problem})`);
      const note = warnings.length ? `\nBroken refs to fix: ${warnings.join(", ")}.` : "";

      if (!existing) {
        if (args.base_version !== 0) return fail(`No page "${args.slug}" yet. To create it, pass base_version 0 with a title and type (${KB_TYPES.join(", ")}).`);
        const row = await store.insert({ ...patch, slug: args.slug, type: merged.type, title: merged.title });
        return ok(`Created "${row.slug}" (version ${row.version}): ${pageUrl(row.slug)}${note}`);
      }
      const saved = await store.swap(existing.id, patch, args.base_version);
      if (!saved) {
        return fail(`version_conflict: "${args.slug}" is at version ${existing.version}, not ${args.base_version}. Re-read it with kb_read, re-apply your change, and pass base_version=${existing.version}.`);
      }
      return ok(`Saved version ${saved.version} of "${args.slug}": ${pageUrl(args.slug)}${note}`);
    },
  };
}
