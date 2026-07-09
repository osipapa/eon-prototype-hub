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
