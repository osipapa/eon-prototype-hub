// Phone mirror sign-in handoff. The desktop tab showing the "Open on your
// phone" QR asks for a one-time sign-in token for its own user; the phone that
// scans the code redeems it (verifyOtp) and lands signed in, no password.
// Tokens are single-use, and each new one replaces the last, so the desktop
// rotates them while the QR is open. The service_role key stays server-side.
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
    const caller = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
    );
    const { data: { user } } = await caller.auth.getUser();
    if (!user?.email) return json({ error: "not signed in" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    // Only team members get a handoff: the same gate the hub's data sits behind.
    const { data: profile } = await admin
      .from("profiles").select("team_id").eq("id", user.id).single();
    if (!profile?.team_id) return json({ error: "no team" }, 403);

    // generateLink sends no email; it only mints the token.
    const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email: user.email });
    if (error) return json({ error: error.message }, 500);
    return json({ tokenHash: data.properties.hashed_token });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
