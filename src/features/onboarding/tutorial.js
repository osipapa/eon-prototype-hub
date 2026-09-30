export const TUTORIAL_VERSION = 2;
export const TUTORIAL_METADATA_KEY = `eon_tutorial_v${TUTORIAL_VERSION}_completed_at`;

// The tracks a profile can still carry. They no longer change the walkthrough.
const TUTORIAL_PERSONAS = new Set(["designer", "operations", "engineer"]);

export function tutorialStorageKey(userId) {
  return `eon:tutorial:v${TUTORIAL_VERSION}:${userId}`;
}

export function validTutorialPersona(value) {
  return TUTORIAL_PERSONAS.has(value) ? value : null;
}

// One walkthrough for everyone: how to look at a prototype (screen sizes and
// states), how to try it on a phone, and where its animations live.
const STEPS = [
  {
    key: "breakpoints",
    eyebrow: "Screen sizes",
    title: "Check every breakpoint",
    body: "These switch the frame between desktop, laptop, tablet, and phone. The prototype reflows the way it would on that device, so you see where the layout breaks. Keys 1 to 4 do the same.",
    icon: "breakpoints",
    targets: ['[data-tutorial="viewports"]'],
    placement: "bottom",
    interactive: true,
  },
  {
    key: "states",
    eyebrow: "States",
    title: "Switch between states",
    body: "Each option here is a version of the screen the prototype was built with, like empty, loading, or an error. Pick one and the frame redraws in that state.",
    icon: "states",
    targets: ['[data-tutorial="canvas-controls"]'],
    placement: "top",
    interactive: true,
  },
  {
    key: "every-state",
    eyebrow: "States",
    title: "Or see them all at once",
    body: "The grid lays out every combination of states side by side, up to 16 frames. It's the fastest way to spot a state nobody designed. Press G to switch back and forth.",
    icon: "grid",
    targets: ['[data-tutorial="layout-grid"]'],
    placement: "bottom",
    interactive: true,
  },
  {
    key: "phone",
    eyebrow: "On your phone",
    title: "Open it on your phone",
    body: "Click here for a QR code and scan it with your phone's camera. The prototype opens full screen on the phone, and a tap on either screen happens on both, so you can hold it in your hand while the team follows along.",
    icon: "qr",
    targets: ['[data-tutorial="phone-mirror"]'],
    placement: "bottom",
    interactive: true,
  },
  {
    key: "animations",
    eyebrow: "Animations",
    title: "Every animation, on its own",
    body: "Assets lists each animation in the prototype. Play one here, or open it on its own page with its timing and code for a developer to copy. Prototypes built with the current setup prompt fill this in.",
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
