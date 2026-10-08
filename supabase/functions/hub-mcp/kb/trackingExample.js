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
    "We track completed actions: a trip rated, a review submitted, a booking confirmed. A tap is only an event when the tap itself is the behaviour we want to measure, like the star on the Rate Your Trip card.",
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


/* The current tracking plan: the trip review flow. Types and values are
   exactly what is sent; notes explain why. */
export const TRIP_REVIEW_PLAN = {
  title: "Trip review",
  screen: "Trip Summary",
  intro: [
    "The trip review flow is our current plan, and the example this page follows. After a trip, the Trip Summary screen shows a Rate Your Trip card. Tapping a star is the first event; submitting the optional details is the second; the App Store prompt that may follow is the third. Page Viewed, which already exists, says the card was seen.",
  ],
  formatIntro: [
    "Every event and property is named for a person reading a report, not for the code that sends it. The same name means the same thing in every event.",
  ],
  format: [
    { rule: "Event names", how: "Title Case, the thing and what happened to it: Trip Reviewed, App Store Review Requested. An event fires when the action has completed, not when a button is pressed." },
    { rule: "Property names", how: "Title Case with spaces: Car Condition Rating, Is Update. Reused as is across events." },
    { rule: "Numbers", how: "Ratings are 1 to 5. Never 0: a trip that was not rated fires nothing." },
    { rule: "Booleans", how: "true or false only, for facts the app knows itself, like Is Update." },
    { rule: "Choices", how: "A string with the exact label the person saw on screen: ChargeKey App, Eon Customer Support. Yes and No questions are strings too, so that an unanswered one can be null." },
    { rule: "Skipped questions", how: "null. Never an empty string, never 0. Every optional property is present on the event, null when skipped." },
    { rule: "IDs", how: "Car ID and Owner ID go on every event in the flow, so later events can be joined to the car and the owner. Owner ID is the admin ID." },
    { rule: "Free text", how: "Sent raw, null when empty. It may contain personal information, so it stays out of anything shared outside the team." },
  ],
  tapPayload: `// Trip Reviewed, sent the moment the fourth star is tapped
{
  "Rating": 4,              // number, 1 to 5; never 0
  "Is Update": false,       // boolean; true when a given rating is changed
  "Car ID": "car_8f3a…",    // string, carried to every later event
  "Owner ID": "adm_2c1d…"   // string, the admin ID, carried too
}`,
  events: [
    {
      name: "Trip Reviewed",
      when: "A star is tapped on the Rate Your Trip card. People often stop here without adding details, so this captures the basic sentiment on its own.",
      payload: `{
  "Rating": 4,
  "Is Update": false,
  "Car ID": "car_8f3a…",
  "Owner ID": "adm_2c1d…"
}`,
      properties: [
        { name: "Rating", type: "number", values: "1, 2, 3, 4, 5", notes: "The CSAT signal. No 0; unrated trips never fire this event." },
        { name: "Is Update", type: "boolean", values: "true, false", notes: "true when the guest changes a rating they already gave." },
        { name: "Car ID", type: "string", values: "", notes: "Carried to all later events." },
        { name: "Owner ID", type: "string", values: "", notes: "Carried to all later events. This is the admin ID." },
      ],
    },
    {
      name: "Trip Review Details Added",
      when: "Submit & Claim Eon Credit is tapped and at least one optional question was answered. Every skipped question is sent as null. Properties follow the order of the questions on screen.",
      payload: `{
  "Rating": 4,
  "Car Condition Rating": 5,
  "Cleanliness Rating": 4,
  "Pickup & Return Rating": null,        // skipped
  "App & Experience": 5,
  "Customer Support": null,
  "Access Method": "ChargeKey App",      // the label as shown on screen
  "Contacted Party": "No",
  "Had Issue": "No",                     // gates the three below
  "Issue Contact": null,
  "Support Channel": null,
  "Support Resolved": null,
  "Detail Text": "Seats were spotless",  // free text, may contain PII
  "Car ID": "car_8f3a…",
  "Owner ID": "adm_2c1d…"
}`,
      properties: [
        { name: "Rating", type: "number", values: "1, 2, 3, 4, 5", notes: "The CSAT signal. No 0; unrated trips never fire this event." },
        { name: "Car Condition Rating", type: "number", values: "1 to 5, null", notes: "Rolls up to the owner scorecard." },
        { name: "Cleanliness Rating", type: "number", values: "1 to 5, null", notes: "Rolls up to the owner scorecard." },
        { name: "Pickup & Return Rating", type: "number", values: "1 to 5, null", notes: "Rolls up to the owner scorecard." },
        { name: "App & Experience", type: "number", values: "1 to 5, null", notes: "Rolls up to the owner scorecard." },
        { name: "Customer Support", type: "number", values: "1 to 5, null", notes: "Rolls up to the owner scorecard." },
        { name: "Access Method", type: "string", values: "Physical Keycard, ChargeKey App, Other, null", notes: "How did you access the car?" },
        { name: "Contacted Party", type: "string", values: "Eon Customer Support, Owner, No, null", notes: "Did you have to contact any of these? Replaces the old Contacted Owner property. Owner is the off-platform signal." },
        { name: "Had Issue", type: "string", values: "Yes, No, null", notes: "Did you have an issue during this trip? Gates the three support questions." },
        { name: "Issue Contact", type: "string", values: "Eon, Owner, null", notes: "Who did you contact about it? Only when Had Issue is Yes." },
        { name: "Support Channel", type: "string", values: "Email, Phone, null", notes: "How did you reach them? Only when Had Issue is Yes." },
        { name: "Support Resolved", type: "string", values: "Yes, No, null", notes: "Did they resolve it? Only when Had Issue is Yes." },
        { name: "Detail Text", type: "string", values: "free text, null", notes: "Raw content of the one free-text field; null when empty. Its label reads Describe what happened, so we can improve in the issue branch and Add more detail otherwise. May contain PII." },
        { name: "Car ID", type: "string", values: "", notes: "Carried to all later events." },
        { name: "Owner ID", type: "string", values: "", notes: "Carried to all later events. This is the admin ID." },
      ],
    },
    {
      name: "App Store Review Requested",
      when: "The App Store ask appears after submit. It is never shown below 4 stars, or when Support Resolved is No.",
      payload: `{
  "Outcome": "Clicked",   // null when the prompt was dismissed
  "Rating": 5             // only 4 and 5 reach this prompt
}`,
      properties: [
        { name: "Outcome", type: "string", values: "Clicked, null", notes: "Sizes the D5 audience and its conversion." },
        { name: "Rating", type: "number", values: "4, 5", notes: "Only 4 and 5 star ratings reach this prompt." },
      ],
    },
    {
      name: "Page Viewed",
      supporting: true,
      when: "Already exists (the shared DES-387 event). On this screen it says the card was seen, which is the denominator for everything above.",
      payload: `{
  "Page Name": "Trip Summary"
}`,
      properties: [
        { name: "Page Name", type: "string", values: "Trip Summary", notes: "The card lives on this screen." },
      ],
    },
  ],
};
