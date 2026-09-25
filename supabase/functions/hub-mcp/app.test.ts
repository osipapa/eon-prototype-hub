import { assert, assertEquals, assertStringIncludes } from "jsr:@std/assert@1";
import { McpServer } from "npm:@modelcontextprotocol/sdk@1.25.3/server/mcp.js";
import { createApp } from "./app.ts";

const FUNCTION_URL = "https://example.supabase.co/functions/v1/hub-mcp";
const app = createApp({
  functionUrl: FUNCTION_URL,
  authServerUrl: "https://example.supabase.co/auth/v1",
  authenticate: (token) => Promise.resolve(token === "good" ? { who: "tester" } : null),
  buildServer: () => {
    const server = new McpServer({ name: "test", version: "1.0.0" });
    server.registerTool("ping", { description: "ping", inputSchema: {} }, () =>
      Promise.resolve({ content: [{ type: "text" as const, text: "pong" }] }));
    return server;
  },
});

const call = (method: string, headers: Record<string, string> = {}, body?: unknown, path = "/hub-mcp") =>
  app.fetch(new Request(`http://localhost${path}`, {
    method,
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  }));

Deno.test("no bearer: 401 pointing Claude at the protected-resource metadata", async () => {
  const res = await call("POST", {}, { jsonrpc: "2.0", id: 1, method: "tools/list" });
  await res.body?.cancel();
  assertEquals(res.status, 401);
  assertStringIncludes(res.headers.get("www-authenticate") ?? "", `resource_metadata="${FUNCTION_URL}/.well-known/oauth-protected-resource"`);
});

Deno.test("invalid bearer: 401", async () => {
  const res = await call("POST", { authorization: "Bearer nope" }, { jsonrpc: "2.0", id: 1, method: "tools/list" });
  await res.body?.cancel();
  assertEquals(res.status, 401);
});

Deno.test("metadata names the Supabase auth server", async () => {
  const res = await call("GET", {}, undefined, "/hub-mcp/.well-known/oauth-protected-resource");
  const json = await res.json();
  assertEquals(json.authorization_servers, ["https://example.supabase.co/auth/v1"]);
  assertEquals(json.resource, FUNCTION_URL);
});

Deno.test("GET with a valid token is 405, not a stream that never closes", async () => {
  const res = await call("GET", { authorization: "Bearer good" });
  await res.body?.cancel();
  assertEquals(res.status, 405);
  assertEquals(res.headers.get("allow"), "POST");
});

Deno.test("DELETE with a valid token is 405 (no sessions to end)", async () => {
  const res = await call("DELETE", { authorization: "Bearer good" });
  await res.body?.cancel();
  assertEquals(res.status, 405);
});

Deno.test("POST tools/list with a valid token lists the tools", async () => {
  const res = await call("POST", { authorization: "Bearer good", "mcp-protocol-version": "2025-06-18" },
    { jsonrpc: "2.0", id: 1, method: "tools/list" });
  assertEquals(res.status, 200);
  const json = await res.json();
  assert(json.result.tools.some((tool: { name: string }) => tool.name === "ping"));
});
