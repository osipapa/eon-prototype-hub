// Hub MCP: lets each teammate's Claude (claude.ai, desktop, Claude Code) work
// on prototype HTML as that teammate. Sign-in is Supabase Auth's OAuth 2.1
// server; every query runs under RLS with the caller's own token.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { McpServer } from "npm:@modelcontextprotocol/sdk@1.25.3/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "npm:@modelcontextprotocol/sdk@1.25.3/server/webStandardStreamableHttp.js";
import { Hono } from "npm:hono@^4.9.7";
import { createClient, type SupabaseClient, type User } from "npm:@supabase/supabase-js@2";
import { decodeJwtPayload } from "./lib.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/hub-mcp`;
const METADATA_URL = `${FUNCTION_URL}/.well-known/oauth-protected-resource`;

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

// Tells Claude where to sign in (RFC 9728 + MCP authorization spec).
const unauthorized = () =>
  new Response(JSON.stringify({ error: "unauthorized" }), {
    status: 401,
    headers: {
      ...cors,
      "Content-Type": "application/json",
      "WWW-Authenticate": `Bearer resource_metadata="${METADATA_URL}"`,
    },
  });

type Claims = Record<string, unknown>;

function buildServer(db: SupabaseClient, user: User, claims: Claims) {
  const server = new McpServer(
    { name: "eon-hub", version: "1.0.0" },
    { instructions: "Eon Prototype Hub. Tools read and edit the team's shared prototype HTML as the signed-in teammate. Edits appear live for everyone in the hub." },
  );

  server.registerTool(
    "whoami",
    {
      title: "Who am I",
      description: "Show which hub account this connector is signed in as.",
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async () => ({
      content: [{
        type: "text" as const,
        text: JSON.stringify({ email: user.email, user_id: user.id, client_id: claims.client_id ?? null }, null, 2),
      }],
    }),
  );

  return server;
}

const app = new Hono().basePath("/hub-mcp");

app.options("*", () => new Response(null, { status: 204, headers: cors }));

app.get("/.well-known/oauth-protected-resource", (c) =>
  withCors(c.json({
    resource: FUNCTION_URL,
    authorization_servers: [`${SUPABASE_URL}/auth/v1`],
    bearer_methods_supported: ["header"],
    resource_name: "Eon Prototype Hub",
  })));

app.all("*", async (c) => {
  const token = c.req.header("Authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return unauthorized();

  const db = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await db.auth.getUser(token);
  if (error || !data?.user) return unauthorized();

  const server = buildServer(db, data.user, decodeJwtPayload(token));
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless: a fresh server per request
    enableJsonResponse: true,
  });
  await server.connect(transport);
  return withCors(await transport.handleRequest(c.req.raw));
});

Deno.serve(app.fetch);
