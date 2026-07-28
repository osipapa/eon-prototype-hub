-- Add the first image-generation prompt and replace the ticket-specific
-- Mixpanel starter with a reusable setup prompt for every existing team.
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
  '[]'::jsonb,
  prompt.tags,
  prompt.model_hint,
  prompt.tools,
  prompt.version,
  workspaces.creator_id,
  workspaces.creator_id
from workspaces
cross join (values
  (
    'open-road-side-view',
    'Open road — side view',
    'Generate a clean, sunlit side-view road scene with a subtle sense of motion.',
    'Image generation',
    $prompt$Minimalistic side view of a smooth open road stretching horizontally, lined with sparse, evenly spaced trees on one or both sides. Subtle motion blur along the road and trees to convey movement. Bright sunny lighting with soft shadows. Clear blue sky with a few wispy clouds. Clean, simple composition with muted natural tones, emphasizing speed and openness from a lateral perspective$prompt$,
    '[]',
    '',
    '',
    '',
    array['image generation','road','motion'],
    'Image model',
    array['Image generation'],
    1
  ),
  (
    'mixpanel-tracking-setup',
    'Mixpanel tracking setup',
    'Turn a product flow into a clear event contract, implementation plan, and QA checklist.',
    'Analytics & tracking',
    $prompt$Act as a product analytics implementation lead. Create an implementation-ready Mixpanel tracking plan for {{feature_name}}.

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

Use completed product actions as events, not clicks, unless the click itself is the behavior being measured. Reuse existing naming conventions before introducing new ones. Represent money as integer cents and document enums exactly. Treat free text as a privacy boundary and never include credentials or personal data. Call out missing decisions instead of inventing behavior.$prompt$,
    $json$[
      {"key":"feature_name","label":"Feature name","description":"The product behavior covered by the tracking plan.","required":true,"example":"Saved search alerts"},
      {"key":"product_goal","label":"Product goal","description":"The product outcome this measurement should support.","required":true,"example":"Understand whether alerts help customers return to relevant inventory."},
      {"key":"user_flow","label":"User flow","description":"Describe the meaningful steps, outcomes, and alternate paths.","required":true,"example":"A user saves a search, chooses alert frequency, receives an alert, and opens a matching result."},
      {"key":"technical_context","label":"Technical context","description":"Client platforms, analytics wrapper, identity rules, and offline behavior.","required":false,"default":"Web and iOS use Mixpanel through a shared analytics wrapper."},
      {"key":"analytics_conventions","label":"Analytics conventions","description":"Existing event naming, shared properties, and identity standards.","required":false,"default":"Use past-tense event names, Title Case, stable identifiers, and existing shared user and session properties."}
    ]$json$,
    'Use once the product flow is understood and before analytics implementation begins.',
    'Do not include credentials, customer data, or unapproved free text.',
    'A concise Mixpanel event contract, implementation plan, and QA checklist.',
    array['mixpanel','analytics','event tracking'],
    'Coding agent',
    array['Codebase','Mixpanel'],
    2
  )
) as prompt(
  slug, title, summary, category, prompt_body, variables, usage_notes,
  avoid_notes, expected_output, tags, model_hint, tools, version
)
on conflict (team_id, slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  category = excluded.category,
  status = excluded.status,
  prompt_body = excluded.prompt_body,
  variables = excluded.variables,
  usage_notes = excluded.usage_notes,
  avoid_notes = excluded.avoid_notes,
  expected_output = excluded.expected_output,
  examples = excluded.examples,
  tags = excluded.tags,
  model_hint = excluded.model_hint,
  tools = excluded.tools,
  version = excluded.version,
  updated_by = excluded.updated_by;
