import { MAPBOX, PRESET_MEDIA, VIEWPORTS, safeMediaUrl } from "./prototypes.js";

const CONTROL_KEY = /^[a-z][a-z0-9_-]*$/;
const MEDIA_KEY = /^[A-Za-z0-9][A-Za-z0-9_.-]*$/;
const BRIEF_LIMIT = 1600;

function sourceRevision(value) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function dimensionsFromUrl(value) {
  const match = String(value).match(/\/(\d+)\/(\d+)(?:[/?#]|$)/);
  return match ? [Number(match[1]), Number(match[2])] : undefined;
}

function availableMediaTokens(assets = {}) {
  const tokens = Object.entries(PRESET_MEDIA).map(([key, presetUrl]) => {
    const override = safeMediaUrl(assets[key]);
    return {
      key,
      source: override ? "shared override" : "built-in preset",
      dimensions: dimensionsFromUrl(presetUrl),
      ...(override ? { revision: sourceRevision(override) } : {}),
    };
  });

  Object.keys(assets)
    .filter((key) => MEDIA_KEY.test(key) && !PRESET_MEDIA[key] && safeMediaUrl(assets[key]))
    .sort((left, right) => left.localeCompare(right))
    .forEach((key) => tokens.push({
      key,
      source: "shared asset",
      revision: sourceRevision(safeMediaUrl(assets[key])),
    }));

  return tokens;
}

function normalizedControls(controls = []) {
  if (!Array.isArray(controls)) return [];
  return controls
    .filter((control) => control && typeof control.key === "string" && Array.isArray(control.options))
    .map((control) => ({
      key: control.key,
      label: control.label || control.key,
      options: control.options,
    }));
}

function stateCombinationCount(controls) {
  if (!controls.length) return 0;
  return controls.reduce((total, control) => total * Math.max(1, control.options.length), 1);
}

function boundedBrief(value) {
  const brief = typeof value === "string" ? value.trim() : "";
  if (brief.length <= BRIEF_LIMIT) return brief || undefined;
  return `${brief.slice(0, BRIEF_LIMIT)}… [truncated]`;
}

export function buildSetupPrompt({
  project,
  controls = project?.controls,
  defaults = project?.defaults,
  currentArgs = defaults,
  assets = {},
  theme = "light",
  viewport = "laptop",
  controlSource: requestedControlSource,
} = {}) {
  const effectiveControls = normalizedControls(controls);
  const effectiveDefaults = defaults && typeof defaults === "object" ? defaults : {};
  const liveArgs = currentArgs && typeof currentArgs === "object" ? currentArgs : effectiveDefaults;
  const combinations = stateCombinationCount(effectiveControls);
  const controlSource = requestedControlSource || (project?.controls?.length
    ? "stored project controls (these override embedded eon-config controls)"
    : effectiveControls.length
      ? "embedded eon-config"
      : "none");
  const activeViewport = VIEWPORTS[viewport] || VIEWPORTS.laptop;
  const mapboxBase = `https://api.mapbox.com/mapbox-gl-js/v${MAPBOX.glVersion}`;

  const context = {
    contractVersion: 3,
    activePrototype: project ? {
      title: project.title || "Untitled prototype",
      slug: project.slug || null,
      group: project.group_name || "General",
      reviewStage: project.status || null,
      reviewBrief: boundedBrief(project.notes),
    } : null,
    controlSource,
    effectiveControls,
    effectiveDefaults,
    currentArgs: liveArgs,
    stateCombinationCount: combinations,
    currentTheme: ["light", "dark"].includes(theme) ? theme : "light",
    currentViewport: {
      key: VIEWPORTS[viewport] ? viewport : "laptop",
      label: activeViewport.label,
      width: activeViewport.w,
      height: activeViewport.h,
    },
    supportedViewports: Object.fromEntries(
      Object.entries(VIEWPORTS).map(([key, value]) => [key, { width: value.w, height: value.h }]),
    ),
    // Measured off the iPhone 17 Pro mockup the hub frames the mobile viewport
    // with. Points, at the 402x874 mobile size.
    mobileSafeArea: {
      device: "iPhone 17 Pro",
      top: 59,
      bottom: 34,
      left: 0,
      right: 0,
      dynamicIsland: { width: 124, height: 36, offsetFromScreenTop: 14, centeredHorizontally: true },
    },
    availableMediaTokens: availableMediaTokens(assets),
    maps: !MAPBOX.accessToken ? null : {
      provider: "Mapbox GL JS",
      script: `${mapboxBase}/mapbox-gl.js`,
      stylesheet: `${mapboxBase}/mapbox-gl.css`,
      accessToken: MAPBOX.accessToken,
      style: MAPBOX.style,
      lightPresetByTheme: { light: "day", dark: "night" },
    },
  };

  const combinationWarning = combinations > 16
    ? `\nIMPORTANT: the current controls produce ${combinations} combinations. The hub renders at most 16 state tiles. Reduce or consolidate options unless the brief explicitly requires all of them.`
    : "";
  const defaultLiteral = JSON.stringify(effectiveDefaults);
  const mapsSection = MAPBOX.accessToken ? `5) MAPS
- Mapbox is always available. When a screen shows a place, a route, a pickup or drop-off point, or a vehicle's location, use a real Mapbox map rather than a screenshot, a static image, or a drawn placeholder.
- Use maps from the generated context verbatim: put <link rel="stylesheet" href="${mapboxBase}/mapbox-gl.css"> in the head and <script src="${mapboxBase}/mapbox-gl.js"></script> before your own script. The token is a public browser token, so write it into the HTML as given.
- Start Mapbox's workers as classic workers before creating the map. The hub's frame has an opaque origin, where Mapbox's default module workers cannot start and the map never loads. Follow the hub theme through the Standard style's light preset, and derive the camera from args so every state renders the same way each time:
    const workerUrl = mapboxgl.workerUrl;
    mapboxgl.workerClass = function () { return new Worker(workerUrl); };
    const map = new mapboxgl.Map({
      container: "map",
      accessToken: "${MAPBOX.accessToken}",
      style: "${MAPBOX.style}",
      center: [-73.9857, 40.7484],
      zoom: 13,
      config: { basemap: { lightPreset: story.theme === "dark" ? "night" : "day" } },
    });
- Default to New York unless the brief names somewhere else. Use fixed mock coordinates for places, routes, and the user's position; the sandbox has no geolocation, so never call navigator.geolocation.
- Create at most one map per document, and skip intro fly-to animations; the hub reloads the frame on every state change and the state grid can render 16 frames at once.
- Draw markers as HTML elements (new mapboxgl.Marker({ element })) styled with the prototype's own tokens, and routes as a GeoJSON line layer added on the map's load event.
- The map is a full-bleed background: it runs edge to edge under the Dynamic Island and the home indicator, while text, sheets, and controls stay inside the safe areas.
- Keep the Mapbox logo and attribution visible; the terms require them. Compact attribution in a corner clear of the home indicator is fine.
- If mapboxgl is missing, mapboxgl.supported() is false, or the map emits an error before load, keep a neutral background in the map's tones so the rest of the flow still works.` : `5) MAPS
- Maps are not configured in this build of the hub. When a screen needs a map, use a neutral placeholder background and say so in a visible note.`;

  return `Build or update one polished, interactive UI prototype for the Eon Prototype Hub. Return a single self-contained HTML document that works both standalone and inside the hub's sandboxed iframe.

CURRENT WORKSPACE CONTEXT, GENERATED AT COPY TIME
Treat this JSON as the source of truth for hub integration. Product requirements in reviewBrief are intentional; do not reinterpret media revisions as URLs or hardcode them.
${JSON.stringify(context, null, 2)}${combinationWarning}

1) DELIVERABLE
- Return raw HTML beginning with <!doctype html> and ending with </html>. Do not use a Markdown fence and do not add an explanation.
- Include <meta charset="utf-8"> and <meta name="viewport" content="width=device-width, initial-scale=1">.
- Keep application CSS and JavaScript inline. HTTPS fonts, images, or CDN libraries are optional, but the core flow must remain usable if they fail. Never reference local files.
- Build only the requested prototype view, not a second shell that duplicates the Eon hub navigation or review controls.

2) HUB RUNTIME AND THEMING
- Before the prototype runs, the hub sets class="light|dark", data-theme, data-color-mode, CSS color-scheme, and window.__story = { theme, args } on the frame.
- Support both themes with CSS variables and html.light/html.dark or data-theme selectors. Do not hardcode a single theme.
- If you add a standalone theme control, hide it when window.__story exists so the hub remains authoritative.
- Read a safe standalone fallback, then merge the injected arguments:
    const defaults = ${defaultLiteral};
    const story = window.__story || { theme: document.documentElement.dataset.theme || "light", args: defaults };
    const args = { ...defaults, ...(story.args || {}) };
- The hub reloads the frame when theme or arguments change. Derive the complete visual state deterministically during initial render.

3) CONTROLS AND STATES
- Preserve the effective control keys/options shown in the generated context when updating the active prototype.
- For a new prototype, declare meaningful visual variants with strict JSON. Do not add comments or trailing commas:
    <script type="application/json" id="eon-config">
    { "controls": [{ "key": "state", "label": "State", "options": ["default", "loading", "empty", "error"] }], "defaults": { "state": "default" } }
    </script>
- New keys must match ${CONTROL_KEY}, be unique, and use non-empty unique string options. Every default must reference an existing key and one of its options.
- Stored project controls take precedence over eon-config controls. Stored defaults override matching eon-config defaults. The generated context already reflects that merge.
- Every declared option must produce a meaningfully distinct, complete state. Handle missing or unknown arguments with a safe default.
- Keep the Cartesian product of control options at 16 or fewer because the state grid caps previews at 16.

4) LIVE MEDIA VARIABLES
- Use only the exact availableMediaTokens from the generated context. They are current shared variables; adding, removing, or replacing an asset changes the next generated prompt.
- Keep the token in the HTML so future Media Library changes flow through automatically. Never replace it with a resolved URL or its revision.
- Use <img src="{{cardImage}}" alt="Descriptive text"> or quoted CSS such as background-image:url("{{heroImage}}").
- {{placeholder:320x180}} and {{placeholder:320x180:Label}} are also supported for deliberate placeholders.
- Unknown {{tokens}} remain literal and create broken resources. Reserve double braces exclusively for Eon media variables.
- eonLogo and acmeLogo are available only when they appear in availableMediaTokens.

${mapsSection}

6) RESPONSIVE LAYOUT
- The generated context lists every supported viewport. The full interaction must remain usable at mobile, tablet, laptop, and desktop sizes.
- Use box-sizing:border-box, zero body margin, fluid dimensions, sensible overflow, and responsive stacking. Avoid fixed-width layouts that crop at 402px.
- Let content scroll vertically when needed; do not hide essential actions below an unscrollable fixed canvas.
- Respect the device safe areas at the mobile size. The hub renders the mobile viewport inside a real iPhone mockup, so the Dynamic Island physically covers the top of the screen and the home indicator sits over the bottom. mobileSafeArea in the context above has the measured numbers.
- Keep every piece of text, control, icon, and tap target clear of those top and bottom insets. A search field, title, or nav bar that starts at y=0 will be sliced by the island.
- Full-bleed backgrounds are the exception and should extend under both insets: maps, photography, gradients, and sheet backdrops read better running edge to edge.
- Express the insets with env(safe-area-inset-*) and a fallback, for example padding-top:max(59px, env(safe-area-inset-top)), so the same document is correct in the hub, in full view, and on a real device.
- Do not draw your own status bar clock or battery. The mockup supplies the hardware; a painted status bar collides with the island.

7) INTERACTION AND ACCESSIBILITY
- Make the primary journey genuinely interactive with deterministic in-memory mock data. Include the relevant loading, empty, error, success, menu, modal, and validation states when the brief calls for them.
- Use semantic controls, associated labels, keyboard operation, visible :focus-visible treatment, useful alt text, and sufficient contrast in both themes.
- Respect prefers-reduced-motion and avoid decorative motion that blocks or delays interaction.

8) SANDBOX LIMITS
- The frame has an opaque origin: do not depend on localStorage, sessionStorage, cookies, service workers, authentication, parent-page DOM access, or same-origin behavior.
- Remote fetches may fail because of CORS or network restrictions. The prototype must still work without a backend.
- Do not navigate the top page, request real credentials, or perform real destructive/network mutations. Simulate product behavior locally.

9) FINAL CHECK
- Validate the HTML, both themes, all declared control options, all four viewports, keyboard navigation, focus visibility, overflow, and offline/CDN failure behavior.
- At the mobile size, confirm nothing readable or tappable falls under the Dynamic Island or the home indicator.
- If the prototype has a map, confirm it renders in both themes and that the fallback background holds the layout together when the Mapbox script is blocked.
- Confirm that media remains expressed as {{tokens}} and that the output contains no Markdown or prose outside the HTML document.`;
}
