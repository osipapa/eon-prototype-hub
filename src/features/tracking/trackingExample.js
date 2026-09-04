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
  intro: [
    "Mixpanel is where we see what people actually do in the product. An event is a record of something that happened, with a few typed properties that say how. Reports, funnels, and retention all come from those events, so the quality of a chart is decided at the moment the event is defined.",
    "We track completed actions, not taps: a booking confirmed, a subscription started, a carousel scrolled to the end. A click is only an event when the click itself is the behaviour we want to measure.",
  ],
  eventCode: `mixpanel.track("Feature Action Completed", {
  "Feature Name": "vehicle_carousel",   // stable identifier for the feature
  "Action": "scroll",                   // one of the approved action values
  "Surface": "iOS",                     // Web, iOS, or Android
  "Result": "Success",                  // Success or Partial
  "Duration Ms": 1240                   // optional, elapsed time in milliseconds
});`,
  checkIntro: "Before an event is used in a report, someone checks it end to end:",
  promptIntro: "When a feature needs tracking, this prompt turns the flow into a plan: the questions the data should answer, the events and their exact names, a property contract for each, the shared helpers, and a checklist for verifying it in Mixpanel. Fill in the placeholders and paste it into Claude.",
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
    trigger: "The example below fires when the product confirms that the person's primary action completed. It has one exact trigger and five properties, each with a type and a documented set of values.",
    properties: [
      { name: "Feature Name", type: "string", values: "Stable feature identifier", required: true },
      { name: "Action", type: "enum", values: "Approved action value", required: true },
      { name: "Surface", type: "enum", values: "Web · iOS · Android", required: true },
      { name: "Result", type: "enum", values: "Success · Partial", required: true },
      { name: "Duration Ms", type: "integer", values: "Elapsed time in milliseconds", required: false },
    ],
    note: "The name and properties are illustrative. A real event reuses the vocabulary the product already has before it introduces new words.",
  },
  guardrails: [
    "Track completed product behaviour, not interface clicks.",
    "Event names and property builders live in one shared analytics module that every surface uses.",
    "People are identified the same way everywhere, and the moment an anonymous visitor becomes a known user is documented.",
    "Free text and personal information never go into an event without an explicit privacy decision.",
    "Retries and duplicates are decided before an event is allowed to be sent offline.",
  ],
  qa: [
    "The exact event name, its casing, and every property type and value show up in Mixpanel Live View.",
    "The happy path, the alternate paths, failure, cancellation, retry, and a quick double-tap all behave as documented.",
    "One action produces one event, never two.",
    "Identity and the shared properties look right both signed out and signed in.",
    "The production release is watched for a while before the event goes into a report.",
  ],
  setupPrompt: MIXPANEL_SETUP_PROMPT_BODY,
};
