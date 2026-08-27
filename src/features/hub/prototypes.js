/* Prototype builders, media registry, and hub palettes.
   A project row with `prototype_html` renders that HTML directly. Projects whose
   slug matches a built-in builder (signin, dashboard) render from code so the
   seed works before any HTML is uploaded. */

export const HUB = {
  // Neutral shadcn-style surfaces do the structural work. The vivid Eon accent
  // stays a supporting brand cue, while primary actions use high-contrast ink.
  //
  // Dark elevation ladder, deepest first. Every surface picks the rung that
  // matches how far it sits from the page, so borders stop carrying the whole
  // structure on their own:
  //   bg      base       the canvas well and inset cards
  //   nav     primary    chrome: sidebar, toolbar, context panel
  //   panel   elevated   floating bars, menus, sheets, cards
  //   raised  control    inputs, segment tracks, counters inside a panel
  dark: { bg: "#000000", nav: "#0D0D0D", panel: "#1A1A1A", raised: "#262626", border: "rgba(255,255,255,0.10)",
    text: "#FAFAFA", muted: "#A1A1AA", secondary: "rgba(250,250,250,0.72)",
    hover: "#262626", active: "#1F1F1F", brand: "#F19DFF",
    primary: "#E8E8E8", primaryText: "#141414",
    selected: "#1A1A1A", selectedText: "#FAFAFA" },
  light: { bg: "#FAFAFA", nav: "#FFFFFF", panel: "#FFFFFF", raised: "#F2F2F2", border: "rgba(0,0,0,0.10)",
    text: "#171717", muted: "#737373", secondary: "rgba(23,23,23,0.72)",
    hover: "#F2F2F2", active: "#ECECEC", brand: "#B400CF",
    primary: "#171717", primaryText: "#FAFAFA",
    selected: "#FFFFFF", selectedText: "#171717" },
};

export const VIEWPORTS = {
  desktop: { label: "Desktop", w: 1440, h: 900 },
  laptop: { label: "Laptop", w: 1280, h: 800 },
  tablet: { label: "Tablet", w: 834, h: 1112 },
  mobile: { label: "Mobile", w: 390, h: 780 },
};

export const STATUS_COLOR = {
  "In review": ["rgba(114,167,255,0.17)", "#72A7FF", "#245FD1"],
  "Handoff": ["rgba(255,179,79,0.17)", "#FFB34F", "#9A4A00"],
  "Shipped": ["rgba(98,229,139,0.16)", "#62E58B", "#147A36"],
};

export const CANVAS_PRESETS = ["#FFFFFF", "#000000"];

// Preset placeholder photos available in every prototype as {{token}} without
// any setup. Seeded picsum URLs so each token always resolves to the same
// image. A saved asset with the same key (Media library) overrides the preset.
export const PRESET_MEDIA = {
  heroImage: "https://picsum.photos/seed/eon-hero/1600/900",
  bannerImage: "https://picsum.photos/seed/eon-banner/1600/500",
  cardImage: "https://picsum.photos/seed/eon-card/800/600",
  portraitImage: "https://picsum.photos/seed/eon-portrait/900/1200",
  squareImage: "https://picsum.photos/seed/eon-square/800/800",
  thumbnailImage: "https://picsum.photos/seed/eon-thumb/480/320",
  avatarImage: "https://picsum.photos/seed/eon-avatar/320/320",
  productImage: "https://picsum.photos/seed/eon-product/1000/1000",
};

const DATA_IMAGE_URL = /^data:image\/(?:avif|gif|jpe?g|png|svg\+xml|webp)(?:;charset=[a-z0-9_-]+)?(?:;base64)?,/i;

// Assets are team-editable and some logo helpers return HTML strings. Keep URL
// validation at that boundary so a pasted javascript: URL or quote cannot turn
// into executable markup in the hub. Relative URLs remain supported for assets
// deployed alongside the app; data URLs are restricted to image MIME types.
export function safeMediaUrl(value) {
  const candidate = typeof value === "string" ? value.trim() : "";
  if (!candidate) return "";
  if (DATA_IMAGE_URL.test(candidate)) {
    return candidate.replace(/[\u0000-\u0020\u007f"'<>`]/g, (character) =>
      `%${character.charCodeAt(0).toString(16).padStart(2, "0").toUpperCase()}`);
  }
  if (/[\u0000-\u0020\u007f"'<>`]/.test(candidate)) return "";
  try {
    const parsed = new URL(candidate, "https://eon.invalid/");
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? candidate : "";
  } catch {
    return "";
  }
}

function escapeMarkup(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function boundedDimension(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(4096, Math.max(1, Math.round(number))) : fallback;
}

export const MEDIA = {
  logos: {
    eon: (stroke = "#FFFFFF", brand = "#F19DFF", img) => {
      const src = safeMediaUrl(img);
      return src
        ? `<img src="${escapeMarkup(src)}" alt="logo" style="width:24px;height:24px;border-radius:6px;object-fit:cover"/>`
        : `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="${escapeMarkup(stroke)}" stroke-width="2"/><path d="M12 4 A8 8 0 0 1 12 20" stroke="${escapeMarkup(brand)}" stroke-width="2"/></svg>`;
    },
    acme: (size = 32, radius = 8, bg = "#4F46E5", img) => {
      const safeSize = boundedDimension(size, 32);
      const safeRadius = Math.min(safeSize, boundedDimension(radius, 8));
      const src = safeMediaUrl(img);
      return src
        ? `<img src="${escapeMarkup(src)}" alt="logo" style="width:${safeSize}px;height:${safeSize}px;border-radius:${safeRadius}px;object-fit:cover"/>`
        : `<div style="width:${safeSize}px;height:${safeSize}px;border-radius:${safeRadius}px;background:${escapeMarkup(bg)};display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:${Math.round(safeSize * 0.44)}px">A</div>`;
    },
  },
  avatar: (initials = "SL", bg = "#1E1E22", fg = "#9094A5", size = 32) =>
    `<div style="width:${boundedDimension(size, 32)}px;height:${boundedDimension(size, 32)}px;border-radius:50%;background:${escapeMarkup(bg)};display:flex;align-items:center;justify-content:center;color:${escapeMarkup(fg)};font-size:12px;font-weight:600">${escapeMarkup(initials)}</div>`,
  placeholder: (w = 320, h = 180, label, bg = "#E5E7EB", fg = "#94A3B8") => {
    const width = boundedDimension(w, 320);
    const height = boundedDimension(h, 180);
    const txt = escapeMarkup(label || `${width}×${height}`);
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}'><rect width='100%' height='100%' fill='${escapeMarkup(bg)}'/><path d='M0 0L${width} ${height}M${width} 0L0 ${height}' stroke='${escapeMarkup(fg)}' stroke-width='1' opacity='.35'/><text x='50%' y='50%' fill='${escapeMarkup(fg)}' font-family='sans-serif' font-size='14' text-anchor='middle' dominant-baseline='middle'>${txt}</text></svg>`;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  },
};

function proto(theme) {
  return theme === "dark"
    ? { bg: "#0B1120", card: "#111827", border: "#1F2937", text: "#F1F5F9", muted: "#94A3B8",
        primary: "#6366F1", pText: "#fff", input: "#0F172A", hover: "#1E293B",
        gFill: "#052E16", gText: "#4ADE80", bFill: "#172554", bText: "#60A5FA",
        rFill: "#450A0A", rText: "#F87171", nFill: "#1E293B", nText: "#94A3B8" }
    : { bg: "#F8FAFC", card: "#FFFFFF", border: "#E2E8F0", text: "#0F172A", muted: "#64748B",
        primary: "#4F46E5", pText: "#fff", input: "#FFFFFF", hover: "#F1F5F9",
        gFill: "#DCFCE7", gText: "#166534", bFill: "#DBEAFE", bText: "#1D4ED8",
        rFill: "#FEE2E2", rText: "#B91C1C", nFill: "#F1F5F9", nText: "#475569" };
}

function docWrap(body, p) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
*{margin:0;padding:0;box-sizing:border-box;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
body{background:${p.bg};color:${p.text};-webkit-font-smoothing:antialiased}
a{color:${p.primary};text-decoration:none}
.btn{height:40px;padding:0 16px;border-radius:8px;background:${p.primary};color:${p.pText};font-size:14px;font-weight:500;border:none;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:8px}
.btn.block{width:100%}.btn.ghost{background:transparent;color:${p.text};border:1px solid ${p.border}}
.inp{width:100%;height:40px;border:1px solid ${p.border};border-radius:8px;background:${p.input};padding:0 12px;font-size:14px;color:${p.text}}
.inp::placeholder{color:${p.muted}}.inp.err{border-color:${p.rText}}
.pill{display:inline-flex;align-items:center;gap:5px;height:22px;padding:0 9px;border-radius:100px;font-size:12px;font-weight:500}
.dot{width:6px;height:6px;border-radius:50%}
.spin{width:16px;height:16px;border:2px solid rgba(255,255,255,.4);border-top-color:#fff;border-radius:50%;animation:s .7s linear infinite}
@keyframes s{to{transform:rotate(360deg)}}
.sk{background:${p.hover};border-radius:6px;animation:pulse 1.4s ease-in-out infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.45}}
</style></head><body>${body}</body></html>`;
}

function signIn({ theme, state, media = {} }) {
  const p = proto(theme);
  const err = state === "error", loading = state === "loading";
  const body = `
  <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px">
    <div style="width:100%;max-width:380px">
      <div style="display:flex;align-items:center;gap:10px;justify-content:center;margin-bottom:24px">
        ${MEDIA.logos.acme(32, 8, p.primary, media.acmeLogo)}<span style="font-size:18px;font-weight:600">Acme</span>
      </div>
      <div style="background:${p.card};border:1px solid ${p.border};border-radius:12px;padding:28px">
        <h1 style="font-size:20px;font-weight:600;text-align:center">Sign in to your account</h1>
        <p style="font-size:13px;color:${p.muted};text-align:center;margin-top:6px">Welcome back. Enter your details.</p>
        ${err ? `<div style="margin-top:18px;background:${p.rFill};color:${p.rText};font-size:13px;padding:10px 12px;border-radius:8px">Incorrect email or password.</div>` : ""}
        <div style="margin-top:18px"><label style="font-size:13px;font-weight:500;display:block;margin-bottom:6px">Email</label>
          <input class="inp ${err ? "err" : ""}" placeholder="you@company.com" value="${err ? "sam@acme.co" : ""}"/></div>
        <div style="margin-top:14px"><div style="display:flex;justify-content:space-between;margin-bottom:6px">
          <label style="font-size:13px;font-weight:500">Password</label><a style="font-size:12px">Forgot password?</a></div>
          <input class="inp ${err ? "err" : ""}" type="password" placeholder="••••••••" value="${err ? "wrongpass" : ""}"/></div>
        <button class="btn block" style="margin-top:20px" ${loading ? "disabled" : ""}>${loading ? `<span class="spin"></span> Signing in...` : "Sign in"}</button>
        <div style="display:flex;align-items:center;gap:12px;margin:18px 0;color:${p.muted};font-size:12px"><span style="flex:1;height:1px;background:${p.border}"></span>or<span style="flex:1;height:1px;background:${p.border}"></span></div>
        <button class="btn ghost block" style="margin-bottom:8px">Continue with Google</button>
        <button class="btn ghost block">Continue with SSO</button>
        <p style="font-size:13px;color:${p.muted};text-align:center;margin-top:18px">Don't have an account? <a>Sign up</a></p>
      </div>
    </div>
  </div>`;
  return docWrap(body, p);
}

function dashboard({ theme, plan, state, media = {} }) {
  const p = proto(theme);
  const pro = plan === "pro", empty = state === "empty", loading = state === "loading";
  const stat = (label, val, delta) => `
    <div style="background:${p.card};border:1px solid ${p.border};border-radius:12px;padding:16px">
      <div style="font-size:13px;color:${p.muted}">${label}</div>
      ${loading ? `<div class="sk" style="height:26px;width:70%;margin-top:8px"></div>`
        : `<div style="font-size:24px;font-weight:600;margin-top:4px">${val}</div><div style="font-size:12px;color:${p.gText};margin-top:2px">${delta}</div>`}
    </div>`;
  const firstCard = pro ? stat("MRR", "$48,200", "+12.4% MoM")
    : `<div style="background:${p.primary};border-radius:12px;padding:16px;color:#fff"><div style="font-size:13px;opacity:.9">You're on Free</div><div style="font-size:16px;font-weight:600;margin-top:4px">Upgrade to Pro</div><div style="font-size:12px;opacity:.85;margin-top:2px">Unlock revenue analytics</div></div>`;
  const rows = [["Northwind Traders","Pro","active",pro?"$1,200":"N/A","2h ago"],["Globex Corp","Pro","trialing",pro?"$0":"N/A","5m ago"],["Initech","Starter","past_due",pro?"$240":"N/A","1d ago"],["Umbrella Inc","Pro","active",pro?"$980":"N/A","just now"],["Hooli","Starter","canceled",pro?"$0":"N/A","6d ago"]];
  const pillMap = { active:[p.gFill,p.gText,"Active"], trialing:[p.bFill,p.bText,"Trialing"], past_due:[p.rFill,p.rText,"Past due"], canceled:[p.nFill,p.nText,"Canceled"] };
  const tableInner = empty
    ? `<div style="padding:56px 24px;text-align:center"><div style="width:44px;height:44px;border-radius:12px;background:${p.hover};margin:0 auto"></div><div style="font-size:15px;font-weight:600;margin-top:14px">No customers yet</div><div style="font-size:13px;color:${p.muted};margin-top:4px">Invite your first customer.</div><button class="btn" style="margin-top:16px">Add customer</button></div>`
    : loading
    ? [0,1,2,3,4].map(()=>`<div style="display:flex;gap:12px;padding:14px 16px;border-top:1px solid ${p.border}"><div class="sk" style="height:16px;flex:2"></div><div class="sk" style="height:16px;flex:1"></div><div class="sk" style="height:16px;flex:1"></div></div>`).join("")
    : `<table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="text-align:left;color:${p.muted}"><th style="padding:10px 16px;font-weight:500">Customer</th><th style="padding:10px 16px;font-weight:500">Plan</th><th style="padding:10px 16px;font-weight:500">Status</th><th style="padding:10px 16px;font-weight:500">MRR</th><th style="padding:10px 16px;font-weight:500">Last active</th></tr></thead><tbody>${rows.map(r=>{const[f,t,lbl]=pillMap[r[2]];return `<tr style="border-top:1px solid ${p.border}"><td style="padding:12px 16px;font-weight:500">${r[0]}</td><td style="padding:12px 16px;color:${p.muted}">${r[1]}</td><td style="padding:12px 16px"><span class="pill" style="background:${f};color:${t}"><span class="dot" style="background:${t}"></span>${lbl}</span></td><td style="padding:12px 16px">${r[3]}</td><td style="padding:12px 16px;color:${p.muted}">${r[4]}</td></tr>`;}).join("")}</tbody></table>`;
  const body = `
  <div style="display:flex;min-height:100vh">
    <aside style="width:220px;background:${p.card};border-right:1px solid ${p.border};padding:16px 12px;flex-shrink:0">
      <div style="display:flex;align-items:center;gap:8px;padding:4px 8px 18px">${MEDIA.logos.acme(28,7,p.primary,media.acmeLogo)}<span style="font-weight:600">Acme</span></div>
      ${["Home","Analytics","Customers","Billing","Settings"].map((n,i)=>`<div style="display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:8px;font-size:14px;margin-bottom:2px;${i===2?`background:${p.hover};font-weight:500`:`color:${p.muted}`}"><span style="width:16px;height:16px;border-radius:4px;background:${i===2?p.primary:p.border};display:block"></span>${n}</div>`).join("")}
    </aside>
    <div style="flex:1;min-width:0">
      <header style="height:56px;border-bottom:1px solid ${p.border};display:flex;align-items:center;gap:16px;padding:0 24px;background:${p.card}">
        <div class="inp" style="max-width:280px;display:flex;align-items:center;color:${p.muted};font-size:13px">Search customers...</div><div style="flex:1"></div>${MEDIA.avatar("SL",p.hover,p.muted)}
      </header>
      <main style="padding:24px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px"><div><h1 style="font-size:22px;font-weight:600">Customers</h1><p style="font-size:13px;color:${p.muted};margin-top:2px">Overview of your account activity</p></div><button class="btn">+ New customer</button></div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px">${firstCard}${stat("Active users","3,481","+4.1% WoW")}${stat("Churn","1.8%","-0.3% MoM")}${stat("Trials","62","+9 this week")}</div>
        <div style="background:${p.card};border:1px solid ${p.border};border-radius:12px;overflow:hidden"><div style="padding:14px 16px;font-size:15px;font-weight:600;border-bottom:${empty||loading?"none":"1px solid "+p.border}">Recent customers</div>${tableInner}</div>
      </main>
    </div>
  </div>`;
  return docWrap(body, p);
}

const BUILDERS = {
  signin: (args, theme, media) => signIn({ theme, ...args, media }),
  dashboard: (args, theme, media) => dashboard({ theme, ...args, media }),
};

// Render a project to HTML. Uploaded prototype_html wins (decorated so the hub's
// theme + control args reach it); else a built-in builder by slug; else a
// friendly placeholder. `args` overrides the stored defaults (live controls).
export function renderStory(project, theme, media = {}, args) {
  const a = args || currentArgs(project);
  if (project?.prototype_html) return decorateUploadedHtml(project.prototype_html, theme, a, media);
  const builder = BUILDERS[project?.slug];
  if (builder) return builder(a, theme, media);
  const p = proto(theme);
  return docWrap(
    `<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;color:${p.muted};font-family:sans-serif;text-align:center;padding:40px">
       <div><div style="font-size:16px;color:${p.text};font-weight:600">No prototype uploaded</div>
       <div style="font-size:13px;margin-top:6px">Add prototype_html to this project or match a built-in builder.</div></div></div>`, p);
}

// Uploaded HTML is arbitrary, so we cannot restyle it. We can still drive the
// theming/state hooks it's most likely to read. This prepends a script (runs
// before the prototype's own scripts) that reflects the hub's theme + args onto
// the document: `.dark`/`.light` class, data-theme / data-color-mode, CSS
// color-scheme, a forced prefers-color-scheme via matchMedia, and each control
// value as data-<key> plus window.__story = { theme, args }.
export function decorateUploadedHtml(html, theme, args = {}, media = {}) {
  html = replaceMediaTokens(html, media);
  const s = JSON.stringify({ theme, args });
  const script = `<script>(function(){var s=${s};
function apply(){[document.documentElement,document.body].forEach(function(el){if(!el)return;el.classList.remove('light','dark');el.classList.add(s.theme);el.setAttribute('data-theme',s.theme);el.setAttribute('data-color-mode',s.theme);});
if(document.documentElement){document.documentElement.style.colorScheme=s.theme;Object.keys(s.args||{}).forEach(function(k){document.documentElement.setAttribute('data-'+k,String(s.args[k]));});}}
try{var mm=window.matchMedia?window.matchMedia.bind(window):null;window.matchMedia=function(q){if(/prefers-color-scheme/i.test(q)){var asksDark=/dark/i.test(q),isDark=s.theme==='dark',m=asksDark?isDark:!isDark;return{matches:m,media:q,onchange:null,addListener:function(){},removeListener:function(){},addEventListener:function(){},removeEventListener:function(){},dispatchEvent:function(){return false;}};}return mm?mm(q):{matches:false,media:q,onchange:null,addListener:function(){},removeListener:function(){},addEventListener:function(){},removeEventListener:function(){},dispatchEvent:function(){return false;}};};}catch(e){}
window.__story=s;apply();document.addEventListener('DOMContentLoaded',apply);})();</script>`;
  if (/<head[^>]*>/i.test(html)) return html.replace(/<head[^>]*>/i, (m) => m + script);
  if (/<html[^>]*>/i.test(html)) return html.replace(/<html[^>]*>/i, (m) => m + script);
  return script + html;
}

// Map media tokens in uploaded HTML to the shared library so logos/images stay
// in sync. Supported tokens (use in src="…", CSS url(), or anywhere):
//   {{eonLogo}} {{acmeLogo}} {{anyAssetKey}}  -> that asset's URL
//   {{heroImage}} {{cardImage}} … (PRESET_MEDIA) -> preset photo, overridable
//   {{placeholder:320x180}} {{placeholder:320x180:Label}} -> a generated image
// Unknown tokens are left untouched.
export function replaceMediaTokens(html, media = {}) {
  return String(html).replace(/\{\{\s*([^}]+?)\s*\}\}/g, (m, raw) => {
    const token = raw.trim();
    const ph = token.match(/^placeholder:(\d+)x(\d+)(?::(.*))?$/i);
    if (ph) return MEDIA.placeholder(+ph[1], +ph[2], (ph[3] || "").trim());
    if (media[token]) return safeMediaUrl(media[token]) || m;
    if (PRESET_MEDIA[token]) return PRESET_MEDIA[token];
    return m;
  });
}

// Optional in-HTML config: a prototype can declare its own controls + defaults via
//   <script type="application/json" id="eon-config">{ "controls":[…], "defaults":{…} }</script>
// so its states show up in the hub's control bar + grid without touching the DB.
export function parsePrototypeConfig(html) {
  if (!html) return {};
  const m = html.match(/<script[^>]*id=["']eon-config["'][^>]*>([\s\S]*?)<\/script>/i);
  if (!m) return {};
  try {
    const cfg = JSON.parse(m[1].trim());
    const controls = Array.isArray(cfg.controls)
      ? cfg.controls.filter((c) => c && c.key && Array.isArray(c.options))
      : undefined;
    const defaults = cfg.defaults && typeof cfg.defaults === "object" ? cfg.defaults : undefined;
    return { controls, defaults };
  } catch { return {}; }
}

// All combinations of a story's controls, e.g. plan×state -> [{plan,state},...].
// Returns null when the story has no controls.
export function stateCombos(project, cap = 16) {
  const controls = project?.controls || [];
  if (!controls.length) return null;
  const limit = Number.isFinite(cap) ? Math.max(0, Math.floor(cap)) : 16;
  if (limit === 0) return [];
  let out = [{}];
  for (const ctrl of controls) {
    const next = [];
    for (const acc of out) {
      for (const opt of ctrl.options || []) {
        next.push({ ...acc, [ctrl.key]: opt });
        if (next.length >= limit) break;
      }
      if (next.length >= limit) break;
    }
    out = next;
    if (!out.length) break;
  }
  return out;
}

// helper: merge a project's stored defaults (used when no live args passed)
export function currentArgs(project, override) {
  return { ...(project?.defaults || {}), ...(override || {}) };
}
