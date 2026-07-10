# Workspace: stacked review panel, Figma compare splits, real states grid

Approved 2026-07-10. Applies to the prototype workspace (`src/features/hub/PrototypeWorkspace.jsx`,
shared pieces in `src/features/hub/PrototypeHub.jsx`, styles in `src/index.css`). No schema or
data changes; all new state is session-local UI state.

> **Revision (same day):** after seeing it live, Mate chose side-by-side as the only split
> mode and asked for the review panel to return to its original tabbed style, now with just
> **Comments | Linear**. Figma lives exclusively in the split pane, including link editing.
> Sections 1–2 below are updated accordingly; the stacked panel and "below" mode were removed.

## 1. Review panel — tabs, Comments | Linear

`ReviewInspector` keeps its original tabbed layout with two tabs: **Comments** (thread +
composer, count badge) and **Linear** (header with inline "Edit link", URL input when empty
or editing, `LinearCard`). The Figma tab is gone — the split pane owns Figma entirely.

## 2. Compare — optional side-by-side Figma split

New toolbar toggle **Compare** (columns icon) next to the View control, always visible in
the tools row. Disabled with a "Link a Figma frame first" tooltip when the prototype has no
`figma_url`. Default off.

- Canvas left, Figma pane right, vertical draggable divider, default ~50/50.
- The Figma pane = slim header (file name, node, "Edit link", "Open in Figma") over the
  large `FigmaEmbed`. Editing toggles a URL input row; when no link is set the pane shows
  the empty state with the input.
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
