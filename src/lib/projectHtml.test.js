import { assertEquals } from "jsr:@std/assert@1";
import { carryHtml, htmlNeeded, htmlPending, withFetchedHtml } from "./projectHtml.js";

Deno.test("a list row with no HTML on the server is loaded, with none", () => {
  const row = carryHtml({ id: "a", html_version: 0 });
  assertEquals(row.prototype_html, null);
  assertEquals(htmlPending(row), false);
  assertEquals(htmlNeeded(row), false);
});

Deno.test("a list row with HTML on the server is pending until fetched", () => {
  const row = carryHtml({ id: "a", html_version: 3 });
  assertEquals(row.prototype_html, undefined);
  assertEquals(htmlPending(row), true);
  const loaded = withFetchedHtml(row, { id: "a", prototype_html: "<p>hi</p>", html_version: 3 });
  assertEquals(htmlPending(loaded), false);
  assertEquals(htmlNeeded(loaded), false);
});

Deno.test("a refresh keeps loaded HTML at the same version", () => {
  const held = { id: "a", html_version: 3, prototype_html: "<p>hi</p>" };
  const row = carryHtml({ id: "a", html_version: 3, title: "New" }, held);
  assertEquals(row.prototype_html, "<p>hi</p>");
  assertEquals(row.title, "New");
  assertEquals(htmlNeeded(row), false);
});

Deno.test("a newer server version keeps the old HTML on screen and asks for the new", () => {
  const held = { id: "a", html_version: 3, prototype_html: "<p>hi</p>" };
  const row = carryHtml({ id: "a", html_version: 4 }, held);
  assertEquals(row.prototype_html, "<p>hi</p>");
  assertEquals(htmlPending(row), false);
  assertEquals(htmlNeeded(row), true);
  // Stays stale across further refreshes until the fetch lands.
  assertEquals(htmlNeeded(carryHtml({ id: "a", html_version: 4 }, row)), true);
  assertEquals(htmlNeeded(withFetchedHtml(row, { prototype_html: "<p>new</p>", html_version: 4 })), false);
});

Deno.test("a row that arrives with its HTML is fresh, including a cleared one", () => {
  const held = { id: "a", html_version: 3, prototype_html: "<p>hi</p>", html_stale: true };
  assertEquals(htmlNeeded(carryHtml({ id: "a", html_version: 4, prototype_html: "<p>new</p>" }, held)), false);
  const cleared = carryHtml({ id: "a", html_version: 5, prototype_html: null }, held);
  assertEquals(cleared.prototype_html, null);
  assertEquals(htmlNeeded(cleared), false);
});

Deno.test("rows that never went through the list (dev mocks) are never pending", () => {
  assertEquals(htmlPending({ id: "a", slug: "signin" }), false);
  assertEquals(htmlPending(null), false);
});
