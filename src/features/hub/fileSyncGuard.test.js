import { assertEquals } from "jsr:@std/assert@1";
import { isForeignChange } from "./fileSyncGuard.js";

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
