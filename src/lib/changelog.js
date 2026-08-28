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
   off when the work has nothing to show. */

export const GROUP_ORDER = ["New", "Design", "Behavior", "Under the hood", "Fixes"];

export const CHANGELOG = [
  {
    date: "2026-08-28",
    title: "Light mode gets its contrast back",
    image: "changelog/2026-08-28-contrast.png",
    imageAlt: "The prototype state control in both themes: a white pill on a deepened track in light, the light pill on a dark track in dark.",
    groups: [
      {
        label: "Design",
        items: [
          "The selected state pill now reads as selected. It had been one shade off its own track in both themes, 1.15:1 in dark and 1.12:1 in light, which is invisible. Dark mode gives the pill the light surface and dark ink, 12.4:1; light mode keeps the white pill and deepens the track into a well around it.",
          "Light mode had almost no elevation: the page and the panels sitting on it were 1.04:1 apart. The page steps down to #F4F4F5, control surfaces to #E4E4E7, so a sidebar, a card, and an input no longer all read as the same white.",
          "Secondary text passes AA everywhere in light mode. It sat at 4.24:1 on control surfaces and 3.74:1 on the review tabs; it is 4.5:1 or better on every surface now, and the shadcn tokens were pulled onto the same value so components stop drifting from the palette.",
        ],
      },
      {
        label: "Behavior",
        items: [
          "The canvas takes its background from the prototype theme: white for light, black for dark. It used to open on a fixed mid-grey, so every prototype was judged against a colour it was never designed against. Picking a swatch still pins it; picking the one the theme would have chosen hands it back.",
        ],
      },
      {
        label: "Under the hood",
        items: [
          "A changelog entry can carry an image, and this one does. Releases you can see should show it.",
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
          "Full view now happens inside the app instead of a new tab: the chrome drops away, and the library or context panel slides back in when the pointer reaches a screen edge. Esc leaves. Touch devices still get the prototype as its own page.",
          "Pinching on a trackpad zooms the canvas, including over the prototype itself.",
          "A long list of prototype states now collapses to the current selection with its neighbours peeking in, and expands on hover.",
          "The setup prompt now tells prototypes to respect the iPhone safe areas, so a search bar or nav no longer ends up sliced by the Dynamic Island.",
          "The mobile viewport renders inside the iPhone mockup from the media library, so a mobile prototype reads as a phone rather than a floating rectangle. The mobile canvas is now 402x874, an iPhone 17 Pro, which is the screen that mockup frames.",
          "A local file linked in an earlier session can be reconnected from the Source row instead of picked again from scratch.",
          "A live-linked file says what it is doing: syncing, synced at a time, or rendering locally when auto-publish is off.",
          "Eon Design has a Linear section: handoff flow, estimation, and card quality with QA, each on its own page.",
          "Estimation documents the whole Linear scale as a timeline, 1 through 64, with the dot growing as the estimate does. 4 is about a day, 8 about half a week, 16 about a week; 32 and 64 are marked as too big to keep on one card.",
        ],
      },
      {
        label: "Design",
        items: [
          "The prototype screen is now three regions: pick one on the left, view it in the middle, everything about it on the right.",
          "Two toolbar rows collapsed into one, so the canvas gets back roughly 240px of height.",
          "Uploading prototype HTML opens as a sheet instead of a band that pushed the canvas down and stayed open.",
          "The context panel shows source, Figma, and Linear as always-visible rows above Comments and History.",
          "Zoom, theme, and canvas background merged into one cluster in the bottom-right corner.",
          "Dark mode gained a real elevation ladder, so chrome, panels, and controls no longer all sit on the same black.",
          "Control labels dropped their shouting capitals, and sidebar comment counts carry an icon that says what they count.",
          "Status dots lost their outer halo ring, and the loading screen logo lost its container and pulsing ring.",
          "What's new lists its updates as grouped bullets instead of a card each.",
          "The prototype state control floats on its own, with no container drawn around it. Collapsed, the pill keeps a solid edge while the labels either side of the selection fade out.",
        ],
      },
      {
        label: "Behavior",
        items: [
          "A Figma link can be pasted without turning on side-by-side compare first.",
          "Issue status is stated once in the title bar, and \"saved\" is stated once instead of six times.",
          "Row menus open above the trigger when they would run off the bottom, and no longer sit behind the panel they belong to.",
        ],
      },
      {
        label: "Under the hood",
        items: [
          "Live file sync survives the way editors actually save: a locked or half-written file is retried instead of ending the link, and a half-flushed read is never published to the team.",
          "A burst of saves reaches Supabase as one write rather than one per save.",
        ],
      },
      {
        label: "Fixes",
        items: [
          "Resizing a desktop window down no longer leaves both side panels open on top of each other.",
          "The state pills no longer sit underneath the zoom controls when Figma compare is on.",
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
          "The Eon logo now opens one compact area switcher for Eon Design, Prototypes, Prompts, and Mixpanel.",
          "A new Eon Design home documents principles, product design process, review practices, Linear handoff, and shared resources.",
        ],
      },
      {
        label: "Design",
        items: [
          "What's new now uses a release timeline with scannable dates, update counts, and grouped change summaries.",
          "Selected surfaces now stay monochrome while icons and active indicators use the Eon accent gradient.",
          "Numbered pins and unread badges now use dark text over the accent gradient for clear contrast.",
        ],
      },
      {
        label: "Behavior",
        items: [
          "Prompt edit and delete actions now use the same ellipsis menu and confirmation behavior as prototypes.",
          "Custom media can now be permanently deleted; resetting a logo or preset removes its saved override.",
        ],
      },
      {
        label: "Fixes",
        items: [
          "Logo loading no longer flashes a placeholder mark; size-matched skeletons hold the space until the real asset is ready.",
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
          "Every shared category and prompt now has a visible trash icon directly in the sidebar.",
          "Deleting a category keeps every prompt and moves it safely to another category.",
          "Empty categories now stay visible, and prompt creation uses the team's shared category list.",
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
          "Prompts now live in a shared library where the team can create, edit, delete, fill, and copy them.",
          "Tracking now includes a reusable Mixpanel setup guide, implementation prompt, event contract, and QA checklist.",
        ],
      },
      {
        label: "Behavior",
        items: [
          "Prompt variables now update the visible prompt instantly, with one copy icon inside the preview.",
        ],
      },
      {
        label: "Design",
        items: [
          "Prototypes, Prompts, and Tracking now share one system theme, resizable navigation, Eon palette, and changelog.",
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
          "Click a pinned comment or its pin number. The canvas restores the saved device, theme, and controls, then scrolls the pinned spot into view.",
        ],
      },
      {
        label: "Behavior",
        items: [
          "Pins remember their page position. Pins in long or scrolled prototypes return to the right section after a reload.",
          "Jumping to a comment on another screen now opens that screen. Pins stay hidden until their screen opens.",
        ],
      },
      {
        label: "Fixes",
        items: [
          "Uploaded prototypes no longer vanish after someone edits the Linear or Figma link. Live updates now keep the prototype HTML intact.",
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
          "Pin a comment to an element in the prototype. The pin tracks the element, and a line connects the comment to its pin.",
          "The quick-comment ring offers common feedback after you drop a pin. You can also write a comment in place and press Enter.",
          "Comments support emoji reactions. Hover a pin to preview its comment. A single-emoji comment uses the emoji as its pin.",
          "Paste, drop, or choose an image to add it to a comment.",
        ],
      },
      {
        label: "Behavior",
        items: [
          "Resolve and reopen comments from the Open and Resolved filters. A state chip restores the view where a pin was placed.",
        ],
      },
      {
        label: "Design",
        items: [
          "App start and reload now use the Eon loading screen.",
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
