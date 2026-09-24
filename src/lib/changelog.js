/* The hub's own changelog, shown from "What's new" in the sidebar.
   Convention: every push that changes the platform adds an entry here
   (newest first) in the same commit. Grouping is by day. Extend the day's
   entry if one already exists for today.

   Each entry's changes are grouped so a long release stays scannable. Use the
   labels in GROUP_ORDER and keep them in that order; drop any group with
   nothing in it.

   An entry may carry `image` (a path under public/, so it survives the Pages
   build) and `imageAlt`. Add one whenever the release is something you can see:
   a screenshot of the change says more than the bullet describing it. Leave it
   off when the work has nothing to show.

   Keep it short: one line per change, what people can see or do, no
   implementation detail. The caption (imageAlt) is one short sentence. */

export const GROUP_ORDER = ["New", "Design", "Behavior", "Under the hood", "Fixes"];

export const CHANGELOG = [
  {
    date: "2026-09-24",
    title: "Split view and status sections",
    image: "changelog/2026-09-24-split-view.png",
    imageAlt: "Two prototypes side by side, with the sidebar grouped by Linear status.",
    groups: [
      {
        label: "New",
        items: [
          "Split view: drag a prototype onto the canvas to open it beside the one you're on. Its menu has Open in split view too.",
          "Click a pane to make it active. Comments, pins, and shortcuts follow it; device, theme, and zoom apply to both.",
          "Collapse the sidebar from its header or with [. Hover the left edge to bring it back over the canvas.",
        ],
      },
      {
        label: "Behavior",
        items: [
          "Prototypes are grouped by their Linear status. Switch to Groups for your own groups.",
          "Anyone on the team can rename, reorder, regroup, and delete any prototype from its menu.",
          "Double-click a prototype to rename it, drag it to reorder, or use the pencil to rename a group.",
          "Checks and Figma links are gone from the context panel.",
        ],
      },
    ],
  },
  {
    date: "2026-09-23",
    title: "Your phone, automatic checks, and shortcuts",
    image: "changelog/2026-09-23-phone-and-checks.png",
    imageAlt: "The phone QR popover showing Phone connected, next to the Checks results.",
    groups: [
      {
        label: "New",
        items: [
          "Open on your phone: scan the QR next to Full view. Taps, typing, and scrolling mirror both ways.",
          "Checks test every state at phone width for overflow, tap targets, contrast, and small fields.",
          "⌘K jumps to any prototype, most recent first.",
          "Shortcuts: ← → states, 1 to 4 device, G grid, T theme, F full view.",
          "Copy screenshot, next to zoom, puts the current state on your clipboard.",
          "Edit or delete your own comments. A comment's time links straight to it.",
        ],
      },
      {
        label: "Behavior",
        items: [
          "Prototypes reopen in the device you last used for them.",
          "The address bar keeps the device, theme, and state, so a copied link opens the same view.",
          "Linear tickets show as chips in their status color.",
          "Signing in takes you to the link you opened.",
        ],
      },
      {
        label: "Fixes",
        items: [
          "Full view on phones stays in the hub. Double-tap empty space or go back to leave.",
          "The walkthrough can be finished again.",
          "Dialogs keep your typing when the page updates.",
          "On phones, fields don't zoom, comment actions show, and Return adds a line.",
          "The Controls sheet on phones shows pills and grids, not circles.",
          "The laptop toolbar fits on one line with both panels open.",
          "On this page links in Eon Design scroll to their section.",
          "Pick a group in New prototype is a dropdown with every group.",
        ],
      },
    ],
  },
  {
    date: "2026-09-22",
    title: "Upload images, a calmer Media page, and maps",
    image: "changelog/2026-09-22-media.png",
    imageAlt: "The Media page with your library first and Upload image at the top.",
    groups: [
      {
        label: "New",
        items: [
          "Upload images to Media, or drop them anywhere on the page. They work as {{tokens}}.",
          "Replace an image by dropping a file on it, or from its menu.",
          "Prototypes can use real Mapbox maps; the setup prompt carries the token and style.",
          "Move a prototype to another group, or a new one, from its menu.",
        ],
      },
      {
        label: "Design",
        items: [
          "Media shows your library first, each image's token one click from your clipboard.",
        ],
      },
    ],
  },
  {
    date: "2026-09-04",
    title: "Tracking moves into Eon Design",
    image: "changelog/2026-09-04-tracking.png",
    imageAlt: "Eon Design open on the Websites tracking page.",
    groups: [
      {
        label: "New",
        items: [
          "Websites explains how eonrides.com tracks a click and opens the right app screen.",
          "Mixpanel documents the trip review events, with every property and payload.",
        ],
      },
      {
        label: "Behavior",
        items: [
          "Pages still being written are marked In progress.",
          "Old /tracking links open the Mixpanel page.",
        ],
      },
    ],
  },
  {
    date: "2026-08-28",
    title: "Light mode gets its contrast back",
    image: "changelog/2026-08-28-contrast.png",
    imageAlt: "The state control in light and dark, with the selected pill clearly visible.",
    groups: [
      {
        label: "Design",
        items: [
          "The selected state pill is visible in both themes.",
          "Light mode has real elevation, and secondary text passes AA everywhere.",
        ],
      },
      {
        label: "Behavior",
        items: [
          "The canvas follows the prototype theme: white for light, black for dark.",
        ],
      },
    ],
  },
  {
    date: "2026-08-27",
    title: "The workspace gets a hierarchy",
    groups: [
      {
        label: "New",
        items: [
          "Full view stays in the app; panels slide in from the screen edges.",
          "Pinch to zoom the canvas on a trackpad.",
          "Long state lists collapse around the current state and expand on hover.",
          "The mobile viewport renders inside an iPhone 17 Pro frame.",
          "Reconnect a previously linked local file from the Source row.",
          "Eon Design has Linear pages: handoff flow, estimation, and card quality.",
        ],
      },
      {
        label: "Design",
        items: [
          "Three regions: prototypes on the left, the canvas in the middle, context on the right.",
          "One toolbar row instead of two, and zoom, theme, and background in one corner.",
          "Dark mode has a proper elevation ladder.",
        ],
      },
      {
        label: "Behavior",
        items: [
          "Paste a Figma link without turning on compare first.",
        ],
      },
      {
        label: "Fixes",
        items: [
          "Side panels no longer overlap after shrinking the window.",
        ],
      },
    ],
  },
  {
    date: "2026-08-20",
    title: "Eon Design grows beyond tabs",
    groups: [
      {
        label: "New",
        items: [
          "The Eon logo opens a switcher between the areas of the hub.",
          "A new Eon Design home for principles, process, reviews, and handoff.",
        ],
      },
      {
        label: "Design",
        items: [
          "What's new became a timeline of releases.",
        ],
      },
      {
        label: "Behavior",
        items: [
          "Prompts use the same menu and delete confirmation as prototypes.",
          "Custom media can be deleted; resetting restores the default.",
        ],
      },
      {
        label: "Fixes",
        items: [
          "Logos no longer flash a placeholder while loading.",
        ],
      },
    ],
  },
  {
    date: "2026-08-10",
    title: "Prompt library organization",
    groups: [
      {
        label: "Behavior",
        items: [
          "Delete categories and prompts from the sidebar.",
          "Deleting a category moves its prompts to another one.",
          "Empty categories stay visible.",
        ],
      },
    ],
  },
  {
    date: "2026-07-28",
    title: "The Prototype Hub is now the Design Hub",
    groups: [
      {
        label: "New",
        items: [
          "A shared prompt library the team can create, fill, and copy from.",
          "A Mixpanel setup guide with a prompt, event contract, and QA checklist.",
        ],
      },
      {
        label: "Design",
        items: [
          "Prototypes, Prompts, and Tracking share one theme and navigation.",
        ],
      },
    ],
  },
  {
    date: "2026-07-21",
    title: "Comments jump to their pin",
    groups: [
      {
        label: "New",
        items: [
          "Click a pinned comment to restore its device, theme, and state, and scroll to the spot.",
        ],
      },
      {
        label: "Behavior",
        items: [
          "Pins keep their place in long and multi-screen prototypes.",
        ],
      },
      {
        label: "Fixes",
        items: [
          "Uploaded prototypes no longer disappear after editing a link.",
        ],
      },
    ],
  },
  {
    date: "2026-07-20",
    title: "Pinned feedback, reactions, and quicker commenting",
    groups: [
      {
        label: "New",
        items: [
          "Pin comments to elements; a line connects each comment to its pin.",
          "A quick-comment ring offers common feedback when you drop a pin.",
          "Emoji reactions, and images in comments by paste, drop, or upload.",
        ],
      },
      {
        label: "Behavior",
        items: [
          "Resolve comments and filter Open or Resolved.",
        ],
      },
    ],
  },
];

// Entries may still carry a flat `items` list; read them through this.
export function changelogGroups(entry) {
  if (entry.groups?.length) return entry.groups.filter((group) => group.items?.length);
  return entry.items?.length ? [{ label: null, items: entry.items }] : [];
}

export function changelogCount(entry) {
  return changelogGroups(entry).reduce((total, group) => total + group.items.length, 0);
}

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
