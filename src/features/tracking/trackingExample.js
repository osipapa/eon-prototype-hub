export const MIXPANEL_SETUP_PROMPT_BODY = `Act as a product analytics implementation lead. Create an implementation-ready Mixpanel tracking setup for {{feature_name}}.

Source issues:
{{linear_issues}}

Product behavior and tracking requirements:
{{tracking_requirements}}

Technical context:
{{technical_context}}

Produce:
1. A canonical event catalog with the exact firing condition for every event
2. A property contract for each event, including type, allowed values, null behavior, units, and source
3. Shared context properties and identity rules
4. Typed implementation examples that centralize event names and properties
5. A QA matrix covering happy paths, alternate paths, updates, skipped inputs, duplicate prevention, and offline/retry behavior
6. Mixpanel validation steps for development and production
7. Open decisions, conflicts, and privacy risks that must be resolved before release

Use the issue status as part of the contract: shipped behavior is an implementation reference; backlog behavior remains a draft. Preserve event and property names from the source unless you explicitly recommend a migration.

Treat free-text properties as a privacy boundary. If a field may contain personal information, flag it and require an explicit redaction, allowlist, retention, and approval decision before tracking it. Never include credentials or personal data in examples. Represent money as integer cents and document every enum exactly. Do not invent missing product behavior.`;

export const MIXPANEL_TRACKING_EXAMPLE = {
  slug: "mixpanel-tracking-setup",
  title: "Mixpanel tracking setup",
  summary: "An implementation contract for cancellation and trip-review events, grounded in one shipped issue and one draft issue.",
  platform: "Mixpanel",
  sources: [
    {
      id: "ENG-723",
      title: "Create Cancellation flow Mixpanel events — v.2",
      status: "In Prod",
      tone: "shipped",
      url: "https://linear.app/eonrides/issue/ENG-723/create-cancellation-flow-mixpanel-events-v2",
      note: "Use as the implementation reference. The event plan was completed and QA-approved on Web and iOS.",
    },
    {
      id: "ENG-841",
      title: "Refactor reviews in the app",
      status: "Backlog",
      tone: "draft",
      url: "https://linear.app/eonrides/issue/ENG-841/refactor-reviews-in-the-app",
      note: "Treat as a draft contract. Product, data, offline behavior, and privacy decisions remain open.",
    },
  ],
  flows: [
    {
      id: "cancellation",
      title: "Cancellation flow",
      source: "ENG-723",
      status: "Implementation reference",
      events: [
        {
          name: "Cancellation Started",
          trigger: "The traveler acts on the “Cancel This Trip?” confirmation.",
          properties: [
            { name: "Outcome", type: "enum", values: "Cancel Trip · Keep Trip", required: true },
            { name: "Cancellation Scenario", type: "enum", values: "Refundable - Within Window · Refundable - Window Closed · Non-Refundable - Within Booking Hour · Regular", required: true },
          ],
        },
        {
          name: "Cancellation Reason Selected",
          trigger: "The traveler continues from or skips the cancellation-reason step.",
          properties: [
            { name: "Reason", type: "enum | null", values: "Approved cancellation-reason value, or null when skipped", required: false },
            { name: "Detail Text", type: "string | null", values: "Free text supplied by the traveler, or null", required: false, risk: "Review for personal information before enabling." },
            { name: "Was Skipped", type: "boolean", values: "true · false", required: true },
            { name: "Cancellation Scenario", type: "enum", values: "Same four-value contract as Cancellation Started", required: true },
          ],
        },
        {
          name: "Refund Method Selected",
          trigger: "The traveler confirms a refund method for any refund scenario other than Regular.",
          properties: [
            { name: "Method", type: "enum", values: "Eon Credit · Card", required: true },
            { name: "Refund Amount", type: "integer", values: "Amount in cents", required: true },
            { name: "Cancellation Scenario", type: "enum", values: "Refundable - Within Window · Refundable - Window Closed · Non-Refundable - Within Booking Hour", required: true },
          ],
        },
        {
          name: "Page Viewed",
          trigger: "A cancellation step becomes visible.",
          properties: [
            { name: "Page Name", type: "enum", values: "Cancellation Reason · Cancellation Refund Method · Cancellation Confirmation", required: true },
            { name: "Cancellation Scenario", type: "enum", values: "Same four-value cancellation scenario contract", required: true },
          ],
        },
      ],
    },
    {
      id: "trip-reviews",
      title: "Trip review flow",
      source: "ENG-841",
      status: "Draft contract",
      events: [
        {
          name: "Trip Reviewed",
          trigger: "The traveler taps a star on the Rate Your Trip card; saving happens immediately.",
          properties: [
            { name: "Rating", type: "integer", values: "1–5", required: true },
            { name: "Is Update", type: "boolean", values: "true when an existing rating changes", required: true },
            { name: "Car ID", type: "identifier", values: "Internal car identifier", required: true },
            { name: "Owner ID", type: "identifier", values: "Owner admin identifier", required: true },
          ],
        },
        {
          name: "Trip Review Details Added",
          trigger: "The traveler submits after answering at least one optional detail question.",
          properties: [
            { name: "Rating", type: "integer", values: "1–5", required: true },
            { name: "Subratings", type: "integer | null", values: "Five named subratings, each 1–5 or null", required: false },
            { name: "Access Method", type: "enum | null", values: "Approved access-method value, or null", required: false },
            { name: "Contacted Party", type: "enum | null", values: "Approved contacted-party value, or null", required: false },
            { name: "Had Issue", type: "enum | null", values: "Yes · No · null", required: false },
            { name: "Issue Contact", type: "enum | null", values: "Eon · Owner · null; only when an issue occurred", required: false },
            { name: "Support Channel", type: "enum | null", values: "Email · Phone · null; only when an issue occurred", required: false },
            { name: "Support Resolved", type: "enum | null", values: "Yes · No · null; only when an issue occurred", required: false },
            { name: "Detail Text", type: "string | null", values: "Free text, or null", required: false, risk: "May contain personal information. Do not ship without a documented privacy decision." },
            { name: "Car ID", type: "identifier", values: "Internal car identifier", required: true },
            { name: "Owner ID", type: "identifier", values: "Owner admin identifier", required: true },
          ],
        },
        {
          name: "App Store Review Requested",
          trigger: "The app-store review ask appears after review submission.",
          properties: [
            { name: "Outcome", type: "enum | null", values: "Clicked · null", required: false },
            { name: "Rating", type: "integer", values: "4 · 5", required: true },
          ],
          note: "Suppress when rating is below 4 or Support Resolved is No.",
        },
        {
          name: "Page Viewed",
          trigger: "The Trip Summary page becomes visible.",
          properties: [
            { name: "Page Name", type: "enum", values: "Trip Summary", required: true },
          ],
        },
      ],
    },
  ],
  guardrails: [
    "Keep event names and property keys in one typed analytics module; UI code should call named helpers.",
    "Fire completion events only after the corresponding product action succeeds. Document retry and deduplication behavior.",
    "Send Refund Amount as integer cents. Do not mix decimal currency and cent values.",
    "Use explicit nulls only where the source contract distinguishes unanswered or skipped input; do not substitute empty strings.",
    "Confirm identity is available before emitting Car ID and Owner ID, and document anonymous-to-known user transitions.",
    "Do not send free text until privacy approves redaction, allowlisting, retention, and access rules.",
  ],
  openDecisions: [
    {
      title: "Review credit amount",
      detail: "ENG-841 references both $25 and $30. Product must choose one value before copy, eligibility logic, and analytics are finalized.",
    },
    {
      title: "Review data and offline behavior",
      detail: "The issue calls out database setup and an offline-car question without a final contract. Define persistence, retry, and deduplication before implementation.",
    },
    {
      title: "Free-text privacy",
      detail: "Detail Text may contain personal information. Decide whether it is prohibited, redacted, transformed, or explicitly approved before sending it to Mixpanel.",
    },
    {
      title: "Subrating property names",
      detail: "ENG-841 specifies five subratings but the normalized property keys still need to be confirmed with Product and Data.",
    },
  ],
  qa: [
    "Validate exact event names, casing, and property types in Mixpanel Live View.",
    "Exercise every cancellation scenario, including Keep Trip, skipped reason, and Regular without refund selection.",
    "Verify Trip Reviewed emits once per saved star tap and marks later ratings as updates.",
    "Verify review details do not emit when every optional question is unanswered.",
    "Verify the app-store ask is suppressed below four stars and when support was unresolved.",
    "Test offline, retry, rapid taps, navigation back, and duplicate-submit paths before production release.",
    "Confirm no credentials or unapproved personal information appear in event payloads.",
  ],
  setupPrompt: MIXPANEL_SETUP_PROMPT_BODY,
};
