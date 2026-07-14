export const TUTORIAL_VERSION = 1;
export const TUTORIAL_METADATA_KEY = `eon_tutorial_v${TUTORIAL_VERSION}_completed_at`;

export function tutorialStorageKey(userId) {
  return `eon:tutorial:v${TUTORIAL_VERSION}:${userId}`;
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

// Keep the coach-mark copy and target map here so Product can tune the tour
// without touching its geometry, accessibility, or persistence.
export function createTutorialSteps(firstName) {
  return [
    {
      key: "welcome",
      eyebrow: "Your workspace",
      title: `Hey ${firstName} — this is your live workspace.`,
      body: "I’ll point out the five things you’ll use most.",
      icon: "sparkles",
      targets: ['[data-tutorial="prototype-title"]'],
      placement: "bottom",
    },
    {
      key: "prototype",
      eyebrow: "Live prototype",
      title: "Click it. It’s real.",
      body: "Test the flow directly—not through screenshots.",
      icon: "prototype",
      targets: ['[data-tutorial="prototype-frame"]'],
      placement: "right",
      interactive: true,
    },
    {
      key: "controls",
      eyebrow: "States & themes",
      title: "Change the experience here.",
      body: "Try a state, theme, device, or canvas color.",
      icon: "sliders",
      targets: ['[data-tutorial="canvas-controls"]'],
      placement: "top",
      interactive: true,
    },
    {
      key: "library",
      eyebrow: "Prototype library",
      title: "Everything starts here.",
      body: "Find prototypes, shared media, and the dynamic setup prompt.",
      icon: "library",
      targets: ['[data-tutorial="prototype-library"]', '[data-tutorial="nav-toggle"]'],
      placement: "right",
      interactive: true,
    },
    {
      key: "review",
      eyebrow: "Team review",
      title: "Feedback stays beside the work.",
      body: "Open comments, readiness, Figma, and Linear here.",
      icon: "review",
      targets: ['[data-tutorial="review-panel"]', '[data-tutorial="review-toggle"]'],
      placement: "left",
      interactive: true,
    },
  ];
}
