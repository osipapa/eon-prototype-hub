# Design QA — Design Hub cleanup

## Comparison target

- Source visual truth:
  - `/var/folders/v6/th26fq253hl85ph790xfs31c0000gp/T/codex-clipboard-c63cbb12-c913-4714-b621-d747fe8953cd.png`
  - `/var/folders/v6/th26fq253hl85ph790xfs31c0000gp/T/codex-clipboard-dcb13eaa-12ab-44ee-be2c-7c987263410f.png`
  - `/var/folders/v6/th26fq253hl85ph790xfs31c0000gp/T/codex-clipboard-3ca8e999-9eba-4e7e-ace3-63c6f8d6dd6a.png`
  - `/var/folders/v6/th26fq253hl85ph790xfs31c0000gp/T/codex-clipboard-1cf12e04-9ce0-4721-9db6-0e9e095843cf.png`
- Browser-rendered implementation:
  - `/private/tmp/eon-workspace-final.png`
  - `/private/tmp/eon-prompts-final-v2.png`
  - `/private/tmp/eon-tracking-final.png`
- Combined source-and-implementation comparison: `/private/tmp/eon-design-qa-comparison.png`
- Desktop viewport: 1440 × 900 CSS px for Prototypes and Tracking; 1280 × 720 CSS px for the final Prompts capture.
- Responsive viewport: 780 × 844 CSS px.
- Density: implementation captures are 1×. Source crops are 2× screenshots and were inspected at their native density; the combined board scales them proportionally without making pixel-level clone claims.
- State: system dark mode, unlinked Linear state, left navigation and right review tools open on desktop.

The source screenshots are legacy controls selected for removal rather than a full-screen design to clone. The focused comparison therefore checks whether those exact controls have been replaced by the requested behavior while preserving the established Eon shell.

## Findings

- No actionable P0, P1, or P2 differences remain.
- Fonts and typography: DM Sans, compact navigation labels, heading hierarchy, and small documentation text remain consistent across all three areas.
- Spacing and layout rhythm: the three tabs share one navigation width, desktop panels keep stable proportions, and the review tabs now begin at the top without the removed review-workspace header.
- Colors and visual tokens: the shell keeps the black Eon base, charcoal surfaces, white text, baby-elephant brand actions, and a vivid red Linear error instead of the removed muted Exploration fallback.
- Image and asset fidelity: the supplied visual targets contain only interface icons and controls. The implementation uses the existing Eon mark and Lucide icon system; no image asset was substituted or approximated.
- Copy and content: `Exploration`, `Review workspace`, `Copy link`, the starter-library notice, and ticket-specific tracking copy are absent. `Linear not connected`, the supplied open-road image prompt, and the generic Mixpanel guide are present.

## Full-view evidence

- The combined board places all four source removal targets and the final 1440 × 900 Prototype workspace in the same comparison input.
- Prototypes, Prompts, and Tracking were each inspected in the browser.
- The left sidebar persisted at 296 px after a keyboard resize, proving the shared width carries between areas.
- The desktop review panel exposes its own separator and remained 380 px before resizing.
- No clipping, broken columns, or persistent-control overflow was visible.

## Focused comparison evidence

- The legacy toolbar crops show the removed collapse control and project-status fallbacks; the implementation toolbar has no collapse button and shows `Linear not connected`.
- The legacy review crop shows the removed `Review workspace` and `Copy link` header; the implementation starts directly with Comments, History, and Linear.
- The focused source and implementation regions were readable in the combined board, so separate magnified crops were not required.

## Interaction and runtime checks

- Resized Prompt navigation from 284 px to 296 px with the accessible separator; Tracking and Prototypes both opened at the persisted 296 px width.
- Confirmed two accessible desktop separators in Prototypes: navigation and review tools.
- Opened and closed the 780 px mobile navigation drawer.
- Opened the 780 px mobile review drawer and confirmed it uses the compact `Review tools` header.
- Opened and canceled the New prompt dialog; edit and delete controls remain available.
- Confirmed the system reports dark mode and the app follows it without an app-theme toggle.
- Confirmed the Mixpanel page contains no ENG-723 or ENG-841 copy.
- Checked a fresh browser tab across Prototypes, Prompts, and Tracking: no console warnings or errors.
- Production build and whitespace validation completed successfully.

## Comparison history

- First combined comparison: passed. The selected source controls were absent, their replacements were visible, and no P0/P1/P2 visual issue required another implementation iteration.
- Changes applied before comparison: removed app-theme and desktop-collapse controls, added shared resizers, removed the review-workspace header, replaced project-status fallbacks with Linear connection states, simplified tracking documentation, and added the image-generation prompt.

## Implementation checklist

- [x] Unlinked prototypes show a Linear connection error.
- [x] Connected Linear status supports the assigned team key.
- [x] Desktop sidebars resize manually and share their saved width.
- [x] The review sidebar resizes independently.
- [x] App theme follows the operating system.
- [x] Review-workspace header and copy-link control are removed.
- [x] Image-generation starter prompt is first in the library.
- [x] Mixpanel documentation is reusable and ticket-free.
- [x] Mobile drawers remain functional.

final result: passed
