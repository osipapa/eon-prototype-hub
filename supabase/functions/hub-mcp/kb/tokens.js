// Eon design tokens as data, from the eon-design-system skill's reference CSS
// (regenerated from Figma). Shared by the hub's token tables and the agent's
// kb_read, so a page and the agent always quote the same values.
// Radius has no Figma variables; its scale is the production web app's.

export const SPACE = [0, 4, 8, 16, 24, 32, 40, 56, 64, 80].map((px) => ({
  token: `--spacing-${px}`,
  px,
  rem: px / 16,
}));

export const RADIUS = [
  { token: "8", px: 8, use: "Buttons, chips, inputs, icon tiles" },
  { token: "16", px: 16, use: "Option cards, modals, banners, summary cards" },
  { token: "24", px: 24, use: "Content cards (trip, vehicle, car model)" },
  { token: "100", px: 100, use: "Pills, segmented controls" },
];

export const TYPE = [
  { token: "--font-size-large-title", px: 36, name: "Large title" },
  { token: "--font-size-title-1", px: 24, name: "Title 1" },
  { token: "--font-size-title-2", px: 20, name: "Title 2" },
  { token: "--font-size-body", px: 16, name: "Body" },
  { token: "--font-size-caption-1", px: 12, name: "Caption 1" },
  { token: "--font-size-caption-2", px: 11, name: "Caption 2" },
];

export const WEIGHTS = [
  { token: "--font-weight-regular", value: 400, name: "Regular" },
  { token: "--font-weight-medium", value: 500, name: "Medium" },
];

export const BRAND = [
  { token: "--color-brand-pink-or-purple", value: "#D400F7", use: "Brand moments, brand text in light mode" },
  { token: "--color-brand-pinkling", value: "#E15CF7", use: "Interactive accents, brand text in dark mode" },
  { token: "--color-brand-baby-elephant", value: "#EDD2F6", use: "Dark-mode primary button fill, always with black text" },
];

export const GREY = [
  ["10", "#FFFFFF"], ["20", "#F9F9FD"], ["30", "#DDE0EA"], ["40", "#9094A5"], ["50", "#565B6C"],
  ["60", "#3A3D4A"], ["70", "#1E1E22"], ["80", "#121216"], ["90", "#000000"],
].map(([step, value]) => ({ token: `--color-grey-${step}`, value }));

export const STATE = [
  { name: "Error", light: "#FF005C", dark: "#FF508F" },
  { name: "Success", light: "#00AC10", dark: "#6FEC7B" },
  { name: "Pending", light: "#267AFF", dark: "#85B5FF" },
  { name: "Warning", light: "#E99031", dark: "#FFB049" },
].map((state) => ({ ...state, token: `--color-state-${state.name.toLowerCase()}-{light|dark}` }));

export const SURFACE = [
  { token: "--background-1", level: 0, dark: "#000000", light: "#F9F9FD", use: "Every regular screen background" },
  { token: "--background-2", level: 1, dark: "#121216", light: "#FFFFFF", use: "Cards and surfaces on the screen" },
  { token: "--background-3", level: 2, dark: "#1E1E22", light: "#DDE0EA", use: "Raised elements: icon tiles, inputs on cards" },
  { token: "--shadow", level: null, dark: "rgba(18,18,22,0.75)", light: "rgba(144,148,165,0.1)", use: "The one shadow color" },
];

export const TEXT = [
  { token: "--text-primary", dark: "#FFFFFF", light: "#1E1E22" },
  { token: "--text-secondary", dark: "rgba(255,255,255,0.7)", light: "rgba(18,18,22,0.75)" },
  { token: "--text-brand", dark: "#E15CF7", light: "#D400F7" },
];

// Every token table a page can embed with a ```tokens:<set>``` fence, as
// columns and rows of plain strings so the agent gets the same table.
export const TOKEN_SETS = {
  space: {
    columns: ["Token", "Base unit", "REM", "Pixels"],
    rows: SPACE.map((s) => [s.token, `${s.px / 8}×`, `${s.rem}rem`, `${s.px}px`]),
  },
  radius: {
    columns: ["Radius", "Use for"],
    rows: RADIUS.map((r) => [`${r.px}px`, r.use]),
  },
  type: {
    columns: ["Token", "Name", "Size", "REM"],
    rows: TYPE.map((t) => [t.token, t.name, `${t.px}px`, `${t.px / 16}rem`]),
  },
  weight: {
    columns: ["Token", "Name", "Weight"],
    rows: WEIGHTS.map((w) => [w.token, w.name, String(w.value)]),
  },
  brand: {
    columns: ["Token", "Value", "Use for"],
    rows: BRAND.map((b) => [b.token, b.value, b.use]),
  },
  grey: {
    columns: ["Token", "Value"],
    rows: GREY.map((g) => [g.token, g.value]),
  },
  state: {
    columns: ["State", "Token", "Light", "Dark"],
    rows: STATE.map((s) => [s.name, s.token, s.light, s.dark]),
  },
  surface: {
    columns: ["Token", "Level", "Dark", "Light", "Use for"],
    rows: SURFACE.map((s) => [s.token, s.level == null ? "-" : String(s.level), s.dark, s.light, s.use]),
  },
  text: {
    columns: ["Token", "Dark", "Light"],
    rows: TEXT.map((t) => [t.token, t.dark, t.light]),
  },
};

export function tokenTableMarkdown(set) {
  const table = TOKEN_SETS[set];
  if (!table) return `_Unknown token set "${set}"._`;
  const line = (cells) => `| ${cells.join(" | ")} |`;
  return [line(table.columns), line(table.columns.map(() => "---")), ...table.rows.map(line)].join("\n");
}
