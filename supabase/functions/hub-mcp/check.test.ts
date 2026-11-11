import { assert, assertEquals } from "jsr:@std/assert@1";
import { checkPrototype, effectiveStates, type Finding, readConfig } from "./check.ts";

const page = (body: string, head = "", config = '{"viewport":"desktop"}') => `<!doctype html>
<html class="light">
<head><style>html.dark{color-scheme:dark}</style>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<script type="application/json" id="eon-config">${config}</script>
${head}
</head>
<body>
${body}
</body>
</html>`;

const messages = (findings: Finding[], level?: Finding["level"]) =>
  findings.filter((f) => !level || f.level === level).map((f) => f.message).join("\n");
const has = (findings: Finding[], text: string, level?: Finding["level"]) => messages(findings, level).includes(text);

Deno.test("a minimal page that follows the guide has no findings", () => {
  assertEquals(checkPrototype(page("<p>Hi</p>")), []);
});

Deno.test("deliverable: doctype, fence, meta tags, local files", () => {
  const findings = checkPrototype('```html\n<html><body><img src="images/car.png" alt="Car"><script src="./app.js"></script></body></html>\n```');
  assert(has(findings, "Markdown fence", "error"));
  assert(has(findings, "End the file with </html>"));
  assert(has(findings, 'Add <meta charset="utf-8">'));
  assert(has(findings, "References local files (images/car.png, ./app.js)", "error"));
  const fine = checkPrototype(page('<img src="https://x.test/a.png" alt="A"><img src="data:image/png;base64,iVBORw0KGgo=" alt="B"><img src="${u}" alt="C">'));
  assert(!has(fine, "References local files"));
});

Deno.test("states: invalid JSON, bad viewport, keys, defaults, and the 16-state cap", () => {
  assert(has(checkPrototype(page("", "", "{ controls: [] }")), "isn't valid JSON", "error"));
  const findings = checkPrototype(page("", "", JSON.stringify({
    viewport: "watch",
    controls: [
      { key: "Plan", options: ["a", "b", "c"] },
      { key: "state", options: ["x", "y", "z"] },
      { key: "size", options: ["s", "m"] },
    ],
    defaults: { state: "w", missing: "a" },
  })));
  assert(has(findings, 'viewport "watch"', "error"));
  assert(has(findings, 'key "Plan" must match', "error"));
  assert(has(findings, "18 state combinations", "error"));
  assert(has(findings, 'defaults.state "w" isn\'t one of its options', "error"));
  assert(has(findings, "defaults.missing has no matching control", "error"));
  assert(has(checkPrototype(page("", "", "{}")), 'no "viewport"', "warning"));
});

Deno.test("states: saved hub states override the file and unread states are flagged", () => {
  const config = JSON.stringify({ viewport: "desktop", controls: [{ key: "state", options: ["a", "b"] }], defaults: { state: "a" } });
  const html = page("<p>x</p>", "", config);
  const findings = checkPrototype(html, { savedControls: [{ key: "state", options: ["b", "a"] }], savedDefaults: { state: "b" } });
  assert(has(findings, "override this file's eon-config", "warning"));
  assert(has(findings, "Defaults saved in the hub override the file's: state=b (file: a)"));
  assert(has(findings, "switching state changes nothing"));
  assert(!has(checkPrototype(page('<p data-x="1">x</p>', "<style>[data-state=b]{color:red}</style>", config)), "changes nothing"));
});

Deno.test("effectiveStates mirrors the hub: saved controls win, saved defaults on top", () => {
  const config = readConfig(page("", "", JSON.stringify({ controls: [{ key: "a", options: ["1", "2"] }], defaults: { a: "1" } })));
  assertEquals(effectiveStates([], {}, config).source, "file");
  const saved = effectiveStates([{ key: "b", options: ["x"] }], { a: "2" }, config);
  assertEquals(saved.source, "hub");
  assertEquals(saved.controls, [{ key: "b", options: ["x"] }]);
  assertEquals(saved.defaults, { a: "2" });
  assertEquals(effectiveStates(undefined, undefined, { present: false }).source, "none");
});

Deno.test("media: unknown tokens, videos in img, resolved URLs, large inline images", () => {
  const big = "A".repeat(80_000);
  const findings = checkPrototype(page(
    `<img src="{{car}}" alt="Car"><img src="{{clip}}" alt="Clip"><img src="{{nope}}" alt="N"><img src="{{placeholder:320x180:Hero}}" alt="P">` +
      `<img src="data:image/png;base64,${big}" alt="A"><img src="data:image/png;base64,${big}" alt="B">` +
      `<img src="https://abc.supabase.co/storage/v1/object/public/media/library/1-car.png" alt="C">`,
  ), { assets: { car: "https://x.test/car.png", clip: "https://x.test/clip.mp4" } });
  assert(has(findings, "{{nope}} isn't a saved media key", "error"));
  assert(!has(findings, "{{car}} isn't"));
  assert(!has(findings, "placeholder"));
  assert(has(findings, "{{clip}} is a video"));
  assert(has(findings, "resolved Media library URL"));
  assert(has(findings, "Inline image/png of 59 KB, stored 2 times"));
});

Deno.test("maps need classic workers", () => {
  const findings = checkPrototype(page('<script src="https://api.mapbox.com/mapbox-gl-js/v3.9.0/mapbox-gl.js"></script>'));
  assert(has(findings, "workerClass", "error"));
  const fixed = checkPrototype(page('<script src="https://api.mapbox.com/mapbox-gl-js/v3.9.0/mapbox-gl.js"></script><script>mapboxgl.workerClass = function () {};</script>'));
  assert(!has(fixed, "workerClass"));
});

Deno.test("mobile prototypes respect safe areas and skip the status bar", () => {
  const findings = checkPrototype(page("<div>9:41</div>", "", '{"viewport":"mobile"}'));
  assert(has(findings, "safe-area-inset-top"));
  assert(has(findings, "safe-area-inset-bottom"));
  assert(has(findings, "painted status bar"));
  assert(!has(checkPrototype(page("<div>9:41</div>")), "safe-area"));
});

Deno.test("motion needs reduced-motion handling and well-formed demos", () => {
  const motion = "<style>.a{animation:spin 1s}@keyframes spin{to{transform:rotate(1turn)}}</style>";
  const bare = checkPrototype(page("<i class=\"a\"></i>", motion));
  assert(has(bare, "prefers-reduced-motion fallback"));
  assert(has(bare, "declares no <template data-eon-animation>"));
  const demos = checkPrototype(page(
    `<template data-eon-animation="Spin Fast"></template>` +
      `<template data-eon-animation="spin" data-name="Spin" data-trigger="Load"><img src="{{car}}" alt=""></template>` +
      `<template data-eon-animation="spin" data-name="Spin" data-trigger="Load"><style>@media (prefers-reduced-motion){}</style></template>`,
    motion + "<style>@media (prefers-reduced-motion: reduce){.a{animation:none}}</style>",
  ));
  assert(has(demos, 'Animation id "Spin Fast" must be kebab-case', "error"));
  assert(has(demos, 'Animation "Spin Fast" has no data-name'));
  assert(has(demos, 'Animation "Spin Fast" has no data-trigger'));
  assert(has(demos, 'Animation id "spin" is used twice', "error"));
  assert(has(demos, 'Animation "spin" uses a {{media token}}', "error"));
  assert(has(demos, "demos always play"));
  assert(!has(demos, "{{car}} isn't"), "tokens inside demos are reported once, as a demo problem");
  assert(!has(demos, "declares no <template"));
});

Deno.test("accessibility and sandbox warnings", () => {
  const findings = checkPrototype(page('<img src="https://x.test/a.png"><button>Go</button><script>localStorage.setItem("a", "1"); top.location = "/";</script>'));
  assert(has(findings, "1 <img> without alt text"));
  assert(has(findings, "No :focus-visible styles"));
  assert(has(findings, "Uses browser storage"));
  assert(has(findings, "parent page"));
});

Deno.test("findings list errors first and carry line numbers", () => {
  const findings = checkPrototype(page('<img src="{{nope}}" alt="x">', "", '{"viewport":"mobile"}'));
  assertEquals(findings[0].level, "error");
  assertEquals(findings[0].line, 10);
});
