export const TUTORIAL_VERSION = 2;
export const TUTORIAL_METADATA_KEY = `eon_tutorial_v${TUTORIAL_VERSION}_completed_at`;

export const TUTORIAL_PERSONAS = {
  designer: {
    label: "Designer",
    shortLabel: "Design",
    description: "Build, compare, and refine prototypes.",
  },
  operations: {
    label: "Operations",
    shortLabel: "Ops",
    description: "Coordinate reviews, status, and handoff.",
  },
  engineer: {
    label: "Engineer",
    shortLabel: "Eng",
    description: "Review behavior, validate states, and leave actionable feedback.",
  },
};

export function tutorialStorageKey(userId) {
  return `eon:tutorial:v${TUTORIAL_VERSION}:${userId}`;
}

export function validTutorialPersona(value) {
  return Object.prototype.hasOwnProperty.call(TUTORIAL_PERSONAS, value) ? value : null;
}

export function firstNameFor(profile, user) {
  const candidate = user?.email?.split("@")[0]
    || profile?.email?.split("@")[0]
    || profile?.full_name
    || user?.user_metadata?.full_name
    || user?.user_metadata?.name
    || "there";
  const first = candidate.trim().split(/[\s._-]+/)[0] || "there";
  if (first.toLowerCase() === "there") return "there";
  return first === first.toLowerCase()
    ? first.charAt(0).toUpperCase() + first.slice(1)
    : first;
}

const DESIGNER_STEPS = [
  {
    key: "setup-prompt",
    eyebrow: "Start with context",
    title: "Copy the setup prompt first.",
    body: "It carries the current variables, media, states, and viewport contract into your AI workspace.",
    icon: "prompt",
    targets: ['[data-tutorial="setup-prompt"]'],
    placement: "right",
    reveal: "library",
    interactive: true,
  },
  {
    key: "controls",
    eyebrow: "Design every state",
    title: "Review the whole experience.",
    body: "Switch states and themes here instead of duplicating mockups.",
    icon: "sliders",
    targets: ['[data-tutorial="canvas-controls"]'],
    placement: "top",
    interactive: true,
  },
  {
    key: "mobile",
    eyebrow: "Mobile check",
    title: "Catch narrow-screen issues early.",
    body: "Tap mobile and test the real prototype at phone width.",
    icon: "mobile",
    targets: ['[data-tutorial="viewport-mobile"]'],
    placement: "bottom",
    interactive: true,
  },
  {
    key: "comments",
    eyebrow: "Design feedback",
    title: "Keep critique beside the work.",
    body: "Comments stay attached to this prototype and visible to the whole team.",
    icon: "comments",
    targets: ['[data-tutorial="comments-thread"]', '[data-tutorial="comments-tab"]'],
    placement: "left",
    reveal: "review",
    tab: "comments",
    interactive: true,
  },
  {
    key: "linear",
    eyebrow: "Linear context",
    title: "Connect the design to delivery.",
    body: "Link the issue so status, ownership, and implementation context stay close.",
    icon: "linear",
    targets: ['[data-tutorial="linear-content"]', '[data-tutorial="linear-tab"]'],
    placement: "left",
    reveal: "review",
    tab: "linear",
    interactive: true,
  },
];

const OPERATIONS_STEPS = [
  {
    key: "review-status",
    eyebrow: "Current status",
    title: "See what needs attention now.",
    body: "The workspace status is the team’s shared signal—not a private checklist.",
    icon: "status",
    targets: ['[data-tutorial="review-status"]'],
    placement: "bottom",
    interactive: true,
  },
  {
    key: "comments",
    eyebrow: "Decision trail",
    title: "Capture feedback where it happens.",
    body: "Comments give the team one visible place for questions and decisions.",
    icon: "comments",
    targets: ['[data-tutorial="comments-thread"]', '[data-tutorial="comments-tab"]'],
    placement: "left",
    reveal: "review",
    tab: "comments",
    interactive: true,
  },
  {
    key: "linear",
    eyebrow: "Linear connection",
    title: "Keep delivery status in reach.",
    body: "The linked issue connects prototype review with the execution workflow.",
    icon: "linear",
    targets: ['[data-tutorial="linear-content"]', '[data-tutorial="linear-tab"]'],
    placement: "left",
    reveal: "review",
    tab: "linear",
    interactive: true,
  },
  {
    key: "share-review",
    eyebrow: "Share exact context",
    title: "Send the view—not instructions.",
    body: "Copy a review link with the current device, theme, state, and tab included.",
    icon: "prompt",
    targets: ['[data-tutorial="share-review"]'],
    placement: "left",
    reveal: "review",
    interactive: true,
  },
  {
    key: "mobile",
    eyebrow: "Mobile review",
    title: "Check the smallest workspace too.",
    body: "Use the mobile viewport before moving work into handoff.",
    icon: "mobile",
    targets: ['[data-tutorial="viewport-mobile"]'],
    placement: "bottom",
    interactive: true,
  },
];

const ENGINEER_STEPS = [
  {
    key: "controls",
    eyebrow: "Review every state",
    title: "Exercise the full interaction model.",
    body: "Switch through the available states and themes to catch behavior that a single happy path can hide.",
    icon: "sliders",
    targets: ['[data-tutorial="canvas-controls"]'],
    placement: "top",
    interactive: true,
  },
  {
    key: "mobile",
    eyebrow: "Responsive review",
    title: "Check the narrow breakpoint.",
    body: "Use the phone viewport to review overflow, touch targets, and layout behavior.",
    icon: "mobile",
    targets: ['[data-tutorial="viewport-mobile"]'],
    placement: "bottom",
    interactive: true,
  },
  {
    key: "figma-compare",
    eyebrow: "Source comparison",
    title: "Review against the intended design.",
    body: "Use the Figma comparison when available and inspect the rendered prototype for visual drift.",
    icon: "prototype",
    targets: ['[data-tutorial="figma-compare"]', '[data-tutorial="prototype-canvas"]'],
    placement: "bottom",
    interactive: true,
  },
  {
    key: "linear",
    eyebrow: "Review context",
    title: "Read the linked Linear issue.",
    body: "Confirm scope, status, ownership, and acceptance context before leaving feedback.",
    icon: "linear",
    targets: ['[data-tutorial="linear-content"]', '[data-tutorial="linear-tab"]'],
    placement: "left",
    reveal: "review",
    tab: "linear",
    interactive: true,
  },
  {
    key: "comments",
    eyebrow: "Actionable feedback",
    title: "Leave review notes beside the prototype.",
    body: "Capture bugs, questions, and decisions where the whole team can follow the thread.",
    icon: "comments",
    targets: ['[data-tutorial="comments-thread"]', '[data-tutorial="comments-tab"]'],
    placement: "left",
    reveal: "review",
    tab: "comments",
    interactive: true,
  },
  {
    key: "share-review",
    eyebrow: "Share exact context",
    title: "Send the view you reviewed.",
    body: "Copy a link that preserves the device, theme, state, canvas, and review tab for the next person.",
    icon: "prompt",
    targets: ['[data-tutorial="share-review"]'],
    placement: "left",
    reveal: "review",
    interactive: true,
  },
];

// Product copy and target maps live here so each track can change without
// touching spotlight geometry, accessibility, or persistence.
export function createTutorialSteps(_firstName, persona) {
  return {
    designer: DESIGNER_STEPS,
    operations: OPERATIONS_STEPS,
    engineer: ENGINEER_STEPS,
  }[validTutorialPersona(persona)] || [];
}
