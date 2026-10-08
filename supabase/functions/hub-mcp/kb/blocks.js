// Interactive blocks a knowledge base page can embed with a ```eon:<name>```
// fence (the fence body is an optional argument). The hub draws each one;
// blockMarkdown gives the agent the same content as text.
import { MIXPANEL_TRACKING_EXAMPLE, TRIP_REVIEW_PLAN } from "./trackingExample.js";
import { WEBSITE_ATTRIBUTION } from "./websiteAttribution.js";

export const LINEAR_FLOW = {
  ticket: {
    id: "DES-###",
    template: "Feature template",
    title: "Add a clear scroll affordance to the vehicle carousel",
    meta: ["High", "1 point", "Customer app"],
    context: ["Problem + evidence", "Scope + non-goals", "Figma + prototype", "States + analytics", "Acceptance criteria"],
  },
  columns: [
    {
      board: "Design", status: "Ideas", type: "Backlog", color: "#bec2c8", owner: "Team leads",
      state: "Opportunity captured",
      action: "Add early work with the customer problem, evidence, and expected outcome.",
      exit: "The opportunity is clear enough to prioritize.",
    },
    {
      board: "Design", status: "Backlog", type: "Backlog", color: "#bec2c8", owner: "Team leaders",
      state: "Prioritized",
      action: "Organize, compare, and sequence the work against current priorities.",
      exit: "The team has committed to design the work next.",
    },
    {
      board: "Design", status: "Todo", type: "Unstarted", color: "#e2e2e2", owner: "Rei",
      state: "Committed",
      action: "Move the selected card into Todo and confirm the assignee and required context.",
      exit: "A designer is ready to begin execution.",
    },
    {
      board: "Design", status: "In Progress", type: "Started", color: "#f2c94c", owner: "Assigned designer",
      state: "Design active",
      action: "Run the regular design, critique, prototype, and validation cycles.",
      exit: "The design is ready for cross-functional approval.",
    },
    {
      board: "Design", status: "Needs Review", type: "Started", color: "#f2c94c", owner: "Designer + reviewers",
      state: "Approval gate",
      action: "Apply every required review label. Keep the card here until all approvals are recorded.",
      exit: "DES, OPS, and ENG reviews are approved.",
      reviews: [
        { label: "DES review", owner: "Mate", color: "#bec2c8" },
        { label: "OPS review", owner: "Ops team", color: "#ff6eff" },
        { label: "ENG review", owner: "Engineering", color: "#43fc11" },
        { label: "Approved", owner: "All clear", color: "#4cb782" },
      ],
    },
    {
      board: "Engineering", status: "Todo", type: "Unstarted", color: "#e2e2e2", owner: "Design team lead",
      state: "Handoff cleared",
      action: "Move the approved card to the Engineering board without splitting its context.",
      exit: "Engineering accepts the card for implementation.",
    },
    {
      board: "Engineering", status: "QA 👀", type: "Started", color: "#f2c94c", owner: "Original designer",
      state: "Design QA",
      action: "Check the implemented behavior against the approved design and acceptance criteria.",
      exit: "The designer records approval in the original QA thread.",
    },
  ],
};

export const ESTIMATE_SCALE = [
  { points: "1", days: 0.25, meaning: "A couple of hours", note: "A small, well understood change with nothing to investigate first." },
  { points: "2", days: 0.5, meaning: "Half a day", note: "Clear scope and a handful of states." },
  { points: "4", days: 1, meaning: "About a day", note: "One focused day with the shape already clear." },
  { points: "8", days: 2.5, meaning: "About half a week", note: "Several states, or a dependency to resolve." },
  { points: "16", days: 5, meaning: "About a week", note: "The largest a card should get." },
  { points: "32", days: 10, oversized: true, meaning: "About two weeks", note: "Too big to estimate honestly." },
  { points: "64", days: 20, oversized: true, meaning: "About a month", note: "A project, not a card." },
];

export const QA_FINDINGS = [
  "Check the implemented behavior against the approved design and acceptance criteria.",
  "List every finding as a checklist item under this one comment.",
  "Resolve or update each item as engineering addresses it.",
];

export const QA_RULES = [
  ["Open one comment", "Use a single top-level comment for the complete QA record."],
  ["Use a checklist", "Add every finding beneath that comment with checkmarks."],
  ["Reply for the next round", "Continue under the original comment instead of creating duplicates."],
];

const TEXT = {
  "linear-flow": () => [
    `Example ticket (${LINEAR_FLOW.ticket.template}): ${LINEAR_FLOW.ticket.id} · ${LINEAR_FLOW.ticket.title}.`,
    `Every card carries: ${LINEAR_FLOW.ticket.context.join(", ")}.`,
    "",
    "| Board | Status | Moved by | State | Action | Move on when |",
    "| --- | --- | --- | --- | --- | --- |",
    ...LINEAR_FLOW.columns.map((col) => {
      const reviews = col.reviews ? ` Labels: ${col.reviews.map((r) => `${r.label} (${r.owner})`).join(", ")}.` : "";
      return `| ${col.board} | ${col.status} | ${col.owner} | ${col.state} | ${col.action}${reviews} | ${col.exit} |`;
    }),
  ].join("\n"),
  "estimate-scale": () => [
    "| Points | Means | Note |",
    "| --- | --- | --- |",
    ...ESTIMATE_SCALE.map((s) => `| ${s.points} | ${s.meaning}${s.oversized ? " (split it)" : ""} | ${s.note} |`),
  ].join("\n"),
  "estimate-examples": () => [
    "- Split it: a card past 16 becomes smaller cards that each ship something (Trip review flow, 32 → Rate the trip, 16 + Add photos to a review, 16).",
    "- Re-point with a reason: when scope changes, change the number and say why on the card (4 → 8: review added the empty and loading states).",
  ].join("\n"),
  "qa-protocol": () => [
    "One top-level comment titled \"Design QA findings\" holds the whole QA record:",
    ...QA_FINDINGS.map((f) => `- [ ] ${f}`),
    "",
    ...QA_RULES.map(([title, body], i) => `${i + 1}. ${title}: ${body}`),
  ].join("\n"),
};

// Tracking blocks are drawn from structured data; the agent gets that data
// once per page (see trackingData) rather than a prose copy of each block.
const TRACKING_SOURCES = {
  mixpanel: () => ({ MIXPANEL_TRACKING_EXAMPLE, TRIP_REVIEW_PLAN }),
  attr: () => ({ WEBSITE_ATTRIBUTION }),
};

export const BLOCK_NAMES = [...Object.keys(TEXT), "tracking"];

export function blockMarkdown(name, arg = "") {
  if (TEXT[name]) return TEXT[name]();
  if (name === "tracking") return `_Interactive tracking block "${arg}": its data is under Reference data below._`;
  return `_Unknown block "${name}"._`;
}

// JSON for the tracking blocks a page uses, keyed by data source.
export function trackingData(blockArgs) {
  const sources = new Set(blockArgs.map((arg) => arg.split("-")[0]).filter((key) => TRACKING_SOURCES[key]));
  return Object.assign({}, ...[...sources].map((key) => TRACKING_SOURCES[key]()));
}
