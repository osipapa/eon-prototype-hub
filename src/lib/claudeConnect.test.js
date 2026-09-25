import { assertEquals } from "jsr:@std/assert@1";
import { signInStatus } from "./claudeConnect.js";

Deno.test("discovery answers: Claude sign-in is ready", () => {
  assertEquals(signInStatus(200, { issuer: "https://x.supabase.co/auth/v1" }), "ready");
});

Deno.test("Supabase says the OAuth server is off", () => {
  assertEquals(signInStatus(404, { code: 404, error_code: "feature_disabled", msg: "OAuth server is disabled" }), "off");
});

Deno.test("anything else is unknown, so the guide stays quiet", () => {
  assertEquals(signInStatus(500, null), "unknown");
  assertEquals(signInStatus(404, { error_code: "not_found" }), "unknown");
});
