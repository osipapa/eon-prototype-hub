import { assertEquals } from "jsr:@std/assert@1";
import { decodeJwtPayload } from "./lib.ts";

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
