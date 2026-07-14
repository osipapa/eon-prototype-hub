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
    description: "Implement, upload, and validate every state.",
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
  {
    key: "review-process",
    eyebrow: "Design handoff",
    title: "Move the review forward deliberately.",
    body: "Use the shared stages when exploration is ready for review, handoff, or shipping.",
    icon: "review",
    targets: ['[data-tutorial="review-stage"]'],
    placement: "left",
    reveal: "review",
    tab: "details",
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
    key: "review-process",
    eyebrow: "Review workflow",
    title: "Keep every handoff explicit.",
    body: "Move work from exploration through review, handoff, and shipped.",
    icon: "review",
    targets: ['[data-tutorial="review-stage"]'],
    placement: "left",
    reveal: "review",
    tab: "details",
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
    tab: "details",
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
    key: "setup-prompt",
    eyebrow: "Implementation contract",
    title: "Copy the live setup prompt.",
    body: "It includes effective controls, defaults, media variables, and the current project context.",
    icon: "prompt",
    targets: ['[data-tutorial="setup-prompt"]'],
    placement: "right",
    reveal: "library",
    interactive: true,
  },
  {
    key: "upload",
    eyebrow: "Publish the build",
    title: "Bring the prototype back here.",
    body: "Upload the self-contained HTML so everyone tests the same artifact.",
    icon: "upload",
    targets: ['[data-tutorial="prototype-upload"]'],
    placement: "bottom",
    interactive: true,
  },
  {
    key: "controls",
    eyebrow: "State coverage",
    title: "Validate declared controls.",
    body: "Exercise every state and theme without rebuilding the prototype shell.",
    icon: "sliders",
    targets: ['[data-tutorial="canvas-controls"]'],
    placement: "top",
    interactive: true,
  },
  {
    key: "mobile",
    eyebrow: "Responsive QA",
    title: "Test the narrow breakpoint.",
    body: "Use the phone viewport to catch overflow, touch, and layout failures.",
    icon: "mobile",
    targets: ['[data-tutorial="viewport-mobile"]'],
    placement: "bottom",
    interactive: true,
  },
  {
    key: "linear",
    eyebrow: "Delivery context",
    title: "Link implementation to Linear.",
    body: "Keep the issue and prototype together for faster fixes and clearer ownership.",
    icon: "linear",
    targets: ['[data-tutorial="linear-content"]', '[data-tutorial="linear-tab"]'],
    placement: "left",
    reveal: "review",
    tab: "linear",
    interactive: true,
  },
  {
    key: "comments",
    eyebrow: "Review loop",
    title: "Resolve feedback beside the build.",
    body: "Use comments for implementation questions and visible follow-through.",
    icon: "comments",
    targets: ['[data-tutorial="comments-thread"]', '[data-tutorial="comments-tab"]'],
    placement: "left",
    reveal: "review",
    tab: "comments",
    interactive: true,
  },
  {
    key: "review-status",
    eyebrow: "Handoff signal",
    title: "Update status when the build is ready.",
    body: "A clear stage tells Design and Ops what they can do next.",
    icon: "status",
    targets: ['[data-tutorial="review-status"]'],
    placement: "bottom",
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
