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

/* Prompt library -----------------------------------------------------------*/
export async function listPrompts() {
  const { data, error } = await supabase
    .from("prompts")
    .select("*")
    .order("category", { ascending: true })
    .order("title", { ascending: true });
  if (error) throw error;
  return data;
}

export async function createPrompt(prompt) {
  const { data, error } = await supabase
    .from("prompts")
    .insert(prompt)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updatePrompt(id, patch) {
  const { data, error } = await supabase
    .from("prompts")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deletePrompt(id) {
  const { error } = await supabase.from("prompts").delete().eq("id", id);
  if (error) throw error;
}

export function subscribePrompts(cb) {
  const ch = supabase
    .channel("prompts-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "prompts" }, cb)
    .subscribe();
  return () => supabase.removeChannel(ch);
}

/* Prompt categories ---------------------------------------------------------*/
export async function listPromptCategories() {
  const { data, error } = await supabase
    .from("prompt_categories")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw error;
  return data;
}

export async function createPromptCategory(category) {
  const { data, error } = await supabase
    .from("prompt_categories")
    .insert(category)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// The RPC keeps deletion atomic: prompts in the removed category are moved to
// another team category before the category row disappears.
export async function deletePromptCategory(id) {
  const { error } = await supabase.rpc("delete_prompt_category", { p_category_id: id });
  if (error) throw error;
}

export function subscribePromptCategories(cb) {
  const ch = supabase
    .channel("prompt-categories-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "prompt_categories" }, cb)
    .subscribe();
  return () => supabase.removeChannel(ch);
}

/* Comments ---------------------------------------------------------------*/
const COMMENT_SELECT =
  "*, author:profiles!comments_author_id_fkey(id,email,full_name), reactions:comment_reactions(emoji,profile_id)";

export async function listComments() {
  const { data, error } = await supabase
    .from("comments")
    .select(COMMENT_SELECT)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function createComment(comment) {
  const { data, error } = await supabase
    .from("comments")
    .insert(comment)
    .select(COMMENT_SELECT)
    .single();
  if (error) throw error;
  return data;
}

export async function addCommentReaction(reaction) {
  const { error } = await supabase.from("comment_reactions").insert(reaction);
  if (error) throw error;
}

export async function removeCommentReaction(commentId, profileId, emoji) {
  const { error } = await supabase
    .from("comment_reactions")
    .delete()
    .match({ comment_id: commentId, profile_id: profileId, emoji });
  if (error) throw error;
}

// Resolving is a team action, not an author edit, so it goes through an RPC
// (row updates are author-only under RLS). Returns the updated row.
export async function setCommentResolved(commentId, resolved) {
  const { data, error } = await supabase
    .rpc("set_comment_resolved", { comment_id: commentId, resolved })
    .single();
  if (error) throw error;
  return data;
}

export function subscribeComments(cb) {
  const ch = supabase
    .channel("comments-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "comments" }, cb)
    .on("postgres_changes", { event: "*", schema: "public", table: "comment_reactions" }, cb)
    .subscribe();
  return () => supabase.removeChannel(ch);
}

/* Activity (history + live change toasts) -----------------------------------
   Rows are self-contained (actor_name / project_title snapshotted, project_id
   carries no FK), so the History tab and toasts render without joins and keep
   working after a prototype is deleted. Written only by the projects trigger. */
export async function listActivity() {
  const { data, error } = await supabase
    .from("activity")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return data;
}

export function subscribeActivity(cb) {
  const ch = supabase
    .channel("activity-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "activity" }, cb)
    .subscribe();
  return () => supabase.removeChannel(ch);
}

/* Assets (media library) ----------------------------------------------------*/
export async function listAssets() {
  const { data, error } = await supabase.from("assets").select("*");
  if (error) throw error;
  return data;
}

// The sign-in screen has no authenticated team context yet, so it reads only
// the one asset intentionally exposed as public workspace branding.
export async function getPublicEonLogo() {
  const { data, error } = await supabase.rpc("get_public_eon_logo");
  if (error) throw error;
  return data || "";
}

export async function upsertAsset(teamId, asset) {
  const { data, error } = await supabase
    .from("assets").upsert({ team_id: teamId, ...asset }, { onConflict: "team_id,key" })
    .select().single();
  if (error) throw error;
  return data;
}

export async function deleteAsset(key) {
  const { error } = await supabase.from("assets").delete().eq("key", key);
  if (error) throw error;
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

export const MAX_COMMENT_IMAGE_BYTES = 5 * 1024 * 1024;

// Comment screenshots share the media bucket but sit under their own prefix so
// they never show up alongside curated logos in the media library.
export async function uploadCommentImage(file) {
  if (!file.type?.startsWith("image/")) throw new Error("That file isn't an image.");
  if (file.size > MAX_COMMENT_IMAGE_BYTES) throw new Error("Images need to be under 5 MB.");
  // Pasted screenshots arrive as a generic "image.png", and arbitrary filenames
  // can carry characters that make awkward storage keys.
  const safeName = (file.name || "screenshot.png").replace(/[^\w.-]+/g, "-");
  const path = `comments/${crypto.randomUUID()}-${safeName}`;
  const { error } = await supabase.storage
    .from("media").upload(path, file, { contentType: file.type });
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
