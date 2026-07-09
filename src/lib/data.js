import { supabase } from "./supabase";

/* Projects (stories) --------------------------------------------------------*/
export async function listProjects() {
  const { data, error } = await supabase
    .from("projects").select("*").order("sort_order", { ascending: true });
  if (error) throw error;
  return data;
}

export async function patchProject(id, patch) {
  const { data, error } = await supabase
    .from("projects").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function createProject(project) {
  const { data, error } = await supabase.from("projects").insert(project).select().single();
  if (error) throw error;
  return data;
}

export async function deleteProject(id) {
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw error;
}

// Realtime: fire cb() on any change to projects for this team (RLS-filtered).
export function subscribeProjects(cb) {
  const ch = supabase
    .channel("projects-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "projects" }, cb)
    .subscribe();
  return () => supabase.removeChannel(ch);
}

/* Assets (media library) ----------------------------------------------------*/
export async function listAssets() {
  const { data, error } = await supabase.from("assets").select("*");
  if (error) throw error;
  return data;
}

export async function upsertAsset(teamId, asset) {
  const { data, error } = await supabase
    .from("assets").upsert({ team_id: teamId, ...asset }, { onConflict: "team_id,key" })
    .select().single();
  if (error) throw error;
  return data;
}

// Upload a File to Storage, return its public URL.
export async function uploadMedia(file) {
  const path = `${crypto.randomUUID()}-${file.name}`;
  const { error } = await supabase.storage.from("media").upload(path, file);
  if (error) throw error;
  const { data } = supabase.storage.from("media").getPublicUrl(path);
  return data.publicUrl;
}

/* Profiles (admin dashboard) ------------------------------------------------*/
export async function listProfiles() {
  const { data, error } = await supabase
    .from("profiles").select("*").order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function setProfileRole(id, role) {
  const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
  if (error) throw error;
}

/* Invites (admin) -------------------------------------------------------------
   Signup is invite-gated: uninvited accounts get no team and see no data.
   The `invite` edge function upserts the row and emails the invite, keeping
   the service_role key server-side. */
export async function listInvites() {
  const { data, error } = await supabase
    .from("invites").select("*").order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function sendInvite(email, role = "member") {
  const { data, error } = await supabase.functions.invoke("invite", {
    body: { email, role, redirectTo: window.location.origin + window.location.pathname },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function removeInvite(email) {
  const { error } = await supabase.from("invites").delete().eq("email", email);
  if (error) throw error;
}

/* Linear ----------------------------------------------------------------------
   Server-side read via the linear-issue edge function (token stays in Supabase
   secrets). Returns null when the function isn't configured or the issue isn't
   found, so callers can fall back to the static preview. */
export async function fetchLinearIssue(issueId) {
  const { data, error } = await supabase.functions.invoke("linear-issue", {
    body: { issueId },
  });
  if (error || data?.error) return null;
  return data?.issue ?? null;
}
