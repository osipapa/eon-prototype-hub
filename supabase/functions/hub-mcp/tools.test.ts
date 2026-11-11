import { assert, assertEquals, assertStringIncludes } from "jsr:@std/assert@1";
import { sha256Hex } from "./lib.ts";
import {
  createTools, guard, MAX_HTML_BYTES, type MediaStore, type NewPrototype, type ProtoRow, type PrototypeStore,
  RevisionNotFound, type RevisionSummary, SlugTaken, VersionConflict,
} from "./tools.ts";

function fakeStore(initial: Record<string, string | null>) {
  const rows = new Map<string, ProtoRow>();
  let n = 0;
  for (const [slug, html] of Object.entries(initial)) {
    rows.set(slug, { id: `id-${++n}`, slug, title: slug, prototype_html: html, html_version: html == null ? 0 : 1, controls: [], defaults: {} });
  }
  const byId = (id: string) => [...rows.values()].find((row) => row.id === id)!;
  const state = {
    swaps: 0,
    // Runs inside swap before the version check: simulates another writer.
    beforeSwap: null as null | ((row: ProtoRow) => void),
    revisionList: [] as RevisionSummary[],
    restoreImpl: (_id: string, _v: number, _b: number): Promise<number> => Promise.resolve(0),
    created: [] as NewPrototype[],
  };
  const store: PrototypeStore = {
    list: () => Promise.resolve([...rows.values()].map((row) => ({
      slug: row.slug, title: row.title, group_name: "G", status: "Exploration",
      html_version: row.html_version, size: (row.prototype_html ?? "").length, sha256: null, updated_at: "2026-09-25T00:00:00Z",
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
    create: (input) => {
      if (rows.has(input.slug)) return Promise.reject(new SlugTaken());
      state.created.push(input);
      const row: ProtoRow = {
        id: `id-${++n}`, slug: input.slug, title: input.title, prototype_html: input.prototype_html,
        html_version: input.prototype_html == null ? 0 : 1, controls: [], defaults: {},
      };
      rows.set(input.slug, row);
      return Promise.resolve({ ...row });
    },
    setStates: (id, controls, defaults) => {
      const row = byId(id);
      row.controls = controls;
      row.defaults = defaults;
      return Promise.resolve();
    },
  };
  return { store, rows, state };
}

function fakeMedia(initial: Record<string, string> = {}) {
  const assets: Record<string, string> = { ...initial };
  const uploads: { bytes: Uint8Array; type: string; filename: string }[] = [];
  const removed: string[] = [];
  const media: MediaStore = {
    assets: () => Promise.resolve({ ...assets }),
    upload: (bytes, type, filename) => {
      uploads.push({ bytes, type, filename });
      return Promise.resolve(`https://cdn.test/library/${uploads.length}-${filename}`);
    },
    saveAsset: (key, url) => { assets[key] = url; return Promise.resolve(); },
    removeFile: (url) => { removed.push(url); return Promise.resolve(); },
  };
  return { media, assets, uploads, removed };
}

// A PNG signature padded to 60 bytes: enough for sniffing and size ordering.
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...new Array(52).fill(0)]);
const b64 = (data: Uint8Array) => btoa(String.fromCharCode(...data));

Deno.test("read_prototype returns numbered lines with version and sha256", async () => {
  const { store } = fakeStore({ home: "<h1>A</h1>\n<p>B</p>" });
  const r = await createTools(store).read_prototype({ slug: "home" });
  assertEquals(r.isError, undefined);
  assertStringIncludes(r.text, "version: 1");
  assertStringIncludes(r.text, `sha256 ${await sha256Hex("<h1>A</h1>\n<p>B</p>")}`);
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

Deno.test("edit_prototype saves and reports context and sha256", async () => {
  const { store, rows } = fakeStore({ home: "<h1>A</h1>\n<p>B</p>" });
  const r = await createTools(store).edit_prototype({ slug: "home", old_string: "<p>B</p>", new_string: "<p>C</p>" });
  assertEquals(r.isError, undefined);
  assertStringIncludes(r.text, "Saved version 2");
  assertStringIncludes(r.text, "2\t<p>C</p>");
  assertStringIncludes(r.text, await sha256Hex("<h1>A</h1>\n<p>C</p>"));
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

Deno.test("multi_edit_prototype applies edits in order and saves one version", async () => {
  const { store, rows, state } = fakeStore({ home: "<h1>A</h1>\n<p>B</p>" });
  const r = await createTools(store).multi_edit_prototype({
    slug: "home",
    edits: [
      { old_string: "<p>B</p>", new_string: "<p>C</p>" },
      { old_string: "<p>C</p>", new_string: "<p>D</p><p>D</p>" }, // only matches what edit 1 wrote
      { old_string: "D", new_string: "E", replace_all: true },
    ],
  });
  assertEquals(r.isError, undefined);
  assertEquals(rows.get("home")!.prototype_html, "<h1>A</h1>\n<p>E</p><p>E</p>");
  assertEquals(rows.get("home")!.html_version, 2);
  assertEquals(state.swaps, 1);
  assertStringIncludes(r.text, "Saved version 2: 3 edits as one version (4 replacements)");
  assertStringIncludes(r.text, "in order: 1, 1, 2");
  assertStringIncludes(r.text, await sha256Hex("<h1>A</h1>\n<p>E</p><p>E</p>"));
});

Deno.test("multi_edit_prototype saves nothing when any edit fails", async () => {
  const { store, rows, state } = fakeStore({ home: "<p>a</p>" });
  const r = await createTools(store).multi_edit_prototype({
    slug: "home",
    edits: [{ old_string: "a", new_string: "b" }, { old_string: "zzz", new_string: "y" }],
  });
  assert(r.isError);
  assertStringIncludes(r.text, "Edit 2 of 2 (after edit 1)");
  assertStringIncludes(r.text, "Nothing was saved");
  assertEquals(rows.get("home")!.prototype_html, "<p>a</p>");
  assertEquals(state.swaps, 0);
});

Deno.test("multi_edit_prototype re-applies the whole batch over a concurrent save", async () => {
  const { store, rows, state } = fakeStore({ home: "<header>H</header>\n<footer>F</footer>" });
  state.beforeSwap = (row) => {
    state.beforeSwap = null;
    row.prototype_html = row.prototype_html!.replace("F", "F2");
    row.html_version += 1;
  };
  const r = await createTools(store).multi_edit_prototype({
    slug: "home",
    edits: [{ old_string: "<header>H</header>", new_string: "<header>H2</header>" }],
  });
  assertEquals(r.isError, undefined);
  assertEquals(rows.get("home")!.prototype_html, "<header>H2</header>\n<footer>F2</footer>");
  assertEquals(state.swaps, 2);
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
  assertStringIncludes(r.text, `sha256 ${await sha256Hex("<p>first</p>")}`);
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
  assertStringIncludes(ok.text, await sha256Hex("<p>a</p>"));
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

Deno.test("create_prototype derives the slug, fills defaults, and refuses a taken slug", async () => {
  const { store, state } = fakeStore({ "trip-rating": "<p>x</p>" });
  const tools = createTools(store, { hubUrl: "https://hub.test/app" });
  const r = await tools.create_prototype({ title: "Car Picker!", html: "<!doctype html>" });
  assertEquals(r.isError, undefined);
  assertStringIncludes(r.text, 'Created "Car Picker!" as car-picker · version 1');
  assertStringIncludes(r.text, "https://hub.test/app/#/p/car-picker");
  assertEquals(state.created[0], { slug: "car-picker", title: "Car Picker!", group_name: "General", status: "In review", prototype_html: "<!doctype html>" });
  const empty = await tools.create_prototype({ title: "Later", group: "Rides", status: "Exploration" });
  assertStringIncludes(empty.text, "no HTML yet");
  assertEquals(state.created[1].group_name, "Rides");
  const taken = await tools.create_prototype({ title: "Trip rating" });
  assert(taken.isError);
  assertStringIncludes(taken.text, "already has a prototype");
  const bad = await tools.create_prototype({ title: "x", slug: "Bad Slug" });
  assert(bad.isError);
});

const CONFIG_HTML = `<!doctype html><script type="application/json" id="eon-config">` +
  `{"viewport":"mobile","controls":[{"key":"state","label":"State","options":["default","loading"]}],"defaults":{"state":"default"}}</script>`;

Deno.test("get_states shows hub states overriding the file; use_file switches back", async () => {
  const { store, rows } = fakeStore({ home: CONFIG_HTML });
  rows.get("home")!.controls = [{ key: "state", label: "State", options: ["loading", "default"] }];
  const tools = createTools(store);
  const before = JSON.parse((await tools.get_states({ slug: "home" })).text);
  assertEquals(before.source, "hub");
  assertEquals(before.effective.controls[0].options, ["loading", "default"]);
  assertEquals(before.file.viewport, "mobile");
  assert(before.note);
  const cleared = await tools.set_states({ slug: "home", use_file: true });
  assertStringIncludes(cleared.text, "now uses its file's eon-config");
  assertEquals(rows.get("home")!.controls, []);
  const after = JSON.parse((await tools.get_states({ slug: "home" })).text);
  assertEquals(after.source, "file");
  assertEquals(after.effective.controls[0].options, ["default", "loading"]);
});

Deno.test("set_states validates before saving and keeps option order", async () => {
  const { store, rows } = fakeStore({ home: CONFIG_HTML });
  const tools = createTools(store);
  const bad = await tools.set_states({ slug: "home", controls: [{ key: "State", options: ["a", "a"] }] });
  assert(bad.isError);
  assertStringIncludes(bad.text, "must match");
  assertStringIncludes(bad.text, "duplicate");
  const badDefault = await tools.set_states({ slug: "home", defaults: { state: "nope" } });
  assert(badDefault.isError);
  assertStringIncludes(badDefault.text, "isn't one of its options");
  const good = await tools.set_states({
    slug: "home", controls: [{ key: "state", options: ["loading", "default", "error"] }], defaults: { state: "error" },
  });
  assertEquals(good.isError, undefined);
  assertEquals(rows.get("home")!.controls, [{ key: "state", label: "state", options: ["loading", "default", "error"] }]);
  assertEquals(rows.get("home")!.defaults, { state: "error" });
  const narrowed = await tools.set_states({ slug: "home", controls: [{ key: "state", options: ["loading"] }] });
  assertStringIncludes(narrowed.text, "Dropped saved defaults that no longer match: state");
  assertEquals(rows.get("home")!.defaults, {});
});

Deno.test("upload_media saves base64 under a key and needs replace to repoint one", async () => {
  const { store } = fakeStore({});
  const { media, assets, uploads, removed } = fakeMedia({ old: "https://cdn.test/library/0-old.png" });
  const tools = createTools(store, { media });
  const r = await tools.upload_media({ key: "car", data_base64: b64(PNG) });
  assertEquals(r.isError, undefined, r.text);
  assertStringIncludes(r.text, '<img src="{{car}}"');
  assertEquals(uploads[0].type, "image/png");
  assertEquals(uploads[0].filename, "car.png");
  assertEquals(assets.car, "https://cdn.test/library/1-car.png");
  const refused = await tools.upload_media({ key: "old", data_base64: `data:image/png;base64,${b64(PNG)}` });
  assert(refused.isError);
  assertStringIncludes(refused.text, "replace: true");
  const preset = await tools.upload_media({ key: "heroImage", data_base64: b64(PNG) });
  assert(preset.isError);
  assertStringIncludes(preset.text, "built-in preset");
  const replaced = await tools.upload_media({ key: "old", data_base64: b64(PNG), replace: true });
  assertEquals(replaced.isError, undefined);
  assertEquals(removed, ["https://cdn.test/library/0-old.png"]);
  const junk = await tools.upload_media({ key: "x", data_base64: btoa("hello") });
  assert(junk.isError);
  const both = await tools.upload_media({ key: "y" });
  assert(both.isError);
  const badKey = await tools.upload_media({ key: "{{nope}}", data_base64: b64(PNG) });
  assert(badKey.isError);
});

Deno.test("upload_media fetches https URLs only", async () => {
  const { store } = fakeStore({});
  const { media, uploads } = fakeMedia();
  const fetcher = (() => Promise.resolve(new Response(PNG, { headers: { "content-type": "image/png" } }))) as typeof fetch;
  const tools = createTools(store, { media, fetch: fetcher });
  const r = await tools.upload_media({ key: "car", url: "https://images.test/car.png" });
  assertEquals(r.isError, undefined, r.text);
  assertEquals(uploads[0].bytes.length, PNG.length);
  const http = await tools.upload_media({ key: "car2", url: "http://images.test/car.png" });
  assert(http.isError);
  assertStringIncludes(http.text, "https://");
});

Deno.test("extract_media moves every copy of an inline image to Media in one version", async () => {
  const uri = `data:image/png;base64,${b64(PNG)}`;
  const gif = "data:image/gif;base64,R0lGODlhAQABAAAAACw=";
  const html = `<img src="${uri}" alt="Car">\n<div style="background:url(${uri})"></div>\n<img src="${gif}" alt="">`;
  const { store, rows, state } = fakeStore({ home: html });
  const { media, assets, uploads } = fakeMedia();
  const r = await createTools(store, { media }).extract_media({ slug: "home", key: "car" });
  assertEquals(r.isError, undefined, r.text);
  assertEquals(rows.get("home")!.prototype_html, `<img src="{{car}}" alt="Car">\n<div style="background:url({{car}})"></div>\n<img src="${gif}" alt="">`);
  assertEquals(state.swaps, 1);
  assertEquals(uploads[0].bytes, PNG);
  assertEquals(assets.car, "https://cdn.test/library/1-car.png");
  assertStringIncludes(r.text, "2 copies");
  assertStringIncludes(r.text, "Still inline");
  assertStringIncludes(r.text, "1. image/gif");
  const none = await createTools(fakeStore({ plain: "<p>x</p>" }).store, { media }).extract_media({ slug: "plain", key: "z" });
  assert(none.isError);
});

const GOOD_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  html.dark { --bg: #000; }
  .screen { padding-top: max(59px, env(safe-area-inset-top)); padding-bottom: max(34px, env(safe-area-inset-bottom)); }
  .sheet { animation: rise 320ms ease-out; }
  @keyframes rise { from { transform: translateY(100%); } }
  @media (prefers-reduced-motion: reduce) { .sheet { animation: none; } }
  button:focus-visible { outline: 2px solid; }
</style>
<script type="application/json" id="eon-config">{"viewport":"mobile","controls":[{"key":"state","label":"State","options":["default","loading"]}],"defaults":{"state":"default"}}</script>
</head>
<body>
<main class="screen sheet"><img src="{{car}}" alt="Car"><button>Rate</button></main>
<script>const story = window.__story || { theme: "light", args: {} };</script>
<template data-eon-animation="sheet-enter" data-name="Sheet enter" data-trigger="Tapping Rate"><style>.s{animation:r 320ms}@keyframes r{from{transform:translateY(100%)}}</style><div class="s"></div></template>
</body>
</html>
`;

Deno.test("check_prototype reports guide problems for saved HTML and passes a clean draft", async () => {
  const { store } = fakeStore({ home: '<html><body><img src="{{mystery}}"></body></html>' });
  const { media } = fakeMedia({ car: "https://cdn.test/library/1-car.png" });
  const tools = createTools(store, { media });
  const saved = await tools.check_prototype({ slug: "home" });
  assertStringIncludes(saved.text, "Checked home · version 1");
  assertStringIncludes(saved.text, "Start the file with <!doctype html>");
  assertStringIncludes(saved.text, "{{mystery}}");
  const draft = await tools.check_prototype({ html: GOOD_HTML });
  assertStringIncludes(draft.text, "0 errors, 0 warnings");
  const nothing = await tools.check_prototype({});
  assert(nothing.isError);
});

Deno.test("preview_links opens each state, theme, and screen size in the hub", async () => {
  const { store, rows } = fakeStore({ home: CONFIG_HTML });
  rows.get("home")!.controls = [{ key: "state", options: ["default", "error state"] }];
  const r = await createTools(store, { hubUrl: "https://hub.test/" }).preview_links({ slug: "home", theme: "dark" });
  assertEquals(r.isError, undefined);
  assertStringIncludes(r.text, "This view: https://hub.test/#/p/home?viewport=mobile&theme=dark");
  assertStringIncludes(r.text, "Every state in one grid: https://hub.test/#/p/home?viewport=mobile&theme=dark&layout=grid&grid=states");
  assertStringIncludes(r.text, "- state=error state: https://hub.test/#/p/home?viewport=mobile&theme=dark&arg.state=error+state");
  const plain = await createTools(fakeStore({ bare: "<p>x</p>" }).store).preview_links({ slug: "bare" });
  assertStringIncludes(plain.text, "viewport=laptop&theme=light");
  assert(!plain.text.includes("Each state"));
});
