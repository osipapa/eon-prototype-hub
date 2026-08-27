# Prototype workspace: IA audit and plan

Scope: the prototype detail screen (`src/features/hub/PrototypeWorkspace.jsx`,
mounted by `src/routes/Hub.jsx`). Desktop first.

---

## 1. What the screen is for

Three jobs, in the order people actually do them:

1. **Look at the prototype** in a chosen viewport and state.
2. **Say something about it** (comment, pin, resolve) or read what others said.
3. **Keep it wired up** (link Figma, link Linear, replace the HTML) - rare, setup-shaped.

Job 3 is the least frequent and currently gets the loudest, largest, most permanent
real estate. That inversion is the root cause of "I don't know what is what".

---

## 2. Current structure

Seven surfaces compete on one screen. None of them is a stated level of a hierarchy;
each was added where there happened to be room.

| # | Surface | Holds |
|---|---------|-------|
| 1 | Left sidebar | product switcher, "Library / Prototypes 8", Prototypes/Media tabs, search, New prototype, Setup, the tree, footer (email, changelog, admin, sign out) |
| 2 | Toolbar row 1 (60px) | title, status chip, presence, save state, Upload HTML + Live badge, Open full view |
| 3 | Toolbar row 2 (56px) | VIEWPORT (4), VIEW (2), COMPARE WITH FIGMA (1) |
| 4 | Upload band (~180px, inline) | headline, live-file chip, Auto-publish, Unlink, Paste HTML source, Save, Re-upload, Remove, Cancel, "Saved to Supabase..." |
| 5 | Canvas | iframe, pins; floating bar (state args + Prototype light/dark + Canvas swatches); floating zoom pill |
| 6 | Compare pane | Figma title, node, Edit link, Open in Figma, embed |
| 7 | Right inspector (380px) | Comments / History / Linear tabs; Linear tab holds Review readiness + Linear link + Linear card |

**Chrome above the canvas: ~296px** (60 + 56 + ~180). At 1080px tall that is 27% of the
viewport spent before a single prototype pixel. The screenshot shows the result: an
iPhone frame at 40% zoom, still clipped at the bottom.

**Interactive controls above the canvas: 20.**

---

## 3. Findings

### 3.1 Controls are grouped by origin, not by object

Five distinct object types are scrambled across the seven surfaces:

- **Prototype** (identity, source HTML, its own state args)
- **Canvas** (viewport, single/grid, zoom, background, prototype theme)
- **Review** (comments, pins, readiness, history)
- **References** (Figma frame, Linear issue)
- **Library** (search, groups, new, media, setup prompt)

Examples of the scrambling:

- **Source** ("Upload HTML") sits in the global action bar next to "Open full view",
  and expands into a full-width band. It is an object-edit task rendered as page chrome.
- **Compare with Figma** sits in the canvas tools row, but it is a *reference* action and
  it re-lays-out the whole workspace, not the canvas mode.
- **View controls live in three places at once**: viewport top-centre, zoom bottom-right,
  canvas background and prototype theme bottom-centre.
- **The floating bar mixes two questions**: "what state is the prototype in" (its args)
  and "how am I looking at it" (theme, background).

### 3.2 The Linear tab is really a Details tab

`ReviewReadiness` spans four objects (prototype uploaded, Figma linked, Linear linked,
feedback started) yet lives inside the tab labelled **Linear**, third of three. The
overall health of the prototype is two clicks deep and filed under the wrong noun.
The hash router confirms the mismatch: `?tab=details` maps to `inspectorTab = "linear"`
(`PrototypeWorkspace.jsx:437`, `:468`).

### 3.3 The Figma link can only be edited when Compare is on

The only Figma URL input in the live workspace is inside `FigmaPane`
(`PrototypeWorkspace.jsx:1333`). To paste a Figma link you must first find and toggle a
16px icon labelled "COMPARE WITH FIGMA". The Linear link, by contrast, has an input in
the inspector. Two references, two completely different edit paths.

### 3.4 The same fact is stated up to six times

- **Issue status**: title-bar chip + `LinearCard` badge (identical string, both from
  `linearConnectionState` / `connectionLabel`) + readiness row "Linear issue linked".
- **Save / share state**: `SaveIndicator` + "Live" pill on the Upload button + live chip
  + "Every save publishes to your team" + "synced 01:40:13 PM" + "Saved to Supabase and
  shared with your team".
- **Comment volume**: sidebar row number + Comments tab count + pins on the canvas.

Six phrasings of "your work is saved" is why nothing reads as authoritative.

### 3.5 Copy is dense and unlabelled

- All-caps micro-labels (`VIEWPORT`, `VIEW`, `COMPARE WITH FIGMA`, `PROTOTYPE`, `CANVAS`)
  take more width than the controls they label. "COMPARE WITH FIGMA" is 17 characters
  for one icon.
- The sidebar says **Library / Prototypes** and then a tab also called **Prototypes**,
  within 60px.
- **Setup** copies a prompt to the clipboard. Nothing in the label says so.
- Sidebar row numbers (4, 27, 3) are bare. Unread count and total comment count share
  one visual slot with only a fill colour telling them apart.
- The upload band explains itself twice: a headline naming the prototype, then a
  subtitle explaining what uploaded HTML does, then a chip explaining sync, then a
  footer explaining persistence.
- **Prototype** and **Canvas** as floating-bar labels are near-synonyms to a first-time
  reader; neither says "theme" or "background".

### 3.6 Orphans

- `PrototypeHub`'s default export (old details view with a Notes panel and a Links card)
  is dead: only its named exports are imported.
- `projects.notes` has no editor anywhere in the current UI, yet the History timeline
  still renders "edited the notes" (`PrototypeWorkspace.jsx:1908`).
- **Media** is a sidebar tab that silently replaces the entire main region. A filter
  slot is being used as a mode switch.

---

## 4. Proposed IA

**Three fixed regions, one overlay class.**

```
+-------------+--------------------------------------+------------------+
| A. LIBRARY  | B. STAGE                             | C. CONTEXT       |
| pick a      | the prototype + only what changes    | everything about |
| prototype   | what you see                         | this prototype   |
+-------------+--------------------------------------+------------------+
```

**Rule:** anything that edits the prototype's *source or identity* opens as an overlay
(sheet or dialog), never as an inline band. Setup tasks must not permanently shrink the
thing being reviewed.

### Region A - Library
Navigate between prototypes. Nothing else.

### Region B - Stage
One toolbar row. The prototype. Two floating clusters, split by meaning:
- bottom-centre = **what state is the prototype in** (its args)
- bottom-right = **how am I looking at it** (zoom, theme, background)

### Region C - Context
A fixed header that is always visible, then two tabs.

```
Status chip + readiness meter    (always visible, no tab)
Source      uploaded / built-in / live-linked   [Replace]
Figma       title, node          [Open] [Compare] [Edit]
Linear      DES-709, assignee    [Open] [Edit]
------------------------------------------------------
Comments (0) | History (12)
```

---

## 5. Moves

### P0 - fixes the "insane" feeling

**5.1 Collapse two toolbar rows into one (296px -> 56px of chrome).**
Final row: `[nav] Title + status - presence - (flex) - save - Viewport - Single/Grid - [...] - Open full view - [inspector]`
- Drop the all-caps `ToolGroup` labels in the top bar; icon + tooltip + `aria-label` carry it.
- Move **Upload HTML** out of the top bar into Context -> Source and the `...` menu.
- Move **Compare with Figma** out of the tools row into Context -> Figma as a
  "Compare side by side" toggle.
- Canvas gains ~240px.

**5.2 Replace the inline upload band with a Source sheet.**
Same content, opened from Context -> Source -> Replace, or from `...`. It is a task with
its own Save/Cancel; it should not be leavable-open behind other work. Keep only the
live-link state as a one-line chip in Context: `add-driver-payment.html - synced 1:40 PM`.

**5.3 Restructure Context: 3 tabs -> fixed header + 2 tabs.**
Readiness becomes always-visible and collapses to one line ("3 of 4 ready", expandable).
"Linear" stops being a tab pretending to be Details. Figma becomes editable without
turning Compare on. Third tab disappears.

**5.4 De-duplicate status and save.**
- Status chip: title bar only. Remove the duplicate `Badge` inside `LinearCard`
  (`PrototypeHub.jsx:795`); keep identifier, priority, assignee, description.
- Save: one `SaveIndicator`. Delete "Saved to Supabase and shared with your team" and
  collapse "Every save publishes to your team" to the `Auto-publish` toggle alone.

### P1 - hierarchy and labels

**5.5 One primary action.** "Open full view" is currently the highest-contrast element on
the screen but it is an escape hatch. Demote to secondary; the canvas is the primary.

**5.6 Merge three floating clusters into two.** Zoom stepper + a small popover holding
theme and background, bottom-right. Args stay bottom-centre.

**5.7 Sidebar header: 5 blocks -> 3.**
- Product switcher (keep).
- Fold "Library / Prototypes 8" into the tab strip: `Prototypes 8 | Media 3`.
- Search and New on one row. Move **Setup** to the footer, renamed
  **Copy setup prompt**.

**5.8 Copy pass.**
| Now | Instead |
|---|---|
| `VIEWPORT` / `VIEW` / `COMPARE WITH FIGMA` | no visible label; tooltip only |
| `PROTOTYPE` light/dark | `Theme` |
| `CANVAS` swatches | `Background` |
| `Setup` | `Copy setup prompt` |
| Bare row number `27` | comment glyph + `27` |
| "Upload prototype HTML for X" + subtitle + chip + footer | one line: `Source` + state |
| "Review readiness / 3 of 4 signals ready" | `Ready to review - 3 of 4` |

### P2 - cleanup

**5.9** Delete the dead `PrototypeHub` default export.
**5.10** Either restore a Notes editor in Context or drop `edited_notes` from History.
**5.11** Make Media a library-level mode with its own main-region header, not a tab that
silently swaps the whole right-hand side.

---

## 6. Targets

| Measure | Now | After |
|---|---:|---:|
| Chrome above canvas | ~296px | ~56px |
| Interactive controls above canvas | 20 | 9 |
| Competing surfaces | 7 | 3 + overlays |
| Clicks to see readiness | 2 | 0 |
| Clicks to edit the Figma link | 2, and Compare must be on | 1 |
| Floating clusters over the canvas | 3 | 2 |
| Phrasings of "your work is saved" | 6 | 1 |

---

## 7. Shipped

All of P0, P1, and P2 landed, plus two changes requested during the work:

- **Full view moved in-app.** It used to open a blob URL in a new tab. It now drops
  the chrome in place; the library and context panel wait at the screen edges and slide
  back in on hover (or on keyboard focus). Esc leaves. `sandboxedFullView` is deleted.
- **Dark mode elevation ladder.** Chrome, panels, and controls all sat on the same
  black, so 1px borders carried the entire structure. Dark now runs
  `bg #000` (base and inset cards) -> `nav #0D0D0D` (chrome) -> `panel #1A1A1A`
  (elevated) -> `raised #262626` (controls), documented at the palette in
  `src/features/hub/prototypes.js`.

Two fixes found while verifying:

- Resizing from desktop into drawer widths left both drawers open on top of each other.
  They now close on the transition into drawer mode only, not on every resize.
- With Figma compare on, the canvas gets narrow enough that the state pills sat under
  the zoom cluster. A container query lifts the pills a row when that happens.

### Trimmed after review

- **Readiness row removed.** It re-encoded four facts that the rows beneath it already
  showed: Source, Figma, Linear, and the Comments count. By its own de-duplication rule
  it had to go.
- **Notes row removed**, and `edited_notes` dropped from the History timeline with it,
  so nothing logs an event no surface can produce.
- **Copy setup prompt moved back into the sidebar body** with its label. Icon-only in
  the footer was undiscoverable; the first question asked about it was "where is it".
- **Status dots lost their halo**, so one dot reads as one dot.
- **What's new lists plain bullets.** A rounded card and a check badge per item turned a
  13-line release into a wall.
- **Trackpad pinch zooms the canvas.** The anchor bridge forwards ctrl-wheel out of the
  sandboxed iframe, so pinching over the prototype itself works too.
