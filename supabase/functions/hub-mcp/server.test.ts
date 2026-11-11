import { assert, assertEquals } from "jsr:@std/assert@1";
import type { SupabaseClient, User } from "npm:@supabase/supabase-js@2";
import { createApp } from "./app.ts";
import { buildServer } from "./server.ts";

const app = createApp({
  functionUrl: "https://example.supabase.co/functions/v1/hub-mcp",
  authServerUrl: "https://example.supabase.co/auth/v1",
  authenticate: () => Promise.resolve({}),
  buildServer: () => buildServer({} as SupabaseClient, { id: "u1", email: "tester@example.com" } as User, {}),
});

Deno.test("initialize names the hub and serves the Eon icon from public/", async () => {
  const res = await app.fetch(new Request("http://localhost/hub-mcp", {
    method: "POST",
    headers: { authorization: "Bearer good", "content-type": "application/json", accept: "application/json, text/event-stream" },
    body: JSON.stringify({
      jsonrpc: "2.0", id: 1, method: "initialize",
      params: { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "test", version: "1.0.0" } },
    }),
  }));
  const { serverInfo } = (await res.json()).result;
  assertEquals(serverInfo.name, "eon-hub");
  assertEquals(serverInfo.icons.map((icon: { mimeType: string }) => icon.mimeType), ["image/png", "image/svg+xml"]);
  for (const { src } of serverInfo.icons) {
    assert(src.startsWith(serverInfo.websiteUrl), `${src} is not on the hub`);
    const file = new URL(`../../../public/${src.slice(serverInfo.websiteUrl.length)}`, import.meta.url);
    assert((await Deno.stat(file)).isFile, `public/ has no ${file.pathname}`);
  }
});
