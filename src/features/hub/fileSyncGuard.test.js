import { assertEquals } from "jsr:@std/assert@1";
import { isForeignChange, reconnectPlan } from "./fileSyncGuard.js";

Deno.test("a newer version we did not publish is foreign", () => {
  assertEquals(isForeignChange(5, 4, new Set()), true);
});

Deno.test("our own published version is not foreign (realtime echo)", () => {
  assertEquals(isForeignChange(5, 4, new Set([5])), false);
});

Deno.test("same or older versions are not foreign (stale events)", () => {
  assertEquals(isForeignChange(4, 4, new Set()), false);
  assertEquals(isForeignChange(3, 4, new Set()), false);
});

Deno.test("missing versions never conflict (older rows, previews)", () => {
  assertEquals(isForeignChange(undefined, 4, new Set()), false);
  assertEquals(isForeignChange(5, undefined, new Set()), false);
});

Deno.test("while our own publish is in flight, a newer version is not judged yet", () => {
  // Realtime can deliver our own write before the publish response lands.
  assertEquals(isForeignChange(5, 4, new Set(), true), false);
  assertEquals(isForeignChange(5, 4, new Set(), false), true);
});

Deno.test("reconnect: a file matching the server just resumes at the server's version", () => {
  assertEquals(reconnectPlan({ storedBase: 3, fileContent: "<p>x</p>", serverHtml: "<p>x</p>", serverVersion: 7 }),
    { baseVersion: 7, conflict: false });
});

Deno.test("reconnect: nobody saved since we last synced, so the file publishes", () => {
  assertEquals(reconnectPlan({ storedBase: 7, fileContent: "<p>mine</p>", serverHtml: "<p>x</p>", serverVersion: 7 }),
    { baseVersion: 7, conflict: false });
});

Deno.test("reconnect: someone saved while we were away, so it pauses instead of overwriting", () => {
  assertEquals(reconnectPlan({ storedBase: 5, fileContent: "<p>mine</p>", serverHtml: "<p>theirs</p>", serverVersion: 7 }),
    { baseVersion: 5, conflict: true });
});

Deno.test("reconnect: no remembered version and the file differs, so it asks", () => {
  assertEquals(reconnectPlan({ storedBase: undefined, fileContent: "<p>mine</p>", serverHtml: "<p>theirs</p>", serverVersion: 7 }),
    { baseVersion: 7, conflict: true });
});
