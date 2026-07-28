import { MIXPANEL_SETUP_PROMPT_BODY } from "@/features/tracking/trackingExample";

export const PROMPT_CATEGORIES = [
  "Image generation",
  "Research & discovery",
  "UI & interaction",
  "Prototyping",
  "Critique & QA",
  "Content & UX writing",
  "Analytics & tracking",
  "Handoff & documentation",
];

export const STARTER_PROMPTS = [
  {
    id: "starter-open-road-image",
    slug: "open-road-side-view",
    title: "Open road — side view",
    summary: "Generate a clean, sunlit side-view road scene with a subtle sense of motion.",
    category: "Image generation",
    status: "published",
    prompt_body: "Minimalistic side view of a smooth open road stretching horizontally, lined with sparse, evenly spaced trees on one or both sides. Subtle motion blur along the road and trees to convey movement. Bright sunny lighting with soft shadows. Clear blue sky with a few wispy clouds. Clean, simple composition with muted natural tones, emphasizing speed and openness from a lateral perspective",
    variables: [],
    usage_notes: "",
    avoid_notes: "",
    expected_output: "",
    examples: [],
    tags: ["image generation", "road", "motion"],
    model_hint: "Image model",
    tools: ["Image generation"],
    version: 1,
    updated_at: "2026-07-28T18:00:00.000Z",
  },
  {
    id: "starter-flow-critique",
    slug: "product-flow-critique",
    title: "Product flow critique",
    summary: "Turn a screen or multi-step flow into prioritized, evidence-based design feedback.",
    category: "Critique & QA",
    status: "published",
    prompt_body: `Act as a senior product designer reviewing {{flow_or_screen}} for {{product_context}}.

The user's primary goal is:
{{user_goal}}

Review the experience for:
- Information hierarchy and clarity
- Interaction and state coverage
- Accessibility and keyboard use
- Error prevention and recovery
- Responsive behavior
- Consistency with the existing product

Constraints and known context:
{{constraints}}

Separate observed issues from assumptions. Prioritize findings by user impact, explain why each issue matters, and suggest the smallest effective improvement. End with a short list of questions that should be answered before implementation.`,
    variables: [
      { key: "flow_or_screen", label: "Flow or screen", description: "What is being reviewed.", required: true, example: "The mobile checkout flow from cart to confirmation" },
      { key: "product_context", label: "Product context", description: "Who the product serves and what it does.", required: true, example: "A B2B travel platform used by operations teams" },
      { key: "user_goal", label: "User goal", description: "The outcome the user is trying to reach.", required: true, example: "Book a compliant trip without assistance" },
      { key: "constraints", label: "Constraints", description: "Technical, policy, or design-system constraints.", required: false, default: "Use the existing design system. Do not invent new product capabilities." },
    ],
    usage_notes: "Use after a flow is coherent enough to review but before visual polish or implementation hardens decisions.",
    avoid_notes: "Do not use as a substitute for usability research or when the reviewer cannot see the relevant screens and states.",
    expected_output: "A prioritized critique with evidence, impact, recommended changes, and unresolved questions.",
    examples: [
      {
        label: "Example request",
        input: "Review the first-time project creation flow for a collaborative design tool.",
        output: "A severity-ranked list covering the entry point, field clarity, progress feedback, empty states, and completion handoff.",
      },
    ],
    tags: ["audit", "accessibility", "product flow"],
    model_hint: "Reasoning model",
    tools: ["Screenshots or Figma"],
    version: 1,
    updated_at: "2026-07-28T12:00:00.000Z",
  },
  {
    id: "starter-prototype-brief",
    slug: "prototype-from-brief",
    title: "Prototype from a product brief",
    summary: "Create a focused, interactive prototype that demonstrates the core user journey.",
    category: "Prototyping",
    status: "published",
    prompt_body: `Build a responsive interactive prototype for {{feature_name}} inside {{product_context}}.

The prototype must help {{target_user}} accomplish:
{{primary_outcome}}

Required screens and states:
{{required_states}}

Visual source and product constraints:
{{design_constraints}}

Use realistic content and data. Make navigation, primary actions, inputs, validation, loading, empty, error, and success states functional where they are part of the main journey. Preserve the existing product's layout, typography, spacing, components, and interaction patterns.

Do not add unrelated pages or invent backend capabilities. Before handoff, verify the main journey at desktop and mobile widths and list any intentionally mocked behavior.`,
    variables: [
      { key: "feature_name", label: "Feature name", description: "The feature or workflow to prototype.", required: true, example: "Trip policy exceptions" },
      { key: "product_context", label: "Product context", description: "Where the feature lives.", required: true, example: "Eon's operations dashboard" },
      { key: "target_user", label: "Target user", description: "The person completing the workflow.", required: true, example: "Travel operations managers" },
      { key: "primary_outcome", label: "Primary outcome", description: "The single successful end state.", required: true, example: "Review and resolve a policy exception" },
      { key: "required_states", label: "Required states", description: "Screens, variants, and edge cases to include.", required: false, default: "Default, loading, empty, validation error, and success." },
      { key: "design_constraints", label: "Design constraints", description: "Visual sources and implementation boundaries.", required: false, default: "Match the supplied product source and reuse its existing design system." },
    ],
    usage_notes: "Use when a brief and visual source already exist and the team needs a testable version of the primary flow.",
    avoid_notes: "Do not use for open-ended visual exploration without a selected design direction.",
    expected_output: "A working prototype plus a concise note covering supported routes, states, and mocked integrations.",
    examples: [],
    tags: ["prototype", "responsive", "interaction"],
    model_hint: "Coding agent",
    tools: ["Codebase", "Visual source"],
    version: 1,
    updated_at: "2026-07-28T12:00:00.000Z",
  },
  {
    id: "starter-research-synthesis",
    slug: "research-synthesis",
    title: "Research synthesis",
    summary: "Convert mixed research notes into themes, evidence, tensions, and product opportunities.",
    category: "Research & discovery",
    status: "published",
    prompt_body: `Synthesize the following research about {{research_topic}} for {{product_context}}.

Research material:
{{research_material}}

Decision this work should inform:
{{decision}}

Create:
1. A concise executive summary
2. Recurring themes with supporting evidence
3. Important contradictions or segment differences
4. Unmet needs and current workarounds
5. Product opportunities ranked by confidence and potential impact
6. Gaps that require more research

Do not turn isolated comments into broad claims. Distinguish direct evidence, interpretation, and speculation. Preserve meaningful language from participants without exposing personal information.`,
    variables: [
      { key: "research_topic", label: "Research topic", description: "The subject or workflow being studied.", required: true, example: "How operations teams review rate changes" },
      { key: "product_context", label: "Product context", description: "The product and relevant audience.", required: true, example: "A B2B travel operations platform" },
      { key: "research_material", label: "Research material", description: "Interview notes, survey responses, or observations.", required: true, example: "Paste anonymized notes here" },
      { key: "decision", label: "Decision to inform", description: "What the team needs to decide next.", required: true, example: "Which review workflow to prototype first" },
    ],
    usage_notes: "Use after collecting multiple qualitative sources and before committing to a feature direction.",
    avoid_notes: "Do not paste customer names, contact information, credentials, or unredacted sensitive data.",
    expected_output: "A traceable synthesis that separates evidence from interpretation and makes uncertainty visible.",
    examples: [],
    tags: ["research", "synthesis", "opportunity"],
    model_hint: "Reasoning model",
    tools: ["Research notes"],
    version: 1,
    updated_at: "2026-07-28T12:00:00.000Z",
  },
  {
    id: "starter-interaction-spec",
    slug: "interaction-state-spec",
    title: "Interaction and state spec",
    summary: "Document a component or workflow so design and engineering share the same behavior contract.",
    category: "UI & interaction",
    status: "published",
    prompt_body: `Write an implementation-ready interaction specification for {{component_or_flow}}.

Primary user intent:
{{user_intent}}

Known behavior and constraints:
{{known_behavior}}

Document:
- Entry points and prerequisites
- Default, hover, focus, active, selected, disabled, loading, empty, error, and success states
- Mouse, touch, and keyboard interactions
- Validation timing and recovery behavior
- Responsive changes
- Content rules and truncation
- Accessibility semantics and announcements
- Persistence, optimistic updates, and failure handling

Use a state table where it improves clarity. Call out missing decisions instead of inventing them. End with acceptance criteria that can be tested without interpreting the design.`,
    variables: [
      { key: "component_or_flow", label: "Component or flow", description: "The interaction being specified.", required: true, example: "The prototype upload panel" },
      { key: "user_intent", label: "User intent", description: "Why the user interacts with it.", required: true, example: "Replace a shared prototype without losing review context" },
      { key: "known_behavior", label: "Known behavior", description: "Existing decisions, constraints, and edge cases.", required: false, default: "Preserve established product patterns and identify unresolved behavior explicitly." },
    ],
    usage_notes: "Use after the interaction direction is chosen and before handoff or implementation.",
    avoid_notes: "Do not use to choose between fundamentally different product directions.",
    expected_output: "A state-by-state behavior contract and testable acceptance criteria.",
    examples: [],
    tags: ["states", "interaction", "specification"],
    model_hint: "Reasoning model",
    tools: ["Figma or prototype"],
    version: 1,
    updated_at: "2026-07-28T12:00:00.000Z",
  },
  {
    id: "starter-ux-copy",
    slug: "ux-copy-variants",
    title: "UX copy variants",
    summary: "Generate concise interface copy options grounded in a specific moment and user need.",
    category: "Content & UX writing",
    status: "published",
    prompt_body: `Write UX copy for {{interface_moment}} in {{product_context}}.

The user is trying to:
{{user_goal}}

What happened or what the interface needs to communicate:
{{message_context}}

Voice and constraints:
{{voice_constraints}}

Provide three distinct options. For each option include the headline, supporting text, primary action, and secondary action when needed. Keep the language direct, specific, and useful. Avoid blame, vague reassurance, technical jargon, and cleverness that obscures the next step.

After the options, recommend one and explain the trade-off in two sentences.`,
    variables: [
      { key: "interface_moment", label: "Interface moment", description: "Where the copy appears.", required: true, example: "An empty state after filtering prototypes" },
      { key: "product_context", label: "Product context", description: "The product and audience.", required: true, example: "A collaborative design hub" },
      { key: "user_goal", label: "User goal", description: "What the user wants to do next.", required: true, example: "Find a prototype to review" },
      { key: "message_context", label: "Message context", description: "What happened and what actions are possible.", required: true, example: "No prototypes match the current search, but the query can be cleared" },
      { key: "voice_constraints", label: "Voice constraints", description: "Tone, length, and terminology requirements.", required: false, default: "Calm, concise, human, and appropriate for a professional product." },
    ],
    usage_notes: "Use for high-value interface moments where the next action and emotional tone both matter.",
    avoid_notes: "Do not use without the actual interface context or available actions.",
    expected_output: "Three complete copy systems plus a reasoned recommendation.",
    examples: [],
    tags: ["content design", "empty state", "error copy"],
    model_hint: "General model",
    tools: ["Screen context"],
    version: 1,
    updated_at: "2026-07-28T12:00:00.000Z",
  },
  {
    id: "starter-handoff",
    slug: "design-handoff-brief",
    title: "Design handoff brief",
    summary: "Package design intent, interaction rules, dependencies, and acceptance criteria for implementation.",
    category: "Handoff & documentation",
    status: "published",
    prompt_body: `Create a concise design handoff brief for {{feature_name}}.

Product and user context:
{{product_context}}

Design source:
{{design_source}}

Implementation constraints and dependencies:
{{dependencies}}

Include:
- Problem and intended user outcome
- Scope and explicit non-goals
- Main flow and supported states
- Responsive behavior
- Reused and new components
- Content and data requirements
- Accessibility requirements
- Analytics or operational events, if known
- Dependencies and unresolved decisions
- Acceptance criteria

Keep the document answer-first and implementation-ready. Reference the supplied source rather than restating every visual detail. Do not claim a decision is final when the source is ambiguous.`,
    variables: [
      { key: "feature_name", label: "Feature name", description: "The work being handed off.", required: true, example: "Prompt Library browsing" },
      { key: "product_context", label: "Product context", description: "Problem, audience, and intended outcome.", required: true, example: "Designers need a shared place to find and copy approved prompts" },
      { key: "design_source", label: "Design source", description: "Links to Figma, prototypes, or specifications.", required: true, example: "Figma frame and approved prototype URL" },
      { key: "dependencies", label: "Dependencies", description: "Technical, data, policy, or sequencing constraints.", required: false, default: "Reuse existing authentication, permissions, design tokens, and responsive shell." },
    ],
    usage_notes: "Use once the main design direction and interaction behavior are settled.",
    avoid_notes: "Do not use as a replacement for the source design or for unresolved early-stage exploration.",
    expected_output: "A compact handoff document with scope, behavior, dependencies, and testable acceptance criteria.",
    examples: [],
    tags: ["handoff", "documentation", "acceptance criteria"],
    model_hint: "General model",
    tools: ["Figma", "Prototype", "Linear"],
    version: 1,
    updated_at: "2026-07-28T12:00:00.000Z",
  },
  {
    id: "starter-mixpanel-setup",
    slug: "mixpanel-tracking-setup",
    title: "Mixpanel tracking setup",
    summary: "Turn a product flow into a clear event contract, implementation plan, and QA checklist.",
    category: "Analytics & tracking",
    status: "published",
    prompt_body: MIXPANEL_SETUP_PROMPT_BODY,
    variables: [
      {
        key: "feature_name",
        label: "Feature name",
        description: "The product behavior covered by the tracking plan.",
        required: true,
        example: "Saved search alerts",
      },
      {
        key: "product_goal",
        label: "Product goal",
        description: "The product outcome this measurement should support.",
        required: true,
        example: "Understand whether alerts help customers return to relevant inventory.",
      },
      {
        key: "user_flow",
        label: "User flow",
        description: "Describe the meaningful steps, outcomes, and alternate paths.",
        required: true,
        example: "A user saves a search, chooses alert frequency, receives an alert, and opens a matching result.",
      },
      {
        key: "technical_context",
        label: "Technical context",
        description: "Client platforms, analytics wrapper, identity rules, and offline behavior.",
        required: false,
        default: "Web and iOS use Mixpanel through a shared analytics wrapper.",
      },
      {
        key: "analytics_conventions",
        label: "Analytics conventions",
        description: "Existing event naming, shared properties, and identity standards.",
        required: false,
        default: "Use past-tense event names, Title Case, stable identifiers, and existing shared user and session properties.",
      },
    ],
    usage_notes: "Use once the product flow is understood and before analytics implementation begins.",
    avoid_notes: "Do not include credentials, customer data, or unapproved free text.",
    expected_output: "A concise Mixpanel event contract, implementation plan, and QA checklist.",
    examples: [],
    tags: ["mixpanel", "analytics", "event tracking"],
    model_hint: "Coding agent",
    tools: ["Codebase", "Mixpanel"],
    version: 2,
    updated_at: "2026-07-28T18:00:00.000Z",
  },
];

export function promptVariableDefaults(prompt) {
  return Object.fromEntries(
    (prompt?.variables || []).map((variable) => [variable.key, variable.default || ""]),
  );
}

export function compilePrompt(prompt, values) {
  return String(prompt?.prompt_body || "").replace(
    /\{\{\s*([a-zA-Z0-9_-]+)\s*\}\}/g,
    (token, key) => {
      const variable = (prompt?.variables || []).find((item) => item.key === key);
      const value = values?.[key] ?? variable?.default;
      return String(value || "").trim() || token;
    },
  );
}

export function missingRequiredVariables(prompt, values) {
  return (prompt?.variables || []).filter((variable) =>
    variable.required && !String(values?.[variable.key] ?? variable.default ?? "").trim());
}
