import { assert, assertEquals, assertStringIncludes } from "jsr:@std/assert@1";
import { createKbTools, type KbRow, type KbStore, sliceSection } from "./kbTools.ts";

const HUB = "https://hub.test/";

function fakeKb(rows: Partial<KbRow>[]) {
  let n = 0;
  const store = new Map<string, KbRow>();
  for (const row of rows) {
    const full: KbRow = {
      id: `kb-${++n}`, slug: "x", type: "reference", title: "X", summary: "", group_path: "Foundations",
      status: "published", body_md: "", refs: [], sort_order: n, version: 1, updated_at: "2026-10-08T00:00:00Z", ...row,
    };
    store.set(full.slug, full);
  }
  const state = { searchHits: [] as string[], beforeSwap: null as null | ((row: KbRow) => void) };
  const kb: KbStore = {
    list: () => Promise.resolve([...store.values()]),
    get: (slug) => Promise.resolve(store.has(slug) ? { ...store.get(slug)! } : null),
    search: () => Promise.resolve(state.searchHits),
    insert: (row) => {
      const full: KbRow = {
        id: `kb-${++n}`, type: "concept", title: "", summary: "", group_path: "", status: "published",
        body_md: "", refs: [], sort_order: 0, version: 1, updated_at: "", ...row,
      };
      store.set(full.slug, full);
      return Promise.resolve(full);
    },
    swap: (id, patch, base) => {
      const row = [...store.values()].find((r) => r.id === id)!;
      state.beforeSwap?.(row);
      if (row.version !== base) return Promise.resolve(null);
      Object.assign(row, patch, { version: row.version + 1 });
      return Promise.resolve({ ...row });
    },
  };
  return { tools: createKbTools(kb, { hubUrl: HUB }), store, state };
}

const SPACING = "Intro.\n\n## Scale\n\nZero to 80.\n\n### Small values\n\nTight.\n\n## Space tokens\n\n```tokens:space\n```\n";

Deno.test("sliceSection stops at the next heading of the same level", () => {
  assertEquals(sliceSection(SPACING, "scale"), "## Scale\n\nZero to 80.\n\n### Small values\n\nTight.");
  assertEquals(sliceSection(SPACING, "small-values"), "### Small values\n\nTight.");
  assertEquals(sliceSection(SPACING, "nope"), null);
});

Deno.test("kb_index lists published pages only", async () => {
  const { tools } = fakeKb([{ slug: "spacing", title: "Spacing" }, { slug: "wip", title: "WIP", status: "draft" }]);
  const r = await tools.kb_index();
  assertStringIncludes(r.text, "- [Spacing](spacing.md)");
  assert(!r.text.includes("wip.md"));
});

Deno.test("kb_read returns OKF file with expanded tokens; section via slug#id", async () => {
  const { tools } = fakeKb([{ slug: "spacing", title: "Spacing", body_md: SPACING }]);
  const whole = await tools.kb_read({ slug: "spacing" });
  assertStringIncludes(whole.text, "version: 1 · hub: https://hub.test/#/design/spacing");
  assertStringIncludes(whole.text, 'type: "reference"');
  assertStringIncludes(whole.text, "| --spacing-16 | 2× | 1rem | 16px |");
  const part = await tools.kb_read({ slug: "spacing#space-tokens" });
  assertStringIncludes(part.text, "?s=space-tokens");
  assert(!part.text.includes("Zero to 80"));
  const missing = await tools.kb_read({ slug: "spacing", section: "nope" });
  assert(missing.isError);
  assertStringIncludes(missing.text, "scale, small-values, space-tokens");
  assert((await tools.kb_read({ slug: "ghost" })).isError);
});

Deno.test("kb_search uses full-text hits, else plain text, and filters by type", async () => {
  const { tools, state } = fakeKb([
    { slug: "spacing", title: "Spacing", body_md: "Use --spacing-16 for padding." },
    { slug: "handoff", title: "Handoff", type: "howto", body_md: "Move the card." },
  ]);
  state.searchHits = ["handoff"];
  assertEquals(JSON.parse((await tools.kb_search({ query: "card" })).text)[0].slug, "handoff");
  state.searchHits = [];
  const plain = JSON.parse((await tools.kb_search({ query: "--spacing-16" })).text);
  assertEquals(plain[0].snippet, "Use --spacing-16 for padding.");
  assertStringIncludes((await tools.kb_search({ query: "--spacing-16", type: "howto" })).text, "No pages match");
});

Deno.test("kb_edit retries past a concurrent save and rejects unknown blocks", async () => {
  const { tools, store, state } = fakeKb([{ slug: "spacing", body_md: "A\nB" }]);
  let raced = false;
  state.beforeSwap = (row) => { if (!raced) { raced = true; row.version += 1; } };
  const r = await tools.kb_edit({ slug: "spacing", old_string: "B", new_string: "C" });
  assertStringIncludes(r.text, "Saved version 3");
  assertEquals(store.get("spacing")!.body_md, "A\nC");
  const bad = await tools.kb_edit({ slug: "spacing", old_string: "C", new_string: "```tokens:nope\n```" });
  assert(bad.isError);
  assertStringIncludes(bad.text, "Unknown token set");
});

Deno.test("kb_write creates with base_version 0, conflicts on stale version, warns on broken refs", async () => {
  const { tools, store } = fakeKb([{ slug: "spacing", body_md: "## Scale" }]);
  const created = await tools.kb_write({ slug: "cards", base_version: 0, title: "Cards", type: "reference", refs: ["kb:spacing#scale", "ghost"] });
  assertStringIncludes(created.text, 'Created "cards"');
  assertStringIncludes(created.text, "ghost (missing-entry)");
  assertEquals(store.get("cards")!.refs, ["spacing#scale", "ghost"]);
  assert((await tools.kb_write({ slug: "new-one", base_version: 2, title: "N" })).isError);
  const stale = await tools.kb_write({ slug: "spacing", base_version: 9, body_md: "x" });
  assert(stale.isError);
  assertStringIncludes(stale.text, "base_version=1");
  assertStringIncludes((await tools.kb_write({ slug: "spacing", base_version: 1, body_md: "x" })).text, "Saved version 2");
  assert((await tools.kb_write({ slug: "Bad Slug", base_version: 0, title: "B", type: "concept" })).isError);
});
