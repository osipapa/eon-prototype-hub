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

/* Comments ---------------------------------------------------------------*/
export async function listComments() {
  const { data, error } = await supabase
    .from("comments")
    .select("*, author:profiles!comments_author_id_fkey(id,email,full_name)")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function createComment(comment) {
  const { data, error } = await supabase
    .from("comments")
    .insert(comment)
    .select("*, author:profiles!comments_author_id_fkey(id,email,full_name)")
    .single();
  if (error) throw error;
  return data;
}

export function subscribeComments(cb) {
  const ch = supabase
    .channel("comments-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "comments" }, cb)
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

// Keep every open workspace in sync when a teammate changes shared media.
export function subscribeAssets(cb) {
  const ch = supabase
    .channel("assets-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "assets" }, cb)
    .subscribe();
  return () => supabase.removeChannel(ch);
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

export async function requestProfileTutorial(id, persona) {
  if (!["designer", "operations", "engineer"].includes(persona)) {
    throw new Error("Choose a valid tutorial track.");
  }
  const requestedAt = new Date().toISOString();
  const { data, error } = await supabase
    .from("profiles")
    .update({ tutorial_persona: persona, tutorial_requested_at: requestedAt })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

/* Account management (admin) --------------------------------------------------
   Accounts are created and managed by admins only — there is no self-signup.
   The admin-users edge function holds the service_role key server-side. */
async function adminUsers(body) {
  const { data, error } = await supabase.functions.invoke("admin-users", { body });
  if (error) {
    // FunctionsHttpError hides the response body; surface the real message.
    const detail = await error.context?.json?.().catch(() => null);
    throw new Error(detail?.error || error.message);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

export const createAccount = (email, password, role = "member") =>
  adminUsers({ action: "create", email, password, role });
export const setAccountPassword = (userId, password) =>
  adminUsers({ action: "set_password", userId, password });
export const deleteAccount = (userId) =>
  adminUsers({ action: "delete", userId });

/* Linear ----------------------------------------------------------------------
   Server-side read via the linear-issue edge function (token stays in Supabase
   secrets). Returns null when the function isn't configured or the issue isn't
   found, so callers can fall back to the static preview. */
export async function fetchLinearIssue(identifier) {
  const { data, error } = await supabase.functions.invoke("linear-issue", {
    body: { identifier },
  });
  if (error || data?.error) return null;
  return data?.issue ?? null;
}
