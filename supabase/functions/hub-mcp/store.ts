// PrototypeStore over supabase-js with the caller's token: every query is RLS-scoped.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { type PrototypeStore, RevisionNotFound, VersionConflict } from "./tools.ts";

export function supabaseStore(db: SupabaseClient): PrototypeStore {
  return {
    async list() {
      const { data, error } = await db.from("projects")
        .select("slug,title,group_name,status,html_version,updated_at,html_bytes")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((row) => ({
        slug: row.slug, title: row.title, group_name: row.group_name, status: row.status,
        html_version: row.html_version, size: row.html_bytes ?? 0, updated_at: row.updated_at,
      }));
    },

    async get(slug) {
      const { data, error } = await db.from("projects")
        .select("id,slug,title,prototype_html,html_version")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data;
    },

    async swap(id, html, baseVersion) {
      const { data, error } = await db.from("projects")
        .update({ prototype_html: html })
        .eq("id", id)
        .eq("html_version", baseVersion)
        .select("html_version");
      if (error) throw error;
      return data?.length ? data[0].html_version : null;
    },

    async revisions(projectId) {
      const { data, error } = await db.from("prototype_revisions")
        .select("version,kind,source,created_at,bytes,author:profiles!prototype_revisions_author_id_fkey(full_name,email)")
        .eq("project_id", projectId)
        .order("version", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row) => {
        const author = row.author as { full_name?: string; email?: string } | null;
        return {
          version: row.version, kind: row.kind, source: row.source, created_at: row.created_at, size: row.bytes,
          author: author?.full_name || author?.email || null,
        };
      });
    },

    async restore(projectId, version, baseVersion) {
      const { data, error } = await db.rpc("restore_prototype_revision", {
        p_project: projectId, p_version: version, p_base_version: baseVersion,
      });
      if (error) {
        if (error.message?.includes("version_conflict")) throw new VersionConflict(Number(error.details) || -1);
        if (error.message?.includes("revision_not_found")) throw new RevisionNotFound();
        throw error;
      }
      return data as number;
    },
  };
}
