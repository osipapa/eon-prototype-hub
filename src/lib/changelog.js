/* The hub's own changelog, shown from "What's new" in the sidebar.
   Convention: every push that changes the platform adds an entry here
   (newest first) in the same commit. Grouping is by day. Extend the day's
   entry if one already exists for today. */

export const CHANGELOG = [
  {
    date: "2026-08-27",
    title: "The workspace gets a hierarchy",
    items: [
      "The prototype screen is now three regions: pick one on the left, view it in the middle, everything about it on the right.",
      "Two toolbar rows collapsed into one, so the canvas gets back roughly 240px of height.",
      "Uploading prototype HTML opens as a sheet instead of a band that pushed the canvas down and stayed open.",
      "The context panel now shows source, Figma, and Linear as always-visible rows above Comments and History.",
      "A Figma link can finally be pasted without turning on side-by-side compare first.",
      "Issue status is stated once in the title bar, and \"saved\" is stated once instead of six times.",
      "Zoom, theme, and canvas background merged into one cluster in the bottom-right corner.",
      "Pinching on a trackpad now zooms the canvas, including over the prototype itself.",
      "Control labels dropped their shouting capitals, and sidebar comment counts now carry an icon that says what they count.",
      "Status dots lost their outer halo ring.",
      "What's new lists its updates as plain bullets instead of a card each.",
      "Full view now happens inside the app instead of a new tab: the chrome drops away, and the library or context panel slides back in when the pointer reaches a screen edge. Esc leaves.",
      "Dark mode gained a real elevation ladder, so chrome, panels, and controls no longer all sit on the same black.",
      "The loading screen logo lost its container and pulsing ring; it now sits directly on the background.",
    ],
  },
  {
    date: "2026-08-20",
    title: "Eon Design grows beyond tabs",
    items: [
      "The Eon logo now opens one compact area switcher for Eon Design, Prototypes, Prompts, and Mixpanel.",
      "A new Eon Design home documents principles, product design process, review practices, Linear handoff, and shared resources.",
      "Prompt edit and delete actions now use the same ellipsis menu and confirmation behavior as prototypes.",
      "Custom media can now be permanently deleted; resetting a logo or preset removes its saved override.",
      "What's new now uses a release timeline with scannable dates, update counts, and grouped change summaries.",
      "Selected surfaces now stay monochrome while icons and active indicators use the Eon accent gradient.",
      "Logo loading no longer flashes a placeholder mark; size-matched skeletons hold the space until the real asset is ready.",
      "Numbered pins and unread badges now use dark text over the accent gradient for clear contrast.",
    ],
  },
  {
    date: "2026-08-10",
    title: "Prompt library organization",
    items: [
      "Every shared category and prompt now has a visible trash icon directly in the sidebar.",
      "Deleting a category keeps every prompt and moves it safely to another category.",
      "Empty categories now stay visible, and prompt creation uses the team's shared category list.",
    ],
  },
  {
    date: "2026-07-28",
    title: "The Prototype Hub is now the Design Hub",
    items: [
      "Prompts now live in a shared library where the team can create, edit, delete, fill, and copy them.",
      "Prompt variables now update the visible prompt instantly, with one copy icon inside the preview.",
      "Tracking now includes a reusable Mixpanel setup guide, implementation prompt, event contract, and QA checklist.",
      "Prototypes, Prompts, and Tracking now share one system theme, resizable navigation, Eon palette, and changelog.",
    ],
  },
  {
    date: "2026-07-21",
    title: "Comments jump to their pin",
    items: [
      "Click a pinned comment or its pin number. The canvas restores the saved device, theme, and controls, then scrolls the pinned spot into view.",
      "Pins remember their page position. Pins in long or scrolled prototypes return to the right section after a reload.",
      "Uploaded prototypes no longer vanish after someone edits the Linear or Figma link. Live updates now keep the prototype HTML intact.",
      "Jumping to a comment on another screen now opens that screen. Pins stay hidden until their screen opens.",
    ],
  },
  {
    date: "2026-07-20",
    title: "Pinned feedback, reactions, and quicker commenting",
    items: [
      "Pin a comment to an element in the prototype. The pin tracks the element, and a line connects the comment to its pin.",
      "The quick-comment ring offers common feedback after you drop a pin. You can also write a comment in place and press Enter.",
      "Comments support emoji reactions. Hover a pin to preview its comment. A single-emoji comment uses the emoji as its pin.",
      "Resolve and reopen comments from the Open and Resolved filters. A state chip restores the view where a pin was placed.",
      "Paste, drop, or choose an image to add it to a comment.",
      "App start and reload now use the Eon loading screen.",
    ],
  },
];

export const CHANGELOG_SEEN_KEY = "eon-changelog-seen";

export function latestChangelogDate() {
  return CHANGELOG[0]?.date || "";
}

export function readSeenChangelogDate() {
  try {
    return window.localStorage.getItem(CHANGELOG_SEEN_KEY) || "";
  } catch {
    return "";
  }
}

export function markChangelogSeen() {
  try {
    window.localStorage.setItem(CHANGELOG_SEEN_KEY, latestChangelogDate());
    window.dispatchEvent(new Event("eon-changelog-seen"));
  } catch {
    // Private mode: the dot just shows again next session.
  }
}
