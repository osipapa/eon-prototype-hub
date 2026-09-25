// HTTP layer for the hub MCP: protected-resource metadata, the bearer check
// that sends Claude to sign in, and a stateless MCP transport per request.
// Auth and the MCP server are injected, so tests run without Supabase.
import type { McpServer } from "npm:@modelcontextprotocol/sdk@1.25.3/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "npm:@modelcontextprotocol/sdk@1.25.3/server/webStandardStreamableHttp.js";
import { Hono } from "npm:hono@^4.9.7";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, mcp-protocol-version, mcp-session-id",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Expose-Headers": "WWW-Authenticate, Mcp-Session-Id",
};

const withCors = (response: Response) => {
  for (const [key, value] of Object.entries(cors)) response.headers.set(key, value);
  return response;
};

export type AppOptions<Ctx> = {
  functionUrl: string;
  authServerUrl: string;
  // Resolves a bearer token to the caller's context, or null when invalid.
  authenticate: (token: string) => Promise<Ctx | null>;
  buildServer: (ctx: Ctx) => McpServer;
};

export function createApp<Ctx>({ functionUrl, authServerUrl, authenticate, buildServer }: AppOptions<Ctx>) {
  const metadataUrl = `${functionUrl}/.well-known/oauth-protected-resource`;

  // Tells Claude where to sign in (RFC 9728 + MCP authorization spec).
  const unauthorized = () =>
    new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: {
        ...cors,
        "Content-Type": "application/json",
        "WWW-Authenticate": `Bearer resource_metadata="${metadataUrl}"`,
      },
    });

  const app = new Hono().basePath("/hub-mcp");

  app.options("*", () => new Response(null, { status: 204, headers: cors }));

  app.get("/.well-known/oauth-protected-resource", (c) =>
    withCors(c.json({
      resource: functionUrl,
      authorization_servers: [authServerUrl],
      bearer_methods_supported: ["header"],
      resource_name: "Eon Prototype Hub",
    })));

  app.all("*", async (c) => {
    const token = c.req.header("Authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) return unauthorized();
    const ctx = await authenticate(token);
    if (!ctx) return unauthorized();

    // Stateless: there is no session to stream to (GET) or end (DELETE). The
    // SDK would hold a GET stream open until the platform kills the worker.
    if (c.req.method !== "POST") {
      return withCors(new Response(
        JSON.stringify({ jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed." }, id: null }),
        { status: 405, headers: { "Content-Type": "application/json", Allow: "POST" } },
      ));
    }

    const server = buildServer(ctx);
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // stateless: a fresh server per request
      enableJsonResponse: true,
    });
    await server.connect(transport);
    return withCors(await transport.handleRequest(c.req.raw));
  });

  return app;
}
