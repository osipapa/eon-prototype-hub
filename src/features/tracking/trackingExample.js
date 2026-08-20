export const MIXPANEL_SETUP_PROMPT_BODY = `Act as a product analytics implementation lead. Create an implementation-ready Mixpanel tracking plan for {{feature_name}}.

Product goal:
{{product_goal}}

User flow:
{{user_flow}}

Platforms and technical context:
{{technical_context}}

Current analytics conventions:
{{analytics_conventions}}

Produce:
1. The measurement questions this tracking must answer
2. A concise event catalog with exact event names and firing conditions
3. A property contract for each event, including type, allowed values, units, and null behavior
4. Shared context properties and identity rules
5. Typed implementation helpers that centralize event names and properties
6. A QA checklist for Mixpanel Live View and production verification
7. Open product, data, or privacy decisions

Use completed product actions as events, not clicks, unless the click itself is the behavior being measured. Reuse existing naming conventions before introducing new ones. Represent money as integer cents and document enums exactly. Treat free text as a privacy boundary and never include credentials or personal data. Call out missing decisions instead of inventing behavior.`;

export const MIXPANEL_TRACKING_EXAMPLE = {
  slug: "mixpanel-tracking-setup",
  title: "Mixpanel tracking setup",
  summary: "A simple, reusable guide for turning a product flow into a reliable Mixpanel implementation.",
  platform: "Mixpanel",
  coverage: "Web + iOS",
  setupSteps: [
    {
      title: "Define the question",
      detail: "Write down the product decision the data should support before naming any events.",
    },
    {
      title: "Map the user flow",
      detail: "Mark the meaningful entry, progress, completion, failure, and cancellation moments.",
    },
    {
      title: "Create the contract",
      detail: "Give each event one exact trigger and typed properties with documented values and units.",
    },
    {
      title: "Implement once",
      detail: "Keep event names and property builders in a shared analytics module used by every surface.",
    },
    {
      title: "Validate in Mixpanel",
      detail: "Check payloads in Live View, test alternate paths, and monitor the production release.",
    },
  ],
  eventExample: {
    name: "Feature Action Completed",
    trigger: "The product confirms that the user's primary action completed successfully.",
    properties: [
      { name: "Feature Name", type: "string", values: "Stable feature identifier", required: true },
      { name: "Action", type: "enum", values: "Approved action value", required: true },
      { name: "Surface", type: "enum", values: "Web · iOS · Android", required: true },
      { name: "Result", type: "enum", values: "Success · Partial", required: true },
      { name: "Duration Ms", type: "integer", values: "Elapsed time in milliseconds", required: false },
    ],
    note: "Replace this illustrative name and property set with the vocabulary already used by your product.",
  },
  guardrails: [
    "Track completed product behavior rather than low-value interface clicks.",
    "Centralize event names and typed property builders in one analytics module.",
    "Identify users consistently and document anonymous-to-known transitions.",
    "Do not send free text or personal information without an explicit privacy decision.",
    "Define retry and deduplication behavior before supporting offline events.",
  ],
  qa: [
    "Confirm exact event names, casing, property types, and values in Mixpanel Live View.",
    "Test happy, alternate, failure, cancellation, retry, and rapid-repeat paths.",
    "Verify one user action produces one intended event and no duplicates.",
    "Check identity and shared context on both anonymous and signed-in sessions.",
    "Monitor the production release before using the new event in reports.",
  ],
  setupPrompt: MIXPANEL_SETUP_PROMPT_BODY,
};
