export const TUTORIAL_VERSION = 2;
export const TUTORIAL_METADATA_KEY = `eon_tutorial_v${TUTORIAL_VERSION}_completed_at`;

// The walkthrough opens this prototype first: it has states and animations
// to point at.
export const TUTORIAL_PROTOTYPE = "sdk-mate";

// The tracks a profile can still carry. They no longer change the walkthrough.
const TUTORIAL_PERSONAS = new Set(["designer", "operations", "engineer"]);

export function tutorialStorageKey(userId) {
  return `eon:tutorial:v${TUTORIAL_VERSION}:${userId}`;
}

export function validTutorialPersona(value) {
  return TUTORIAL_PERSONAS.has(value) ? value : null;
}

// One walkthrough for everyone: how to look at a prototype (screen sizes and
// states), how to try it on a phone, and where its animations live. Titles
// carry the whole message; nobody reads a paragraph under them.
const STEPS = [
  {
    key: "breakpoints",
    eyebrow: "Screen sizes",
    title: "Switch screen sizes here to check each breakpoint",
    icon: "breakpoints",
    targets: ['[data-tutorial="viewports"]'],
    placement: "bottom",
    interactive: true,
  },
  {
    key: "states",
    eyebrow: "States",
    title: "Pick a state to see that version of the screen",
    icon: "states",
    targets: ['[data-tutorial="canvas-controls"]'],
    placement: "top",
    interactive: true,
  },
  {
    key: "every-state",
    eyebrow: "States",
    title: "Open the grid to see every state at once",
    icon: "grid",
    targets: ['[data-tutorial="layout-grid"]'],
    placement: "bottom",
    interactive: true,
  },
  {
    key: "phone",
    eyebrow: "On your phone",
    title: "Scan the QR code to try it on your phone",
    icon: "qr",
    targets: ['[data-tutorial="phone-mirror"]'],
    placement: "bottom",
    interactive: true,
  },
  {
    key: "animations",
    eyebrow: "Animations",
    title: "Play each animation on its own in Assets",
    icon: "animation",
    targets: ['[data-tutorial="context-assets"]'],
    placement: "left",
    reveal: "review",
    row: "assets",
    interactive: true,
  },
];

// The persona a teammate picked or was given still gets stored, but every
// track now walks through the same steps.
export function createTutorialSteps() {
  return STEPS;
}
