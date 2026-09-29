// Keeps each prototype attached to its Linear issue as a link, the way Figma
// and GitHub show up on an issue. Linear can't embed hub pages, so this is how
// a prototype shows up there. The hub calls it after a prototype's issue or
// title is saved, when one is deleted, and once per session when one is
// opened, which also catches changes made outside the hub.
//
// Callers must be signed-in team members. Reads the saved row, so it acts on
// what's in the database, not on what the caller says.
import { createClient } from "npm:@supabase/supabase-js@2";

const HUB_URL = Deno.env.get("HUB_URL") ?? "https://osipapa.github.io/eon-prototype-hub/";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

// Same rule as the hub: the issue URL wins, then the stored identifier.
function linearIdentifier(project: { issue_url?: string | null; issue_id?: string | null } | null) {
  const fromUrl = project?.issue_url?.match(/\/issue\/([A-Za-z][A-Za-z0-9]*-\d+)/i)?.[1];
  const id = fromUrl || project?.issue_id || "";
  return /^[A-Za-z][A-Za-z0-9]*-\d+$/.test(id) ? id.toUpperCase() : null;
}

// Marks links the hub made, so ones a person attached by hand are never touched.
const SOURCE = "eon-prototype-hub";

const prototypeUrl = (slug: string) => `${HUB_URL}#/p/${encodeURIComponent(slug)}`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const caller = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
  );
  const { data: { user } } = await caller.auth.getUser();
  if (!user) return json({ error: "not signed in" }, 401);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: profile } = await admin.from("profiles").select("team_id").eq("id", user.id).single();
  if (!profile?.team_id) return json({ error: "no team" }, 403);

  let token = Deno.env.get("LINEAR_API_KEY");
  if (!token) token = (await admin.rpc("get_app_secret", { secret_name: "LINEAR_API_KEY" })).data ?? undefined;
  if (!token) return json({ error: "LINEAR_API_KEY not configured" }, 501);

  const linear = async (query: string, variables: Record<string, unknown>) => {
    const res = await fetch("https://api.linear.app/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: token! },
      body: JSON.stringify({ query, variables }),
    });
    const payload = await res.json();
    if (payload.errors?.length) throw new Error(payload.errors[0].message);
    return payload.data;
  };

  try {
    const { slug, previousSlug, deleted } = await req.json();
    if (!slug || typeof slug !== "string") return json({ error: "slug required" }, 400);

    const { data: project } = deleted
      ? { data: null }
      : await admin.from("projects").select("slug,title,issue_url,issue_id")
        .eq("team_id", profile.team_id).eq("slug", slug).maybeSingle();
    const identifier = linearIdentifier(project);
    const url = prototypeUrl(slug);

    // Drop this prototype's links from issues it no longer belongs to, and any
    // left behind under an old slug.
    const stale = [url, ...(previousSlug && previousSlug !== slug ? [prototypeUrl(previousSlug)] : [])];
    let removed = 0;
    for (const link of stale) {
      const found = await linear(
        `query($url: String!) { attachmentsForURL(url: $url) { nodes { id url metadata issue { identifier } } } }`,
        { url: link },
      );
      for (const node of found.attachmentsForURL.nodes) {
        if (node.metadata?.source !== SOURCE) continue;
        if (node.url === url && identifier && node.issue?.identifier === identifier) continue;
        await linear(`mutation($id: String!) { attachmentDelete(id: $id) { success } }`, { id: node.id });
        removed++;
      }
    }

    if (!project || !identifier) return json({ removed, attached: null });

    const issue = (await linear(`query($id: String!) { issue(id: $id) { id identifier } }`, { id: identifier })).issue;
    if (!issue) return json({ removed, attached: null, error: `${identifier} not found` });

    // Creating with the same issue and URL updates the existing link.
    await linear(
      `mutation($input: AttachmentCreateInput!) { attachmentCreate(input: $input) { success } }`,
      {
        input: {
          issueId: issue.id,
          url,
          title: project.title,
          subtitle: "Prototype · Eon Design Hub",
          iconUrl: `${HUB_URL}linear-icon.png`,
          metadata: { source: SOURCE },
        },
      },
    );
    return json({ removed, attached: issue.identifier });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
