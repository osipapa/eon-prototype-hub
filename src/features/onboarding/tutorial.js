export const TUTORIAL_VERSION = 1;
export const TUTORIAL_METADATA_KEY = `eon_tutorial_v${TUTORIAL_VERSION}_completed_at`;

export function tutorialStorageKey(userId) {
  return `eon:tutorial:v${TUTORIAL_VERSION}:${userId}`;
}

export function firstNameFor(profile, user) {
  const candidate = profile?.full_name
    || user?.user_metadata?.full_name
    || user?.user_metadata?.name
    || user?.email?.split("@")[0]
    || "there";
  const first = candidate.trim().split(/[\s._-]+/)[0] || "there";
  if (first.toLowerCase() === "there") return "there";
  return first === first.toLowerCase()
    ? first.charAt(0).toUpperCase() + first.slice(1)
    : first;
}

// Keep tutorial content here so Product can tune the walkthrough without
// touching its behavior, motion, or first-login persistence.
export function createTutorialSteps(firstName) {
  return [
    {
      key: "welcome",
      eyebrow: "Welcome to Eon",
      title: `Hey ${firstName}, let’s make this workspace yours.`,
      body: "Eon keeps interactive prototypes, review context, and team feedback in one shared place. Here’s the two-minute version.",
      icon: "sparkles",
      visual: "welcome",
      callout: "You can move at your own pace — nothing in this tour changes your work.",
    },
    {
      key: "find",
      eyebrow: "01 · Find the work",
      title: "Start with the prototype library.",
      body: "Browse by product group, search by name, or filter to work that has unread feedback. Everyone sees the same live workspace.",
      icon: "search",
      visual: "library",
      tips: [
        "Use Needs attention to surface prototypes with new comments.",
        "Open Media when you need to update shared image or brand variables.",
      ],
    },
    {
      key: "shape",
      eyebrow: "02 · Shape the exact state",
      title: "Test the experience, not just a screenshot.",
      body: "Switch viewport, theme, and prototype variables from the canvas controls. All states lays variants out together for fast QA.",
      icon: "sliders",
      visual: "controls",
      tips: [
        "Every variable change updates the live prototype immediately.",
        "Use single view for focus, then All states to catch edge cases.",
      ],
    },
    {
      key: "review",
      eyebrow: "03 · Review together",
      title: "Keep decisions beside the prototype.",
      body: "Open the review panel to comment, check readiness, and connect Figma or Linear. A review link restores the exact prototype state for your teammate.",
      icon: "message",
      visual: "review",
      tips: [
        "Comments update live, so feedback stays visible to the whole team.",
        "Copy review link includes the current viewport, theme, and variables.",
      ],
    },
    {
      key: "build",
      eyebrow: "04 · Build and share",
      title: "Turn a new idea into a team-ready prototype.",
      body: "Create or upload an HTML prototype, define its variables, then copy the setup prompt for your coding agent. The prompt is generated from the latest project and media variables.",
      icon: "upload",
      visual: "build",
      tips: [
        "Use the shared media tokens instead of hardcoding asset URLs.",
        "Set a review stage so the team knows what kind of feedback you need.",
      ],
    },
    {
      key: "ready",
      eyebrow: "You’re ready",
      title: `That’s it, ${firstName}. Your first prototype is waiting.`,
      body: "Pick a prototype, explore its states, and leave the next useful piece of context for your team.",
      icon: "check",
      visual: "ready",
      callout: "Admins can replay this walkthrough from Workspace admin whenever QA needs another pass.",
    },
  ];
}
