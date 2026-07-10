# Workspace: stacked review panel, Figma compare splits, real states grid

Approved 2026-07-10. Applies to the prototype workspace (`src/features/hub/PrototypeWorkspace.jsx`,
shared pieces in `src/features/hub/PrototypeHub.jsx`, styles in `src/index.css`). No schema or
data changes; all new state is session-local UI state.

## 1. Review panel — one scrolling stack, no tabs

Replace the Comments / Linear / Figma tabs in `ReviewInspector` with one column:

1. **Linear** — section header ("Linear issue · Shared with the team", inline "Edit link"),
   URL input when empty or editing, then `LinearCard`.
2. **Figma** — same header pattern, URL input when empty or editing, then `FigmaCard`
   (or the existing empty state).
3. **Comments** — section header with count, then the existing `CommentThread`
   (internal scroll + composer). Fills remaining height, min-height ~280px.

The stack scrolls as a whole on short windows. Panel width stays 360px. The `inspectorTab`
state and the shadcn `Tabs` usage in the workspace go away.

## 2. Compare — optional Figma split, off / side / below

New toolbar control **Compare** (segmented: off · side · below) next to the View control,
always visible in the tools row. Disabled with a "Link a Figma frame first" tooltip when the
prototype has no `figma_url`. Default off.

- **side**: canvas left, Figma pane right (vertical draggable divider, default ~50/50).
- **below**: canvas top full-width, Figma pane underneath (horizontal draggable divider).
- The Figma pane = slim header (file name, node, "Open in Figma" link) over the large
  `FigmaEmbed`.
- Works in both single view and the states grid — it wraps the canvas `<section>`, so the
  existing `ResizeObserver` rescales the prototype automatically.
- While dragging the divider, pointer events on both panes' iframes are disabled so the
  drag doesn't die over an iframe.
- Under 900px viewport width the split (and the Compare control) is hidden via CSS; the
  canvas takes full width.
- Split ratio and mode are session-only (not persisted to Supabase).

## 3. States grid — real states, honest empty state

The hub can only fan out states the prototype **declares** (via the embedded `eon-config`
controls block; the "Copy setup prompt" instructs AI authors to include popups, error,
empty, etc.).

- "Lay out by" always offers **states / themes / screens**, with **states** first and default.
- When the prototype declares controls, states behaves as today: one tile per combo.
- When it declares none, the states grid shows a notice instead of silently falling back to
  screen sizes: "This prototype doesn't declare states" + explanation + a **Copy setup
  prompt** button (same behavior as the sidebar button), so the user can regenerate the
  prototype HTML with states included. Themes and screens remain selectable.

## Out of scope

Persisting compare/layout preferences, resizable review panel, Linear API changes,
prototype-side state autodetection.
