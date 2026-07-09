// Admin-only invite endpoint. Runs server-side so the service_role key never
// reaches the client. Upserts the email into public.invites (which gates
// signup) and sends a Supabase invite email.
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
    const { email, role = "member", redirectTo } = await req.json();
    if (!email || typeof email !== "string") return json({ error: "email required" }, 400);

    const authHeader = req.headers.get("Authorization") ?? "";
    const caller = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await caller.auth.getUser();
    if (!user) return json({ error: "not signed in" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: profile } = await admin
      .from("profiles").select("role, team_id").eq("id", user.id).single();
    if (!profile || profile.role !== "admin" || !profile.team_id) {
      return json({ error: "admins only" }, 403);
    }

    const { error: invErr } = await admin.from("invites").upsert({
      email: email.toLowerCase(),
      team_id: profile.team_id,
      role: role === "admin" ? "admin" : "member",
      invited_by: user.id,
    }, { onConflict: "email" });
    if (invErr) return json({ error: invErr.message }, 500);

    // May fail if the user already exists — the invite row still gates access,
    // so report it but don't treat it as fatal.
    const { error: mailErr } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo });
    return json({ ok: true, emailSent: !mailErr, mailError: mailErr?.message ?? null });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
