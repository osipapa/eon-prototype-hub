import { supabase } from "./supabase";

/* Phone mirror. A desktop tab shows a QR code; the phone that scans it opens
   #/mirror/<session> and follows what that tab shows. The channel is named
   after a random per-tab session id and only carries which prototype, state,
   and theme to show: the phone loads the prototype itself, through the normal
   row-level security. The dev preview swaps in a BroadcastChannel so two local
   tabs can stand in for desktop and phone.

   desktop → phone  view   { slug, args, theme }
   phone → desktop  hello  just joined: send what you're showing
   phone → desktop  here   every few seconds, so the desktop knows it's there */

const SESSION_KEY = "eon-mirror-session";
export const MIRROR_PING_MS = 4000;

// One session per tab, kept across reloads so a connected phone stays connected.
export function mirrorSessionId() {
  try {
    const saved = window.sessionStorage.getItem(SESSION_KEY);
    if (saved) return saved;
    const id = crypto.randomUUID();
    window.sessionStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

export function openMirrorChannel(sessionId, { transport = "supabase", onMessage }) {
  if (transport === "local") {
    const channel = new BroadcastChannel(`eon-mirror:${sessionId}`);
    channel.onmessage = (event) => onMessage?.(event.data?.event, event.data?.payload);
    return {
      send: (event, payload = {}) => channel.postMessage({ event, payload }),
      close: () => channel.close(),
    };
  }
  const channel = supabase.channel(`mirror:${sessionId}`, { config: { broadcast: { self: false } } });
  let ready = false;
  let queued = [];
  ["view", "hello", "here"].forEach((event) => {
    channel.on("broadcast", { event }, ({ payload }) => onMessage?.(event, payload));
  });
  channel.subscribe((status) => {
    if (status !== "SUBSCRIBED") return;
    ready = true;
    queued.forEach(([event, payload]) => channel.send({ type: "broadcast", event, payload }));
    queued = [];
  });
  return {
    send: (event, payload = {}) => {
      if (ready) channel.send({ type: "broadcast", event, payload });
      else queued = [...queued.filter(([name]) => name !== event), [event, payload]];
    },
    close: () => supabase.removeChannel(channel),
  };
}

export function mirrorUrl(sessionId, view, { preview = false } = {}) {
  const params = new URLSearchParams();
  if (view?.slug) params.set("p", view.slug);
  if (view?.theme) params.set("theme", view.theme);
  Object.entries(view?.args || {}).forEach(([key, value]) => params.set(`arg.${key}`, JSON.stringify(value)));
  const base = `${window.location.origin}${import.meta.env.BASE_URL}`;
  return preview
    ? `${base}?mirror-preview=${sessionId}&${params}`
    : `${base}#/mirror/${sessionId}?${params}`;
}

// The view a phone starts on before the desktop answers: whatever the QR held.
export function parseMirrorParams(query) {
  const params = new URLSearchParams(query || "");
  const args = {};
  params.forEach((value, key) => {
    if (!key.startsWith("arg.")) return;
    try { args[key.slice(4)] = JSON.parse(value); }
    catch { args[key.slice(4)] = value; }
  });
  const theme = params.get("theme");
  return {
    slug: params.get("p") || null,
    theme: ["light", "dark"].includes(theme) ? theme : "dark",
    args,
  };
}
