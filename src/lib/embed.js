import { supabase } from "./supabase";
import { VIEWPORTS } from "@/features/hub/prototypes";

/* Hub links embed like Figma links do. Paste one into Notion, Confluence, or
   Miro as an embed and it renders the live prototype for anyone, signed in or
   not: #/p/<slug> shows the embed whenever the hub runs inside another page,
   and #/embed/<slug> shows it anywhere. Both read the same view params the
   address bar keeps (viewport, theme, arg.*). */

// Title, HTML, states, and media for one prototype; null when there's no such
// slug. Public on purpose (see the get_embed_prototype migration).
export async function getEmbedPrototype(slug) {
  const { data, error } = await supabase.rpc("get_embed_prototype", { p_slug: slug });
  if (error) throw error;
  return data || null;
}

export function parseEmbedParams(query) {
  const params = new URLSearchParams(query || "");
  const args = {};
  params.forEach((value, key) => {
    if (!key.startsWith("arg.")) return;
    try { args[key.slice(4)] = JSON.parse(value); }
    catch { args[key.slice(4)] = value; }
  });
  const viewport = params.get("viewport");
  const theme = params.get("theme");
  const canvas = params.get("canvas");
  return {
    viewport: VIEWPORTS[viewport] ? viewport : null,
    theme: ["light", "dark"].includes(theme) ? theme : null,
    canvas: /^#[0-9a-f]{6}$/i.test(canvas || "") ? canvas : null,
    args,
  };
}

export function embedViewQuery({ viewport, theme, args = {}, defaults = {} }) {
  const params = new URLSearchParams();
  if (viewport) params.set("viewport", viewport);
  if (theme) params.set("theme", theme);
  Object.entries(args).forEach(([key, value]) => {
    if (String(value) !== String(defaults[key])) params.set(`arg.${key}`, typeof value === "string" ? value : JSON.stringify(value));
  });
  return params.toString();
}

// The view part of a hub address (device, theme, states), without split,
// layout, or comment params that mean nothing in an embed.
export function embedQueryFromHash(hash = window.location.hash) {
  const params = new URLSearchParams(hash.split("?")[1] || "");
  const kept = new URLSearchParams();
  params.forEach((value, key) => {
    if (["viewport", "theme", "canvas"].includes(key) || key.startsWith("arg.")) kept.set(key, value);
  });
  return kept.toString();
}

const hubBase = () => `${window.location.origin}${import.meta.env.BASE_URL}`;

export function embedUrl(slug, query = "") {
  return `${hubBase()}#/embed/${encodeURIComponent(slug)}${query ? `?${query}` : ""}`;
}

export function hubPrototypeUrl(slug, query = "") {
  return `${hubBase()}#/p/${encodeURIComponent(slug)}${query ? `?${query}` : ""}`;
}
