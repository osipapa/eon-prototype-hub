import { assert, assertEquals, assertStringIncludes } from "jsr:@std/assert@1";
import {
  createTools, guard, MAX_HTML_BYTES, type ProtoRow, type PrototypeStore,
  RevisionNotFound, type RevisionSummary, VersionConflict,
} from "./tools.ts";

function fakeStore(initial: Record<string, string | null>) {
  const rows = new Map<string, ProtoRow>();
  let n = 0;
  for (const [slug, html] of Object.entries(initial)) {
    rows.set(slug, { id: `id-${++n}`, slug, title: slug, prototype_html: html, html_version: html == null ? 0 : 1 });
  }
  const byId = (id: string) => [...rows.values()].find((row) => row.id === id)!;
  const state = {
    swaps: 0,
    // Runs inside swap before the version check: simulates another writer.
    beforeSwap: null as null | ((row: ProtoRow) => void),
    revisionList: [] as RevisionSummary[],
    restoreImpl: (_id: string, _v: number, _b: number): Promise<number> => Promise.resolve(0),
  };
  const store: PrototypeStore = {
    list: () => Promise.resolve([...rows.values()].map((row) => ({
      slug: row.slug, title: row.title, group_name: "G", status: "Exploration",
      html_version: row.html_version, size: (row.prototype_html ?? "").length, updated_at: "2026-09-25T00:00:00Z",
    }))),
    get: (slug) => Promise.resolve(rows.has(slug) ? { ...rows.get(slug)! } : null),
    swap: (id, html, base) => {
      state.swaps += 1;
      const row = byId(id);
      state.beforeSwap?.(row);
      if (row.html_version !== base) return Promise.resolve(null);
      if (row.prototype_html !== html) { row.prototype_html = html; row.html_version += 1; }
      return Promise.resolve(row.html_version);
    },
    revisions: () => Promise.resolve(state.revisionList),
    restore: (id, v, b) => state.restoreImpl(id, v, b),
  };
  return { store, rows, state };
}

Deno.test("read_prototype returns numbered lines with version", async () => {
  const { store } = fakeStore({ home: "<h1>A</h1>\n<p>B</p>" });
  const r = await createTools(store).read_prototype({ slug: "home" });
  assertEquals(r.isError, undefined);
  assertStringIncludes(r.text, "version: 1");
  assertStringIncludes(r.text, "1\t<h1>A</h1>\n2\t<p>B</p>");
});

Deno.test("read_prototype: unknown slug and no uploaded HTML", async () => {
  const { store } = fakeStore({ builtin: null });
  const tools = createTools(store);
  const missing = await tools.read_prototype({ slug: "nope" });
  assert(missing.isError);
  assertStringIncludes(missing.text, "list_prototypes");
  const empty = await tools.read_prototype({ slug: "builtin" });
  assert(empty.isError);
  assertStringIncludes(empty.text, "base_version 0");
});

Deno.test("edit_prototype saves and reports context", async () => {
  const { store, rows } = fakeStore({ home: "<h1>A</h1>\n<p>B</p>" });
  const r = await createTools(store).edit_prototype({ slug: "home", old_string: "<p>B</p>", new_string: "<p>C</p>" });
  assertEquals(r.isError, undefined);
  assertStringIncludes(r.text, "Saved version 2");
  assertStringIncludes(r.text, "2\t<p>C</p>");
  assertEquals(rows.get("home")!.prototype_html, "<h1>A</h1>\n<p>C</p>");
});

Deno.test("edit_prototype re-applies on top of a concurrent edit elsewhere", async () => {
  const { store, rows, state } = fakeStore({ home: "<header>H</header>\n<footer>F</footer>" });
  state.beforeSwap = (row) => {
    state.beforeSwap = null;
    row.prototype_html = row.prototype_html!.replace("<footer>F</footer>", "<footer>F2</footer>");
    row.html_version += 1;
  };
  const r = await createTools(store).edit_prototype({ slug: "home", old_string: "<header>H</header>", new_string: "<header>H2</header>" });
  assertEquals(r.isError, undefined);
  assertEquals(rows.get("home")!.prototype_html, "<header>H2</header>\n<footer>F2</footer>");
  assertEquals(state.swaps, 2);
});

Deno.test("edit_prototype reports not-found when a concurrent edit removed the text", async () => {
  const { store, state } = fakeStore({ home: "<p>old</p>" });
  state.beforeSwap = (row) => {
    state.beforeSwap = null;
    row.prototype_html = "<p>rewritten</p>";
    row.html_version += 1;
  };
  const r = await createTools(store).edit_prototype({ slug: "home", old_string: "<p>old</p>", new_string: "<p>new</p>" });
  assert(r.isError);
  assertStringIncludes(r.text, "not found");
});

Deno.test("edit_prototype gives up after 3 conflicts", async () => {
  const { store, state } = fakeStore({ home: "<p>a</p><i>1</i>" });
  let bumps = 0;
  state.beforeSwap = (row) => {
    bumps += 1;
    row.prototype_html = `<p>a</p><i>${bumps + 1}</i>`;
    row.html_version += 1;
  };
  const r = await createTools(store).edit_prototype({ slug: "home", old_string: "<p>a</p>", new_string: "<p>b</p>" });
  assert(r.isError);
  assertStringIncludes(r.text, "changing too fast");
  assertEquals(state.swaps, 3);
});

Deno.test("write_prototype: stale base_version conflicts with current version", async () => {
  const { store } = fakeStore({ home: "<p>a</p>" });
  const tools = createTools(store);
  await tools.edit_prototype({ slug: "home", old_string: "a", new_string: "b" }); // now v2
  const r = await tools.write_prototype({ slug: "home", html: "<p>z</p>", base_version: 1 });
  assert(r.isError);
  assertStringIncludes(r.text, "version_conflict");
  assertStringIncludes(r.text, "base_version=2");
});

Deno.test("write_prototype fills a prototype with no HTML at base_version 0", async () => {
  const { store, rows } = fakeStore({ empty: null });
  const r = await createTools(store).write_prototype({ slug: "empty", html: "<p>first</p>", base_version: 0 });
  assertEquals(r.isError, undefined);
  assertEquals(rows.get("empty")!.prototype_html, "<p>first</p>");
});

Deno.test("write_prototype rejects HTML over 2 MB", async () => {
  const { store } = fakeStore({ home: "<p>a</p>" });
  const r = await createTools(store).write_prototype({ slug: "home", html: "x".repeat(MAX_HTML_BYTES + 1), base_version: 1 });
  assert(r.isError);
  assertStringIncludes(r.text, "2 MB");
});

Deno.test("search_prototype returns matches and version", async () => {
  const { store } = fakeStore({ home: "<h1>A</h1>\n<h2>B</h2>" });
  const r = await createTools(store).search_prototype({ slug: "home", pattern: "<h2" });
  assertEquals(JSON.parse(r.text), { version: 1, total: 1, matches: [{ line: 2, text: "<h2>B</h2>" }] });
});

Deno.test("restore_revision maps conflicts and missing revisions", async () => {
  const { store, state } = fakeStore({ home: "<p>a</p>" });
  const tools = createTools(store);
  state.restoreImpl = () => Promise.reject(new VersionConflict(7));
  const conflict = await tools.restore_revision({ slug: "home", version: 1, base_version: 3 });
  assert(conflict.isError);
  assertStringIncludes(conflict.text, "base_version=7");
  state.restoreImpl = () => Promise.reject(new RevisionNotFound());
  const missing = await tools.restore_revision({ slug: "home", version: 99, base_version: 1 });
  assert(missing.isError);
  assertStringIncludes(missing.text, "list_revisions");
  state.restoreImpl = () => Promise.resolve(4);
  const ok = await tools.restore_revision({ slug: "home", version: 1, base_version: 3 });
  assertStringIncludes(ok.text, "Restored version 1 as version 4");
});

Deno.test("guard turns unexpected errors into tool errors", async () => {
  const r = await guard(() => Promise.reject({ message: "boom" }));
  assert(r.isError);
  assertStringIncludes(r.text, "boom");
});

Deno.test("read_prototype pages inside a minified line with start_char", async () => {
  const { store } = fakeStore({ min: "z".repeat(50_000) });
  const tools = createTools(store);
  const first = await tools.read_prototype({ slug: "min" });
  assertStringIncludes(first.text, "start_line=1, start_char=40000");
  const rest = await tools.read_prototype({ slug: "min", start_line: 1, start_char: 40_000 });
  assertStringIncludes(rest.text, "from char 40000");
  assert(!rest.text.includes("more:"));
});
