// Stores over supabase-js with the caller's token: every query is RLS-scoped.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { type MediaStore, type PrototypeStore, RevisionNotFound, SlugTaken, VersionConflict } from "./tools.ts";
import type { KbRow, KbStore } from "./kbTools.ts";

const PROTO_FIELDS = "id,slug,title,prototype_html,html_version,controls,defaults";
const LIBRARY_FOLDER = "library/";

async function teamId(db: SupabaseClient, userId: string): Promise<string> {
  const { data, error } = await db.from("profiles").select("team_id").eq("id", userId).single();
  if (error) throw error;
  return data.team_id;
}

export function supabaseStore(db: SupabaseClient, userId: string): PrototypeStore {
  return {
    async list() {
      const { data, error } = await db.from("projects")
        .select("slug,title,group_name,status,html_version,updated_at,html_bytes,html_sha256")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((row) => ({
        slug: row.slug, title: row.title, group_name: row.group_name, status: row.status,
        html_version: row.html_version, size: row.html_bytes ?? 0, sha256: row.html_sha256 ?? null, updated_at: row.updated_at,
      }));
    },

    async get(slug) {
      const { data, error } = await db.from("projects").select(PROTO_FIELDS).eq("slug", slug).maybeSingle();
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
        .select("version,kind,source,created_at,bytes,sha256:revision_sha256,author:profiles!prototype_revisions_author_id_fkey(full_name,email)")
        .eq("project_id", projectId)
        .order("version", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row) => {
        const author = row.author as { full_name?: string; email?: string } | null;
        return {
          version: row.version, kind: row.kind, source: row.source, created_at: row.created_at, size: row.bytes,
          sha256: row.sha256 ?? null, author: author?.full_name || author?.email || null,
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

    // Same row the hub's new-prototype dialog inserts (src/routes/Hub.jsx).
    async create(input) {
      const team = await teamId(db, userId);
      const { count, error: countError } = await db.from("projects").select("id", { count: "exact", head: true });
      if (countError) throw countError;
      const { data, error } = await db.from("projects")
        .insert({ ...input, team_id: team, controls: [], defaults: {}, sort_order: count ?? 0, created_by: userId })
        .select(PROTO_FIELDS)
        .single();
      if (error) {
        if (error.code === "23505") throw new SlugTaken();
        throw error;
      }
      return data;
    },

    async setStates(id, controls, defaults) {
      const { data, error } = await db.from("projects").update({ controls, defaults }).eq("id", id).select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("the prototype couldn't be updated.");
    },
  };
}

// The media library the hub's Media tab manages: files in the public media
// bucket under library/, keys in assets (src/lib/data.js does the same).
export function supabaseMediaStore(db: SupabaseClient, userId: string): MediaStore {
  const bucket = () => db.storage.from("media");
  return {
    async assets() {
      const { data, error } = await db.from("assets").select("key,url");
      if (error) throw error;
      return Object.fromEntries((data ?? []).map((row) => [row.key, row.url]));
    },

    async upload(bytes, type, filename) {
      const path = `${LIBRARY_FOLDER}${crypto.randomUUID()}-${filename}`;
      const { error } = await bucket().upload(path, bytes, { contentType: type, cacheControl: "31536000" });
      if (error) throw error;
      return bucket().getPublicUrl(path).data.publicUrl;
    },

    async saveAsset(key, url) {
      const team_id = await teamId(db, userId);
      const { error } = await db.from("assets").upsert({ team_id, key, name: key, url }, { onConflict: "team_id,key" });
      if (error) throw error;
    },

    async removeFile(url) {
      const base = bucket().getPublicUrl("").data.publicUrl;
      if (!url.startsWith(base + LIBRARY_FOLDER)) return;
      const path = decodeURI(url.slice(base.length).split(/[?#]/)[0]);
      const { error } = await bucket().remove([path]);
      if (error) throw error;
    },
  };
}

const KB_FIELDS = "id,slug,type,title,summary,group_path,status,body_md,refs,sort_order,version,updated_at";

// KbStore over supabase-js with the caller's token: RLS scopes it to their team.
export function supabaseKbStore(db: SupabaseClient, userId: string): KbStore {
  return {
    async list() {
      const { data, error } = await db.from("kb_entries").select(KB_FIELDS)
        .order("sort_order", { ascending: true }).order("title", { ascending: true });
      if (error) throw error;
      return (data ?? []) as KbRow[];
    },

    async get(slug) {
      const { data, error } = await db.from("kb_entries").select(KB_FIELDS).eq("slug", slug).maybeSingle();
      if (error) throw error;
      return data as KbRow | null;
    },

    async search(query) {
      const { data, error } = await db.from("kb_entries").select("slug")
        .textSearch("search", query, { type: "websearch", config: "english" })
        .limit(25);
      if (error) throw error;
      return (data ?? []).map((row) => row.slug);
    },

    async insert(row) {
      const team_id = await teamId(db, userId);
      const { data, error } = await db.from("kb_entries")
        .insert({ ...row, team_id, created_by: userId })
        .select(KB_FIELDS).single();
      if (error) throw error;
      return data as KbRow;
    },

    async swap(id, patch, baseVersion) {
      const { data, error } = await db.from("kb_entries").update(patch)
        .eq("id", id).eq("version", baseVersion).select(KB_FIELDS);
      if (error) throw error;
      return (data?.[0] as KbRow) ?? null;
    },
  };
}
