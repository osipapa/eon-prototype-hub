// Admin-only account management. Runs server-side so the service_role key
// never reaches the client. Actions:
//   create       { email, password, role? }   -> creates a confirmed user on the admin's team
//   set_password { userId, password }         -> resets a teammate's password
//   delete       { userId }                   -> deletes a teammate (not yourself)
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
    const { action, email, password, userId, role } = await req.json();

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
    const { data: me } = await admin
      .from("profiles").select("role, team_id").eq("id", user.id).single();
    if (!me || me.role !== "admin" || !me.team_id) return json({ error: "admins only" }, 403);

    // Targeted actions may only touch accounts on the caller's own team.
    const assertSameTeam = async (id: string) => {
      const { data: target } = await admin
        .from("profiles").select("team_id").eq("id", id).single();
      return target?.team_id === me.team_id;
    };

    if (action === "create") {
      if (!email || !password) return json({ error: "email and password required" }, 400);
      if (String(password).length < 8) return json({ error: "password must be at least 8 characters" }, 400);
      const { data, error } = await admin.auth.admin.createUser({
        email, password, email_confirm: true,
      });
      if (error) return json({ error: error.message }, 400);
      // The signup trigger created a (possibly team-less) profile; claim it for
      // this team with the requested role.
      const { error: profErr } = await admin.from("profiles")
        .update({ team_id: me.team_id, role: role === "admin" ? "admin" : "member" })
        .eq("id", data.user.id);
      if (profErr) return json({ error: profErr.message }, 500);
      return json({ ok: true, userId: data.user.id });
    }

    if (action === "set_password") {
      if (!userId || !password) return json({ error: "userId and password required" }, 400);
      if (String(password).length < 8) return json({ error: "password must be at least 8 characters" }, 400);
      if (!(await assertSameTeam(userId))) return json({ error: "not on your team" }, 403);
      const { error } = await admin.auth.admin.updateUserById(userId, { password });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (action === "delete") {
      if (!userId) return json({ error: "userId required" }, 400);
      if (userId === user.id) return json({ error: "you can't delete your own account" }, 400);
      if (!(await assertSameTeam(userId))) return json({ error: "not on your team" }, 403);
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    return json({ error: "unknown action" }, 400);
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
