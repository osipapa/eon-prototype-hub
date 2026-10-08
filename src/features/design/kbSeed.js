/* Starting content for the Eon Design knowledge base (kb_entries). The
   migration seeds these rows (scripts/kb-seed-sql.mjs prints the SQL), and the
   hub falls back to them while the table is unavailable. After seeding, the
   table is the source of truth: edit pages in the hub, not here.

   Bodies are markdown. ```tokens:<set>``` draws a token table, ```eon:<block>```
   an interactive block (body = its argument), and [text](kb:slug#heading)
   links another entry. */

const entry = (sort_order, slug, type, group_path, title, summary, body_md, extra = {}) => ({
  slug, type, group_path, title, summary, body_md: body_md.trim() + "\n", sort_order,
  status: "published", refs: [], ...extra,
});
const draft = { status: "draft" };

export const KB_SEED = [
  entry(10, "overview", "concept", "Get started", "Designing Eon, together",
    "The shared home for how we shape product ideas, collaborate across disciplines, and hand work off with confidence.", `
## One place for the work around the work

Eon Design keeps team standards, review rules, handoff steps, and common links in one place. Product, design, engineering, and operations can work from the same instructions.

- [Foundations](kb:spacing): spacing, color, type, radius, and elevation, with the token for each.
- [Principles](kb:principles): the qualities we want every Eon experience to express.
- [Ways of working](kb:product-process): a practical path from framing through learning.
- [Linear](kb:linear-handoff): how we point, hand off, and QA work on the board.
- [Tracking](kb:tracking-mixpanel): how we instrument Mixpanel and keep attribution intact on the websites.
- [Resources](kb:common-files): common destinations for files, tools, and shared references.

## A shared path from idea to learning

Use each step when it answers a real question or records a decision. Skip steps that add no useful information.

1. **Frame.** Align on the customer problem, evidence, constraints, and decision owner.
2. **Explore.** Compare credible directions and make tradeoffs visible early.
3. **Prototype.** Use the prototype hub to test behavior, states, and edge cases.
4. **Deliver.** Connect final design intent to a ready Linear issue and review together.
5. **Learn.** Validate the outcome with customer evidence and Mixpanel signals.
`, draft),

  entry(11, "principles", "concept", "Get started", "Eon design principles",
    "A starting point for decisions when requirements, patterns, or opinions compete.", `
## What our experiences should feel like

Use these principles in briefs and critiques. If two principles point to different choices, name the tradeoff.

- **Make the next step clear.** Prioritize the decision or action in front of the customer. Reveal depth as it becomes useful.
- **Earn confidence.** Show status, consequences, and recovery paths. Never make people guess whether important work was saved.
- **Design the whole journey.** Include empty, loading, error, permission, and return states. The ideal path is only one part of the work.
- **Prefer useful momentum.** Reduce handoffs and repeated work while keeping people in control of consequential actions.

## Use principles to resolve a tradeoff

Name the tension and the principle that matters most. Record what the decision prioritizes. Principles guide judgment but do not replace it.

- Describe the customer and the decision they are trying to make.
- State the competing needs or constraints in plain language.
- Use evidence to choose which principle has priority here.
- Record the tradeoff so later reviewers understand the intent.
`, draft),

  entry(20, "spacing", "reference", "Foundations", "Spacing",
    "A small set of space values, built on an 8px base unit, so layouts line up across the app, the web app, and every prototype.", `
Consistent spacing makes screens feel calm and related. Every gap, padding, and margin comes from the same ten steps, so a card on iOS and a card on the web app read as the same thing.

## 8 pixel base unit

Our spacing is built on a base unit of 8 pixels. Every step on the scale is a multiple of it, with one half step (4px) for tight pairs like an icon and its label.

## Scale

The scale runs from 0px to 80px. Pick the nearest step instead of inventing a value in between; if nothing fits, the layout usually needs a different structure, not a new number.

## Space tokens

Use the token instead of a raw pixel value whenever you add space between or inside elements. The names carry the pixel value, so \`--spacing-16\` is 16px.

\`\`\`tokens:space
\`\`\`

## Spacing usage

### Small values: 0px to 8px

For space inside and between small pieces: an icon and its label, the lines of a chip, stacked text in a list row.

### Medium values: 16px to 24px

For padding inside components and the gaps between them. 16px is the default screen margin on mobile; 24px is the padding inside content cards and success banners.

### Large values: 32px to 80px

For separating sections of a screen and for page-level margins on desktop. Larger space marks a bigger change in topic.

## Layout guidelines

### Group by proximity

Things that belong together sit closer together. Keep the space inside a group visibly smaller than the space around it, usually one step down the scale.

### Create order and hierarchy

Use more space above a heading than below it, so the heading reads as the start of what follows.

### Keep desktop reading columns narrow

On the guest website at desktop width, content sections cap at a 600px column, centered. Wider screens add margin, not line length.

## Related

- [Radius](kb:radius) pairs with spacing: an 8px corner on a 16px padded element.
- [Elevation](kb:elevation) separates surfaces where space alone is not enough.
`, { refs: ["radius", "elevation"] }),

  entry(21, "color", "reference", "Foundations", "Color",
    "Three brand colors, one neutral scale, and four states, each with separate light and dark values.", `
Colors come from Eon's Figma variables. Style through the semantic tokens (\`--text-primary\`, \`--background-2\`) so both modes work; reach for a primitive only when no semantic token fits.

## Brand

Three brand colors, each with one job. The legacy value \`#d400ff\` in older files is not any of them: replace it.

\`\`\`tokens:brand
\`\`\`

## Neutrals

The grey scale behind every background, border, and text color.

\`\`\`tokens:grey
\`\`\`

## Text

\`\`\`tokens:text
\`\`\`

## State

Error, success, pending, and warning each have a light-mode and a dark-mode value. Tinted fills use the state color at 15% alpha; brand tints use 10%.

\`\`\`tokens:state
\`\`\`

## Light and dark

Ship both modes, dark by default. The modes are not mirror images: the primary button is a baby-elephant fill with black text in dark mode and changes character in light mode. Always take each mode's value from its own token file instead of deriving one from the other.

## Related

- [Elevation](kb:elevation#surfaces) lists the background tokens for each surface level.
`, { refs: ["elevation#surfaces"] }),

  entry(22, "typography", "reference", "Foundations", "Typography",
    "DM Sans in six sizes and two weights. Nothing in between.", `
## Typeface

DM Sans is the only font, in weights 400 and 500. Poppins, Inter, or Geist in an older file is drift: correct it when you touch the file.

## Type scale

\`\`\`tokens:type
\`\`\`

## Weights

\`\`\`tokens:weight
\`\`\`

## Usage

### Titles

Large title for a screen's one main heading. Title 1 and Title 2 for sections and modal titles (modals use 20px, weight 500).

### Body and captions

Body (16px) for reading text and input values. Caption 1 (12px) for status chips and metadata; Caption 2 (11px) only where space is very tight.

## Related

- [Color](kb:color#text) for text color tokens.
`, { refs: ["color#text"] }),

  entry(23, "radius", "reference", "Foundations", "Radius",
    "Four corner sizes from the production web app, each tied to a kind of element.", `
Figma defines no radius variables yet, so this scale comes from what ships in the production web app.

## Radius scale

\`\`\`tokens:radius
\`\`\`

## Choosing a radius

### Rectangles and pills

Block CTAs are 8px rectangles; navigation actions and segmented controls are 100px pills. The shape tells people which kind of action it is, so do not mix them.

### Cards

Content cards use 24px; selectable option cards, modals, and banners use 16px. A card's header band uses 24px 24px 0 0. The 20px card radius in older prototypes predates this scale: use 24px.

### Prototypes

Phone frames in prototypes use 44px corners.

## Related

- [Spacing](kb:spacing#space-tokens) for the padding that goes with each radius.
`, { refs: ["spacing#space-tokens"] }),

  entry(24, "elevation", "reference", "Foundations", "Elevation",
    "Three surface levels and one shadow. Depth comes from the background step, not from heavy shadows.", `
## Surfaces

Every regular screen background is \`--background-1\`. Cards and surfaces sit on it with \`--background-2\`; raised elements on a card use \`--background-3\`.

\`\`\`tokens:surface
\`\`\`

## Borders

Cards in dark mode carry a 1px \`#1E1E22\` border so they hold their edge on black. Selected option cards switch that border to pinkling (\`#E15CF7\`).

## Shadow

There is one shadow color, \`--shadow\`. Use it for floating layers such as menus and sheets, not for cards sitting on the page.

## Related

- [Color](kb:color) for the full palette.
- [Radius](kb:radius#cards) for card corners.
`, { refs: ["color", "radius#cards"] }),

  entry(30, "product-process", "howto", "How we work", "Product design process",
    "Five steps for turning an unclear opportunity into a shipped change the team can measure.", `
## Shape the problem before the solution

Start with the customer behavior or business condition that needs to change. A useful brief names the evidence, target customer, constraints, success signal, and unresolved questions.

- Link the source evidence and the owning Linear initiative or project.
- Write the desired outcome without prescribing a screen or component.
- Name the decision owner and the people needed for review.
- Agree on how the team will know the change worked.

## Make, test, and narrow

Compare distinct approaches, then build the smallest realistic prototype that answers the riskiest question.

1. **Diverge.** Create meaningfully different approaches, not cosmetic variants.
2. **Critique.** Review against the brief, principles, evidence, and technical constraints.
3. **Prototype.** Model the critical interaction and non-happy-path states.
4. **Validate.** Put the artifact in front of the people or data that can reduce uncertainty.
5. **Commit.** Record the chosen direction and the tradeoffs the team accepted.
`, draft),

  entry(31, "design-review", "howto", "How we work", "Design review",
    "Use reviews to improve the decision, not to perform a final approval ritual.", `
## Match the review to the maturity of the work

- **Direction review.** Use this early to align on the problem, options, and riskiest assumptions.
- **Interaction review.** Use this while shaping the work to inspect flows, system behavior, states, and content together.
- **Delivery review.** Use this before handoff to check responsive behavior, accessibility, and edge cases.

## Bring enough context for useful feedback

A reviewer should understand the decision you need without reconstructing the project history.

- State the customer problem and what changed since the last review.
- Call out the specific question or decision needed today.
- Link the prototype and show important states in context.
- Separate blocking concerns from follow-up improvements.
- Close the loop by recording the decision and owner.
`, draft),

  entry(32, "ai-principles", "decision", "How we work", "AI usage principles",
    "How the team uses AI tools in design work, and what we check before anything AI-assisted ships.", `
## What this page will cover

Where AI tools help and where they get in the way, what we review before AI-assisted work goes out, what never goes into a prompt, and how we say when AI was used. The principles are being written with the team; nothing here is final yet.
`, draft),

  entry(40, "linear-handoff", "howto", "Linear", "Handoff flow",
    "The board flow and review gates that carry design work from an idea through Engineering QA.", `
## From idea to Engineering QA

The columns below mirror the live Design and Engineering workflows. The card remains the source of truth throughout the process; ownership changes at explicit gates, but the designer stays connected through Engineering QA.

\`\`\`eon:linear-flow
\`\`\`

## Related

- [Card quality & QA](kb:linear-cards#keep-qa-findings-in-one-comment-thread) for how Engineering QA findings are recorded.
`, { refs: ["linear-cards#keep-qa-findings-in-one-comment-thread"] }),

  entry(41, "linear-estimation", "reference", "Linear", "Estimation",
    "What a point means on our boards, so an estimate reads the same to everyone who opens the card.", `
## What a point is worth

Linear's doubling scale: each size is twice the one before. Points describe effort, not a delivery date.

\`\`\`eon:estimate-scale
\`\`\`

## How to land on a number

Estimate the whole card, including the states, the edge cases, and the review rounds the work will actually need.

- Size the work as written on the card. If the scope is not clear enough to size, the card is not ready to estimate.
- For anything under a day, pick by how much is unknown, not by counting hours.

\`\`\`eon:estimate-examples
\`\`\`
`),

  entry(42, "linear-cards", "howto", "Linear", "Card quality & QA",
    "What a card has to contain to be useful to the next person, and how QA findings stay readable.", `
## The assignee owns the quality of the card

Whoever is working on the card must use the Feature template and complete every required field. The card should let the next person understand the outcome, behavior, decisions, and validation criteria without reconstructing the project history.

- Start from the Feature template. Do not create an unstructured delivery card.
- Fill every required field, including outcome, scope, design links, states, analytics, and acceptance criteria.
- Keep decisions and scope changes on the card as the work moves through review and implementation.
- Stay accountable after handoff: follow the card until it reaches Engineering QA.
- If you designed it, you QA the implemented experience and record your approval.

## Keep QA findings in one comment thread

QA should read as one continuous record. Open one top-level comment, capture findings as a checklist, and use replies on that original comment for every follow-up round.

\`\`\`eon:qa-protocol
\`\`\`
`),

  entry(50, "tracking-mixpanel", "howto", "Tracking", "Mixpanel tracking setup",
    "How we turn something a person does in the product into an event we can trust in a report, shown on the trip review flow.", `
## What we track, and in what order

\`\`\`eon:tracking
mixpanel-overview
\`\`\`

## From a tap to an event

\`\`\`eon:tracking
mixpanel-tap
\`\`\`

## How we name and format things

\`\`\`eon:tracking
mixpanel-format
\`\`\`

## The trip review flow, event by event

Three events and one that already exists. For each: when it fires, the payload as sent, and every property with its type and allowed values.

\`\`\`eon:tracking
mixpanel-plan
\`\`\`

## Rules we keep to

\`\`\`eon:tracking
mixpanel-rules
\`\`\`

## Setup prompt

\`\`\`eon:tracking
mixpanel-prompt
\`\`\`
`),

  entry(51, "tracking-websites", "reference", "Tracking", "Site-wide attribution & routing",
    "How a person who taps an ad ends up in the app or the web app with the campaign and promo code still attached.", `
## What the script does

\`\`\`eon:tracking
attr-overview
\`\`\`

## Where a click goes

The site builds the link. AppsFlyer OneLink records the click and decides where the person ends up, based on their device and whether the app is installed.

\`\`\`eon:tracking
attr-map
\`\`\`

## What a campaign link looks like

\`\`\`eon:tracking
attr-url
\`\`\`

## What the script remembers

\`\`\`eon:tracking
attr-memory
\`\`\`

## How a button gets its link

\`\`\`eon:tracking
attr-buttons
\`\`\`

## Opening the right screen in the app

\`\`\`eon:tracking
attr-deeplink
\`\`\`

## Keeping the details from page to page

\`\`\`eon:tracking
attr-across
\`\`\`

## Arriving at the web app

\`\`\`eon:tracking
attr-return
\`\`\`

## What happens on each device

\`\`\`eon:tracking
attr-devices
\`\`\`

## Worked examples

The same person, six visits. What the Subscribe button on the page carries after each one.

\`\`\`eon:tracking
attr-examples
\`\`\`

## Settings the script depends on

The values at the top of the script, and what has to be true in AppsFlyer and in the apps for the whole chain to work.

\`\`\`eon:tracking
attr-settings
\`\`\`

## Checking it in the browser

\`\`\`eon:tracking
attr-console
\`\`\`
`),

  entry(60, "common-files", "reference", "Resources", "Common files & tools",
    "Links to the files and tools the team uses most.", `
## Eon Design tools

- [Prototype hub](#/): build, review, comment on, and share interactive product work.
- [Prompt library](#/prompts): reusable prompts and templates for design and delivery work.
- [Tracking guides](kb:tracking-mixpanel): Mixpanel setup, and how attribution flows through the websites.

## Shared destinations to connect

Replace each placeholder when the team agrees on the destination URL.

- **Figma libraries:** published product libraries, foundations, and shared components. _Link needed._
- **Linear workspace:** initiatives, product projects, delivery cycles, and issue templates. _Link needed._
- **Research repository:** customer evidence, studies, interview notes, and insight summaries. _Link needed._
- **Product strategy:** vision, priorities, operating metrics, and current bets. _Link needed._
`, draft),
];
