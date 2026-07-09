// Reads a Linear issue server-side so the Linear API token never reaches the
// client. Callers must be signed-in team members. Configure with:
//   Supabase dashboard → Edge Functions → Secrets → LINEAR_API_KEY = lin_api_...
// Until then this returns 501 and the app falls back to its static card.
// Looks up by human identifier (e.g. "DES-418") via team key + issue number.
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  try {
    const body = await req.json();
    const id = body.identifier || body.issueId;
    if (!id || typeof id !== "string") return json({ error: "identifier required" }, 400);
    const m = id.match(/^([A-Za-z][A-Za-z0-9]*)-(\d+)$/);
    if (!m) return json({ error: "identifier must look like TEAM-123" }, 400);
    const teamKey = m[1].toUpperCase();
    const number = Number(m[2]);

    const caller = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
    );
    const { data: { user } } = await caller.auth.getUser();
    if (!user) return json({ error: "not signed in" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: profile } = await admin
      .from("profiles").select("team_id").eq("id", user.id).single();
    if (!profile?.team_id) return json({ error: "no team" }, 403);

    const token = Deno.env.get("LINEAR_API_KEY");
    if (!token) return json({ error: "LINEAR_API_KEY not configured" }, 501);

    const res = await fetch("https://api.linear.app/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: token },
      body: JSON.stringify({
        query: `query Issue($team: String!, $number: Float!) {
          issues(filter: { team: { key: { eq: $team } }, number: { eq: $number } }, first: 1) {
            nodes { identifier title url updatedAt state { name color type } assignee { name displayName } }
          }
        }`,
        variables: { team: teamKey, number },
      }),
    });
    const payload = await res.json();
    const issue = payload?.data?.issues?.nodes?.[0];
    if (!issue) return json({ error: payload?.errors?.[0]?.message ?? "issue not found" }, 404);
    return json({ issue });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
