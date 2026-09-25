import { assert, assertEquals, assertStringIncludes } from "jsr:@std/assert@1";
import { applyEdit, clipAround, contextAround, decodeJwtPayload, PAGE_CHAR_BUDGET, pageLines, searchLines } from "./lib.ts";

const b64url = (value: unknown) =>
  btoa(JSON.stringify(value)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");

Deno.test("decodeJwtPayload reads the claims of an OAuth token", () => {
  const token = `${b64url({ alg: "HS256" })}.${b64url({ sub: "u1", client_id: "c1" })}.sig`;
  assertEquals(decodeJwtPayload(token), { sub: "u1", client_id: "c1" });
});

Deno.test("decodeJwtPayload: session token without client_id", () => {
  const token = `${b64url({ alg: "HS256" })}.${b64url({ sub: "u1", role: "authenticated" })}.sig`;
  assertEquals(decodeJwtPayload(token).client_id, undefined);
});

Deno.test("decodeJwtPayload returns {} for garbage", () => {
  assertEquals(decodeJwtPayload("not-a-jwt"), {});
  assertEquals(decodeJwtPayload("a.!!!.c"), {});
  assertEquals(decodeJwtPayload(""), {});
});

Deno.test("applyEdit replaces a unique match", () => {
  const r = applyEdit("<h1>Hi</h1><p>x</p>", "<h1>Hi</h1>", "<h1>Hello</h1>");
  assertEquals(r, { ok: true, html: "<h1>Hello</h1><p>x</p>", count: 1, firstIndex: 0 });
});

Deno.test("applyEdit refuses a missing match", () => {
  const r = applyEdit("<p>a</p>", "<p>b</p>", "<p>c</p>");
  assertEquals(r.ok, false);
  if (!r.ok) assertStringIncludes(r.error, "not found");
});

Deno.test("applyEdit refuses an ambiguous match unless replace_all", () => {
  const r = applyEdit("<li>a</li><li>a</li>", "<li>a</li>", "<li>b</li>");
  assertEquals(r.ok, false);
  if (!r.ok) assertStringIncludes(r.error, "matches 2 places");
  const all = applyEdit("<li>a</li><li>a</li>", "<li>a</li>", "<li>b</li>", true);
  assertEquals(all, { ok: true, html: "<li>b</li><li>b</li>", count: 2, firstIndex: 0 });
});

Deno.test("applyEdit refuses empty and identical strings", () => {
  assertEquals(applyEdit("abc", "", "x").ok, false);
  assertEquals(applyEdit("abc", "b", "b").ok, false);
});

Deno.test("pageLines numbers lines and pages by budget", () => {
  const html = ["a", "b", "c", "d"].join("\n");
  const first = pageLines(html, 1, undefined, 8); // "1\ta\n" = 4 chars per row
  assertEquals(first.text, "1\ta\n2\tb");
  assertEquals(first.nextStartLine, 3);
  assertEquals(first.totalLines, 4);
  const rest = pageLines(html, 3, undefined, 8);
  assertEquals(rest.text, "3\tc\n4\td");
  assertEquals(rest.nextStartLine, null);
});

Deno.test("pageLines chunks a line longer than the budget", () => {
  const html = "x".repeat(100_000);
  const first = pageLines(html);
  assertEquals(first.text.length, 40_002); // "1\t" + 40k chars
  assertEquals(first.nextStartLine, 1);
  assertEquals(first.nextStartChar, 40_000);
  const last = pageLines(html, 1, undefined, PAGE_CHAR_BUDGET, 80_000);
  assertEquals(last.text.length, 20_002);
  assertEquals(last.startChar, 80_000);
  assertEquals(last.nextStartLine, null);
});

Deno.test("pageLines continues past a chunked line", () => {
  const html = ["a", "y".repeat(50), "b"].join("\n");
  const p1 = pageLines(html, 1, undefined, 20);
  assertEquals(p1.text, "1\ta");
  assertEquals([p1.nextStartLine, p1.nextStartChar], [2, 0]);
  const p2 = pageLines(html, 2, undefined, 20);
  assertEquals(p2.text, "2\t" + "y".repeat(20));
  assertEquals([p2.nextStartLine, p2.nextStartChar], [2, 20]);
  const p3 = pageLines(html, 2, undefined, 20, 40);
  assertEquals(p3.text, "2\t" + "y".repeat(10) + "\n3\tb");
  assertEquals(p3.nextStartLine, null);
});

Deno.test("pageLines clamps out-of-range lines", () => {
  const page = pageLines("a\nb", 9, 2);
  assertEquals(page.startLine, 2);
  assertEquals(page.text, "2\tb");
});

Deno.test("searchLines finds plain and regex matches", () => {
  const html = "<h1>Title</h1>\n<p>body</p>\n<h2>Sub</h2>";
  assertEquals(searchLines(html, "<h"), { total: 2, matches: [{ line: 1, text: "<h1>Title</h1>" }, { line: 3, text: "<h2>Sub</h2>" }] });
  const re = searchLines(html, "<h[12]>S", true);
  assert(!("error" in re));
  if (!("error" in re)) assertEquals(re.matches, [{ line: 3, text: "<h2>Sub</h2>" }]);
  assert("error" in searchLines(html, "(", true));
  assert("error" in searchLines(html, ""));
});

Deno.test("searchLines caps matches but counts all", () => {
  const html = Array.from({ length: 80 }, () => "hit").join("\n");
  const r = searchLines(html, "hit");
  assert(!("error" in r));
  if (!("error" in r)) { assertEquals(r.matches.length, 50); assertEquals(r.total, 80); }
});

Deno.test("clipAround keeps the hit in view", () => {
  const line = "a".repeat(500) + "HIT" + "b".repeat(500);
  const clipped = clipAround(line, 500, 100);
  assertStringIncludes(clipped, "HIT");
  assert(clipped.startsWith("…") && clipped.endsWith("…"));
  assertEquals(clipAround("short", 0, 100), "short");
});

Deno.test("contextAround shows numbered lines around the change, clipped on minified lines", () => {
  const html = ["l1", "l2", "l3", "l4", "l5", "l6", "l7"].join("\n");
  assertEquals(contextAround(html, html.indexOf("l4")), "2\tl2\n3\tl3\n4\tl4\n5\tl5\n6\tl6");
  const minified = "a".repeat(2000) + "CHANGED" + "b".repeat(2000);
  const ctx = contextAround(minified, 2000);
  assertStringIncludes(ctx, "CHANGED");
  assert(ctx.length < 400);
});
