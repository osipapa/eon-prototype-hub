/* The hub's own changelog, shown from "What's new" in the sidebar.
   Convention: every push that changes the platform adds an entry here
   (newest first) in the same commit. Grouping is by day — extend the day's
   entry if one already exists for today. */

export const CHANGELOG = [
  {
    date: "2026-07-21",
    title: "Comments jump to their pin",
    items: [
      "🎯 Click a pinned comment (or its pin number) and the canvas jumps to it — device, theme, and controls restore, and the prototype scrolls the pinned spot into view.",
      "📌 Pins now remember where in the page they were placed, so pins in scrolled or long prototypes land in the right section after a reload.",
    ],
  },
  {
    date: "2026-07-20",
    title: "Pinned feedback, reactions, and quicker commenting",
    items: [
      "📌 Pin comments to the prototype — point at the exact element; pins track it, and a leader line connects the comment to its pin.",
      "⚡ Quick-comment ring on pin drop — Change copy, AI slop, emoji takes, or write in place and hit Enter.",
      "😀 Emoji reactions on comments, and hover any pin to preview its comment. Single-emoji takes wear the emoji as their pin.",
      "✅ Resolve and reopen comments, with an Open/Resolved filter. Pins placed in another state get a chip that restores it.",
      "🖼️ Comments take images — paste, drop, or pick a screenshot.",
      "✨ A proper branded loading screen on app start and reloads.",
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
  } catch {
    // Private mode: the dot just shows again next session.
  }
}
