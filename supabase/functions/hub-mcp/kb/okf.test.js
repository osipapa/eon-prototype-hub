import { assert, assertEquals, assertStringIncludes } from "jsr:@std/assert@1";
import {
  backlinks, entryProblems, expandForAgent, headings, okfBundle, okfFile, okfIndex, validateRefs,
} from "./okf.js";

const entry = (slug, body_md, extra = {}) => ({
  slug, type: "reference", title: slug, summary: "", group_path: "Foundations", status: "published",
  body_md, refs: [], sort_order: 0, ...extra,
});

Deno.test("headings: h2/h3 only, ids dedupe, fenced code ignored", () => {
  const md = "# Title\n## Space tokens\n```\n## not a heading\n```\n### `space.100` usage\n## Space tokens";
  assertEquals(headings(md), [
    { depth: 2, text: "Space tokens", id: "space-tokens", line: 2 },
    { depth: 3, text: "space.100 usage", id: "space-100-usage", line: 6 },
    { depth: 2, text: "Space tokens", id: "space-tokens-1", line: 7 },
  ]);
});

Deno.test("validateRefs flags missing entries and sections, from refs and body links", () => {
  const entries = [
    entry("spacing", "## Scale\ntext"),
    entry("cards", "See [scale](kb:spacing#scale) and [gone](kb:spacing#nope).", { refs: ["radius"] }),
  ];
  assertEquals(validateRefs(entries), [
    { from: "cards", ref: "radius", problem: "missing-entry" },
    { from: "cards", ref: "spacing#nope", problem: "missing-section" },
  ]);
});

Deno.test("backlinks lists referencing entries with anchors", () => {
  const entries = [entry("spacing", "## Scale"), entry("cards", "x", { refs: ["spacing#scale"] }), entry("other", "x")];
  const links = backlinks(entries, "spacing");
  assertEquals(links.map((link) => [link.entry.slug, link.anchors]), [["cards", ["scale"]]]);
});

Deno.test("expandForAgent turns fences into tables and appends tracking data once", () => {
  const md = "## Space\n```tokens:space\n```\n```eon:tracking\nmixpanel-overview\n```\n```eon:tracking\nmixpanel-plan\n```\n```js\nkeep()\n```";
  const text = expandForAgent(md);
  assertStringIncludes(text, "| --spacing-8 | 1× | 0.5rem | 8px |");
  assertStringIncludes(text, "```js\nkeep()\n```");
  assertEquals(text.match(/## Reference data/g)?.length, 1);
  assertStringIncludes(text, "MIXPANEL_TRACKING_EXAMPLE");
  assert(!text.includes("WEBSITE_ATTRIBUTION"));
});

Deno.test("okfFile has typed frontmatter and the title", () => {
  const file = okfFile(entry("spacing", "## Scale", { refs: ["radius#use"], summary: "The 8px grid." }));
  assert(file.startsWith('---\ntype: "reference"\ntitle: "spacing"\nslug: "spacing"\n'));
  assertStringIncludes(file, 'refs:\n  - "radius#use"');
  assertStringIncludes(file, "# spacing\n\nThe 8px grid.\n\n## Scale");
});

Deno.test("okfIndex lists published entries by group; bundle has index first", () => {
  const entries = [entry("spacing", ""), entry("draft-page", "", { status: "draft" }), entry("handoff", "", { group_path: "Linear", type: "howto" })];
  const index = okfIndex(entries);
  assertStringIncludes(index, 'entries:\n  - "handoff.md"\n  - "spacing.md"');
  assertStringIncludes(index, "## Linear\n\n- [handoff](handoff.md) · `howto`");
  assert(!index.includes("draft-page"));
  assertEquals(okfBundle(entries).map((file) => file.path), ["index.md", "handoff.md", "spacing.md"]);
});

Deno.test("entryProblems checks slug, type, and fence names", () => {
  assertEquals(entryProblems(entry("ok", "```tokens:space\n```")), []);
  const problems = entryProblems({ ...entry("Bad Slug", "```tokens:nope\n```\n```eon:nope\n```"), type: "x" });
  assertEquals(problems.length, 4);
});
