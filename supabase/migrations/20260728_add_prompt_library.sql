-- Shared, team-scoped prompt reference library.
create table if not exists public.prompts (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  slug text not null,
  title text not null,
  summary text not null default '',
  category text not null default 'General',
  status text not null default 'draft'
    check (status in ('draft', 'published', 'deprecated')),
  prompt_body text not null,
  variables jsonb not null default '[]'::jsonb
    check (jsonb_typeof(variables) = 'array'),
  usage_notes text not null default '',
  avoid_notes text not null default '',
  expected_output text not null default '',
  examples jsonb not null default '[]'::jsonb
    check (jsonb_typeof(examples) = 'array'),
  tags text[] not null default '{}',
  model_hint text,
  tools text[] not null default '{}',
  version int not null default 1 check (version > 0),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_id, slug)
);

create index if not exists prompts_team_category_title_idx
  on public.prompts (team_id, category, title);

drop trigger if exists prompts_touch on public.prompts;
create trigger prompts_touch before update on public.prompts
  for each row execute function public.touch_updated_at();

alter table public.prompts enable row level security;

create policy "team read prompts" on public.prompts for select
  using (team_id = public.current_team_id());
create policy "team insert prompts" on public.prompts for insert
  with check (
    team_id = public.current_team_id()
    and (created_by is null or created_by = auth.uid())
  );
create policy "team update prompts" on public.prompts for update
  using (team_id = public.current_team_id())
  with check (team_id = public.current_team_id());
create policy "creator or admin delete prompts" on public.prompts for delete
  using (
    team_id = public.current_team_id()
    and (public.is_admin() or created_by = auth.uid())
  );

do $$
begin
  alter publication supabase_realtime add table public.prompts;
exception when duplicate_object then
  null;
end;
$$;

-- Give every existing team the same useful starting library. The bundled
-- frontend mirrors these rows so the feature remains usable before this
-- migration is coordinated against the shared project.
with workspaces as (
  select
    teams.id as team_id,
    (
      select profiles.id
      from public.profiles
      where profiles.team_id = teams.id
      order by (profiles.role = 'admin') desc, profiles.created_at asc
      limit 1
    ) as creator_id
  from public.teams
)
insert into public.prompts (
  team_id, slug, title, summary, category, status, prompt_body, variables,
  usage_notes, avoid_notes, expected_output, examples, tags, model_hint,
  tools, version, created_by, updated_by
)
select
  workspaces.team_id,
  prompt.slug,
  prompt.title,
  prompt.summary,
  prompt.category,
  'published',
  prompt.prompt_body,
  prompt.variables::jsonb,
  prompt.usage_notes,
  prompt.avoid_notes,
  prompt.expected_output,
  prompt.examples::jsonb,
  prompt.tags,
  prompt.model_hint,
  prompt.tools,
  1,
  workspaces.creator_id,
  workspaces.creator_id
from workspaces
cross join (values
  (
    'product-flow-critique',
    'Product flow critique',
    'Turn a screen or multi-step flow into prioritized, evidence-based design feedback.',
    'Critique & QA',
    $prompt$Act as a senior product designer reviewing {{flow_or_screen}} for {{product_context}}.

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

Separate observed issues from assumptions. Prioritize findings by user impact, explain why each issue matters, and suggest the smallest effective improvement. End with a short list of questions that should be answered before implementation.$prompt$,
    '[{"key":"flow_or_screen","label":"Flow or screen","description":"What is being reviewed.","required":true,"example":"The mobile checkout flow from cart to confirmation"},{"key":"product_context","label":"Product context","description":"Who the product serves and what it does.","required":true,"example":"A B2B travel platform used by operations teams"},{"key":"user_goal","label":"User goal","description":"The outcome the user is trying to reach.","required":true,"example":"Book a compliant trip without assistance"},{"key":"constraints","label":"Constraints","description":"Technical, policy, or design-system constraints.","required":false,"default":"Use the existing design system. Do not invent new product capabilities."}]',
    'Use after a flow is coherent enough to review but before visual polish or implementation hardens decisions.',
    'Do not use as a substitute for usability research or when the reviewer cannot see the relevant screens and states.',
    'A prioritized critique with evidence, impact, recommended changes, and unresolved questions.',
    '[{"label":"Example request","input":"Review the first-time project creation flow for a collaborative design tool.","output":"A severity-ranked list covering the entry point, field clarity, progress feedback, empty states, and completion handoff."}]',
    array['audit','accessibility','product flow'],
    'Reasoning model',
    array['Screenshots or Figma']
  ),
  (
    'prototype-from-brief',
    'Prototype from a product brief',
    'Create a focused, interactive prototype that demonstrates the core user journey.',
    'Prototyping',
    $prompt$Build a responsive interactive prototype for {{feature_name}} inside {{product_context}}.

The prototype must help {{target_user}} accomplish:
{{primary_outcome}}

Required screens and states:
{{required_states}}

Visual source and product constraints:
{{design_constraints}}

Use realistic content and data. Make navigation, primary actions, inputs, validation, loading, empty, error, and success states functional where they are part of the main journey. Preserve the existing product's layout, typography, spacing, components, and interaction patterns.

Do not add unrelated pages or invent backend capabilities. Before handoff, verify the main journey at desktop and mobile widths and list any intentionally mocked behavior.$prompt$,
    '[{"key":"feature_name","label":"Feature name","description":"The feature or workflow to prototype.","required":true,"example":"Trip policy exceptions"},{"key":"product_context","label":"Product context","description":"Where the feature lives.","required":true,"example":"Eon operations dashboard"},{"key":"target_user","label":"Target user","description":"The person completing the workflow.","required":true,"example":"Travel operations managers"},{"key":"primary_outcome","label":"Primary outcome","description":"The single successful end state.","required":true,"example":"Review and resolve a policy exception"},{"key":"required_states","label":"Required states","description":"Screens, variants, and edge cases to include.","required":false,"default":"Default, loading, empty, validation error, and success."},{"key":"design_constraints","label":"Design constraints","description":"Visual sources and implementation boundaries.","required":false,"default":"Match the supplied product source and reuse its existing design system."}]',
    'Use when a brief and visual source already exist and the team needs a testable version of the primary flow.',
    'Do not use for open-ended visual exploration without a selected design direction.',
    'A working prototype plus a concise note covering supported routes, states, and mocked integrations.',
    '[]',
    array['prototype','responsive','interaction'],
    'Coding agent',
    array['Codebase','Visual source']
  ),
  (
    'research-synthesis',
    'Research synthesis',
    'Convert mixed research notes into themes, evidence, tensions, and product opportunities.',
    'Research & discovery',
    $prompt$Synthesize the following research about {{research_topic}} for {{product_context}}.

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

Do not turn isolated comments into broad claims. Distinguish direct evidence, interpretation, and speculation. Preserve meaningful language from participants without exposing personal information.$prompt$,
    '[{"key":"research_topic","label":"Research topic","description":"The subject or workflow being studied.","required":true,"example":"How operations teams review rate changes"},{"key":"product_context","label":"Product context","description":"The product and relevant audience.","required":true,"example":"A B2B travel operations platform"},{"key":"research_material","label":"Research material","description":"Interview notes, survey responses, or observations.","required":true,"example":"Paste anonymized notes here"},{"key":"decision","label":"Decision to inform","description":"What the team needs to decide next.","required":true,"example":"Which review workflow to prototype first"}]',
    'Use after collecting multiple qualitative sources and before committing to a feature direction.',
    'Do not paste customer names, contact information, credentials, or unredacted sensitive data.',
    'A traceable synthesis that separates evidence from interpretation and makes uncertainty visible.',
    '[]',
    array['research','synthesis','opportunity'],
    'Reasoning model',
    array['Research notes']
  ),
  (
    'interaction-state-spec',
    'Interaction and state spec',
    'Document a component or workflow so design and engineering share the same behavior contract.',
    'UI & interaction',
    $prompt$Write an implementation-ready interaction specification for {{component_or_flow}}.

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

Use a state table where it improves clarity. Call out missing decisions instead of inventing them. End with acceptance criteria that can be tested without interpreting the design.$prompt$,
    '[{"key":"component_or_flow","label":"Component or flow","description":"The interaction being specified.","required":true,"example":"The prototype upload panel"},{"key":"user_intent","label":"User intent","description":"Why the user interacts with it.","required":true,"example":"Replace a shared prototype without losing review context"},{"key":"known_behavior","label":"Known behavior","description":"Existing decisions, constraints, and edge cases.","required":false,"default":"Preserve established product patterns and identify unresolved behavior explicitly."}]',
    'Use after the interaction direction is chosen and before handoff or implementation.',
    'Do not use to choose between fundamentally different product directions.',
    'A state-by-state behavior contract and testable acceptance criteria.',
    '[]',
    array['states','interaction','specification'],
    'Reasoning model',
    array['Figma or prototype']
  ),
  (
    'ux-copy-variants',
    'UX copy variants',
    'Generate concise interface copy options grounded in a specific moment and user need.',
    'Content & UX writing',
    $prompt$Write UX copy for {{interface_moment}} in {{product_context}}.

The user is trying to:
{{user_goal}}

What happened or what the interface needs to communicate:
{{message_context}}

Voice and constraints:
{{voice_constraints}}

Provide three distinct options. For each option include the headline, supporting text, primary action, and secondary action when needed. Keep the language direct, specific, and useful. Avoid blame, vague reassurance, technical jargon, and cleverness that obscures the next step.

After the options, recommend one and explain the trade-off in two sentences.$prompt$,
    '[{"key":"interface_moment","label":"Interface moment","description":"Where the copy appears.","required":true,"example":"An empty state after filtering prototypes"},{"key":"product_context","label":"Product context","description":"The product and audience.","required":true,"example":"A collaborative design hub"},{"key":"user_goal","label":"User goal","description":"What the user wants to do next.","required":true,"example":"Find a prototype to review"},{"key":"message_context","label":"Message context","description":"What happened and what actions are possible.","required":true,"example":"No prototypes match the current search, but the query can be cleared"},{"key":"voice_constraints","label":"Voice constraints","description":"Tone, length, and terminology requirements.","required":false,"default":"Calm, concise, human, and appropriate for a professional product."}]',
    'Use for high-value interface moments where the next action and emotional tone both matter.',
    'Do not use without the actual interface context or available actions.',
    'Three complete copy systems plus a reasoned recommendation.',
    '[]',
    array['content design','empty state','error copy'],
    'General model',
    array['Screen context']
  ),
  (
    'design-handoff-brief',
    'Design handoff brief',
    'Package design intent, interaction rules, dependencies, and acceptance criteria for implementation.',
    'Handoff & documentation',
    $prompt$Create a concise design handoff brief for {{feature_name}}.

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

Keep the document answer-first and implementation-ready. Reference the supplied source rather than restating every visual detail. Do not claim a decision is final when the source is ambiguous.$prompt$,
    '[{"key":"feature_name","label":"Feature name","description":"The work being handed off.","required":true,"example":"Prompt Library browsing"},{"key":"product_context","label":"Product context","description":"Problem, audience, and intended outcome.","required":true,"example":"Designers need a shared place to find and copy approved prompts"},{"key":"design_source","label":"Design source","description":"Links to Figma, prototypes, or specifications.","required":true,"example":"Figma frame and approved prototype URL"},{"key":"dependencies","label":"Dependencies","description":"Technical, data, policy, or sequencing constraints.","required":false,"default":"Reuse existing authentication, permissions, design tokens, and responsive shell."}]',
    'Use once the main design direction and interaction behavior are settled.',
    'Do not use as a replacement for the source design or for unresolved early-stage exploration.',
    'A compact handoff document with scope, behavior, dependencies, and testable acceptance criteria.',
    '[]',
    array['handoff','documentation','acceptance criteria'],
    'General model',
    array['Figma','Prototype','Linear']
  ),
  (
    'mixpanel-tracking-setup',
    'Mixpanel tracking setup',
    'Turn product requirements and Linear issues into typed event contracts, implementation helpers, and a QA matrix.',
    'Analytics & tracking',
    $prompt$Act as a product analytics implementation lead. Create an implementation-ready Mixpanel tracking setup for {{feature_name}}.

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

Treat free-text properties as a privacy boundary. If a field may contain personal information, flag it and require an explicit redaction, allowlist, retention, and approval decision before tracking it. Never include credentials or personal data in examples. Represent money as integer cents and document every enum exactly. Do not invent missing product behavior.$prompt$,
    $json$[
      {"key":"feature_name","label":"Feature name","description":"The product behavior covered by the tracking plan.","required":true,"default":"Cancellation and trip reviews","example":"Cancellation and trip reviews"},
      {"key":"linear_issues","label":"Linear issues","description":"Issue identifiers and their current delivery states.","required":true,"default":"ENG-723 — In Prod; ENG-841 — Backlog","example":"ENG-723 — In Prod; ENG-841 — Backlog"},
      {"key":"tracking_requirements","label":"Tracking requirements","description":"Paste the approved event names, triggers, properties, and product rules.","required":true,"default":"ENG-723 is the shipped reference for cancellation. Track Cancellation Started, Cancellation Reason Selected, Refund Method Selected, and supporting Page Viewed events. Preserve its Outcome and Cancellation Scenario enums, distinguish skipped inputs with null and Was Skipped, and represent Refund Amount in integer cents.\n\nENG-841 is a draft review plan. Track Trip Reviewed on star tap, Trip Review Details Added when at least one optional answer is submitted, App Store Review Requested only for eligible four- or five-star reviews, and Page Viewed for Trip Summary. Include Rating, Is Update, Car ID, Owner ID, optional review detail properties, and the app-store outcome. Flag Detail Text as a personal-information risk. Keep the $25/$30 credit conflict, database setup, offline-car behavior, and subrating property names open.","example":"Paste the relevant tracking section from each Linear issue."},
      {"key":"technical_context","label":"Technical context","description":"Client platforms, analytics wrapper, identity rules, and offline behavior.","required":false,"default":"Web and iOS clients use Mixpanel. Confirm each codebase’s analytics wrapper, identity lifecycle, persistence, retry, and deduplication behavior before writing platform-specific code."}
    ]$json$,
    'Use when product behavior and draft event requirements exist, but engineering still needs a precise analytics contract and validation plan.',
    'Do not paste credentials, customer data, or unredacted free text. Do not treat backlog requirements as shipped behavior or resolve product conflicts silently.',
    'A source-aware Mixpanel event catalog, typed implementation scaffolding, privacy decisions, open questions, and a testable QA matrix.',
    '[{"label":"Eon example","input":"Use ENG-723 as the shipped cancellation reference and ENG-841 as the draft trip-review plan.","output":"Eight event contracts grouped by flow, with typed properties, null rules, currency units, PII safeguards, unresolved decisions, and validation cases."}]',
    array['mixpanel','analytics','event tracking','linear'],
    'Coding agent',
    array['Codebase','Linear','Mixpanel']
  )
) as prompt(
  slug, title, summary, category, prompt_body, variables, usage_notes,
  avoid_notes, expected_output, examples, tags, model_hint, tools
)
on conflict (team_id, slug) do nothing;
