// Hub MCP: lets each teammate's Claude (claude.ai, desktop, Claude Code) work
// on prototype HTML as that teammate. Sign-in is Supabase Auth's OAuth 2.1
// server; every query runs under RLS with the caller's own token.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createApp } from "./app.ts";
import { decodeJwtPayload } from "./lib.ts";
import { buildServer } from "./server.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const app = createApp({
  functionUrl: `${SUPABASE_URL}/functions/v1/hub-mcp`,
  authServerUrl: `${SUPABASE_URL}/auth/v1`,
  authenticate: async (token) => {
    const db = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await db.auth.getUser(token);
    if (error || !data?.user) return null;
    return { db, user: data.user, claims: decodeJwtPayload(token) };
  },
  buildServer: ({ db, user, claims }) => buildServer(db, user, claims),
});

Deno.serve(app.fetch);
