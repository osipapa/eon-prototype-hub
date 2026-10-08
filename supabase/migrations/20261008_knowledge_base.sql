-- ============================================================================
-- Eon Prototype Hub — knowledge base (Eon Design pages, OKF-shaped)
--   1. kb_entries: one markdown page per row, typed like an Open Knowledge
--      Format file (concept/howto/reference/decision/metric). `version` is
--      bumped by trigger so writers can compare-and-swap.
--   2. kb_revisions: trigger-written snapshots of the previous text, 30 kept.
--   3. Full-text search column for the hub MCP's kb_search.
--   4. Seeded from src/features/design/kbSeed.js (scripts/kb-seed-sql.mjs).
-- ============================================================================

create table if not exists public.kb_entries (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9][a-z0-9-]*$'),
  type text not null default 'concept'
    check (type in ('concept', 'howto', 'reference', 'decision', 'metric')),
  title text not null check (length(trim(title)) > 0),
  summary text not null default '',
  group_path text not null default '',
  status text not null default 'published' check (status in ('draft', 'published')),
  body_md text not null default '',
  refs text[] not null default '{}',
  sort_order int not null default 0,
  version int not null default 1,
  search tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(summary, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(body_md, '')), 'C')
  ) stored,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_id, slug)
);

create index if not exists kb_entries_team_order_idx on public.kb_entries (team_id, sort_order, title);
create index if not exists kb_entries_search_idx on public.kb_entries using gin (search);

drop trigger if exists kb_entries_touch on public.kb_entries;
create trigger kb_entries_touch before update on public.kb_entries
  for each row execute function public.touch_updated_at();

-- Version and author come from the server, not the client.
create or replace function public.kb_entries_stamp()
returns trigger language plpgsql set search_path = public as $$
begin
  if TG_OP = 'INSERT' then
    NEW.version := 1;
    NEW.updated_by := coalesce(auth.uid(), NEW.updated_by);
  elsif (NEW.body_md, NEW.title, NEW.summary, NEW.type, NEW.group_path, NEW.status, NEW.refs, NEW.slug)
        is distinct from (OLD.body_md, OLD.title, OLD.summary, OLD.type, OLD.group_path, OLD.status, OLD.refs, OLD.slug) then
    NEW.version := OLD.version + 1;
    NEW.updated_by := coalesce(auth.uid(), NEW.updated_by);
  else
    NEW.version := OLD.version;
  end if;
  return NEW;
end;
$$;
revoke execute on function public.kb_entries_stamp() from public, anon, authenticated;

drop trigger if exists kb_entries_stamp on public.kb_entries;
create trigger kb_entries_stamp before insert or update on public.kb_entries
  for each row execute function public.kb_entries_stamp();

alter table public.kb_entries enable row level security;

drop policy if exists "team read kb" on public.kb_entries;
create policy "team read kb" on public.kb_entries for select
  using (team_id = public.current_team_id());
drop policy if exists "team insert kb" on public.kb_entries;
create policy "team insert kb" on public.kb_entries for insert
  with check (team_id = public.current_team_id() and (created_by is null or created_by = auth.uid()));
drop policy if exists "team update kb" on public.kb_entries;
create policy "team update kb" on public.kb_entries for update
  using (team_id = public.current_team_id())
  with check (team_id = public.current_team_id());
drop policy if exists "admin delete kb" on public.kb_entries;
create policy "admin delete kb" on public.kb_entries for delete
  using (team_id = public.current_team_id() and public.is_admin());

create table if not exists public.kb_revisions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  entry_id uuid not null references public.kb_entries(id) on delete cascade,
  version int not null,
  title text not null,
  body_md text not null,
  author_id uuid references public.profiles(id) on delete set null,
  source text not null check (source in ('hub', 'claude')),
  created_at timestamptz not null default now()
);
create index if not exists kb_revisions_entry_version_idx on public.kb_revisions (entry_id, version desc);

alter table public.kb_revisions enable row level security;
drop policy if exists "team read kb revisions" on public.kb_revisions;
create policy "team read kb revisions" on public.kb_revisions for select
  using (team_id = public.current_team_id());
-- No write policies: only the trigger below writes.

-- Keeps the text each save replaced, so an edit can be undone by hand.
create or replace function public.record_kb_revision()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (NEW.body_md, NEW.title) is not distinct from (OLD.body_md, OLD.title) then return NEW; end if;
  insert into public.kb_revisions (team_id, entry_id, version, title, body_md, author_id, source)
  values (
    OLD.team_id, OLD.id, OLD.version, OLD.title, OLD.body_md, OLD.updated_by,
    case when coalesce(auth.jwt() ->> 'client_id', '') <> '' then 'claude' else 'hub' end
  );
  delete from public.kb_revisions
    where entry_id = OLD.id
      and id not in (select id from public.kb_revisions where entry_id = OLD.id order by version desc limit 30);
  return NEW;
end;
$$;
revoke execute on function public.record_kb_revision() from public, anon, authenticated;

drop trigger if exists kb_entries_revision on public.kb_entries;
create trigger kb_entries_revision after update on public.kb_entries
  for each row execute function public.record_kb_revision();

do $$
begin
  alter publication supabase_realtime add table public.kb_entries;
exception when duplicate_object then
  null;
end;
$$;

insert into public.kb_entries (team_id, slug, type, title, summary, group_path, status, body_md, refs, sort_order)
select teams.id, seed.slug, seed.type, seed.title, seed.summary, seed.group_path, seed.status, seed.body_md, seed.refs, seed.sort_order
from public.teams
cross join (values
  ($kb$overview$kb$, $kb$concept$kb$, $kb$Designing Eon, together$kb$, $kb$The shared home for how we shape product ideas, collaborate across disciplines, and hand work off with confidence.$kb$, $kb$Get started$kb$, $kb$draft$kb$, $kb$## One place for the work around the work

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
$kb$, array[]::text[], 10),
  ($kb$principles$kb$, $kb$concept$kb$, $kb$Eon design principles$kb$, $kb$A starting point for decisions when requirements, patterns, or opinions compete.$kb$, $kb$Get started$kb$, $kb$draft$kb$, $kb$## What our experiences should feel like

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
$kb$, array[]::text[], 11),
  ($kb$spacing$kb$, $kb$reference$kb$, $kb$Spacing$kb$, $kb$A small set of space values, built on an 8px base unit, so layouts line up across the app, the web app, and every prototype.$kb$, $kb$Foundations$kb$, $kb$published$kb$, $kb$Consistent spacing makes screens feel calm and related. Every gap, padding, and margin comes from the same ten steps, so a card on iOS and a card on the web app read as the same thing.

## 8 pixel base unit

Our spacing is built on a base unit of 8 pixels. Every step on the scale is a multiple of it, with one half step (4px) for tight pairs like an icon and its label.

## Scale

The scale runs from 0px to 80px. Pick the nearest step instead of inventing a value in between; if nothing fits, the layout usually needs a different structure, not a new number.

## Space tokens

Use the token instead of a raw pixel value whenever you add space between or inside elements. The names carry the pixel value, so `--spacing-16` is 16px.

```tokens:space
```

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
$kb$, array[$kb$radius$kb$, $kb$elevation$kb$]::text[], 20),
  ($kb$color$kb$, $kb$reference$kb$, $kb$Color$kb$, $kb$Three brand colors, one neutral scale, and four states, each with separate light and dark values.$kb$, $kb$Foundations$kb$, $kb$published$kb$, $kb$Colors come from Eon's Figma variables. Style through the semantic tokens (`--text-primary`, `--background-2`) so both modes work; reach for a primitive only when no semantic token fits.

## Brand

Three brand colors, each with one job. The legacy value `#d400ff` in older files is not any of them: replace it.

```tokens:brand
```

## Neutrals

The grey scale behind every background, border, and text color.

```tokens:grey
```

## Text

```tokens:text
```

## State

Error, success, pending, and warning each have a light-mode and a dark-mode value. Tinted fills use the state color at 15% alpha; brand tints use 10%.

```tokens:state
```

## Light and dark

Ship both modes, dark by default. The modes are not mirror images: the primary button is a baby-elephant fill with black text in dark mode and changes character in light mode. Always take each mode's value from its own token file instead of deriving one from the other.

## Related

- [Elevation](kb:elevation#surfaces) lists the background tokens for each surface level.
$kb$, array[$kb$elevation#surfaces$kb$]::text[], 21),
  ($kb$typography$kb$, $kb$reference$kb$, $kb$Typography$kb$, $kb$DM Sans in six sizes and two weights. Nothing in between.$kb$, $kb$Foundations$kb$, $kb$published$kb$, $kb$## Typeface

DM Sans is the only font, in weights 400 and 500. Poppins, Inter, or Geist in an older file is drift: correct it when you touch the file.

## Type scale

```tokens:type
```

## Weights

```tokens:weight
```

## Usage

### Titles

Large title for a screen's one main heading. Title 1 and Title 2 for sections and modal titles (modals use 20px, weight 500).

### Body and captions

Body (16px) for reading text and input values. Caption 1 (12px) for status chips and metadata; Caption 2 (11px) only where space is very tight.

## Related

- [Color](kb:color#text) for text color tokens.
$kb$, array[$kb$color#text$kb$]::text[], 22),
  ($kb$radius$kb$, $kb$reference$kb$, $kb$Radius$kb$, $kb$Four corner sizes from the production web app, each tied to a kind of element.$kb$, $kb$Foundations$kb$, $kb$published$kb$, $kb$Figma defines no radius variables yet, so this scale comes from what ships in the production web app.

## Radius scale

```tokens:radius
```

## Choosing a radius

### Rectangles and pills

Block CTAs are 8px rectangles; navigation actions and segmented controls are 100px pills. The shape tells people which kind of action it is, so do not mix them.

### Cards

Content cards use 24px; selectable option cards, modals, and banners use 16px. A card's header band uses 24px 24px 0 0. The 20px card radius in older prototypes predates this scale: use 24px.

### Prototypes

Phone frames in prototypes use 44px corners.

## Related

- [Spacing](kb:spacing#space-tokens) for the padding that goes with each radius.
$kb$, array[$kb$spacing#space-tokens$kb$]::text[], 23),
  ($kb$elevation$kb$, $kb$reference$kb$, $kb$Elevation$kb$, $kb$Three surface levels and one shadow. Depth comes from the background step, not from heavy shadows.$kb$, $kb$Foundations$kb$, $kb$published$kb$, $kb$## Surfaces

Every regular screen background is `--background-1`. Cards and surfaces sit on it with `--background-2`; raised elements on a card use `--background-3`.

```tokens:surface
```

## Borders

Cards in dark mode carry a 1px `#1E1E22` border so they hold their edge on black. Selected option cards switch that border to pinkling (`#E15CF7`).

## Shadow

There is one shadow color, `--shadow`. Use it for floating layers such as menus and sheets, not for cards sitting on the page.

## Related

- [Color](kb:color) for the full palette.
- [Radius](kb:radius#cards) for card corners.
$kb$, array[$kb$color$kb$, $kb$radius#cards$kb$]::text[], 24),
  ($kb$product-process$kb$, $kb$howto$kb$, $kb$Product design process$kb$, $kb$Five steps for turning an unclear opportunity into a shipped change the team can measure.$kb$, $kb$How we work$kb$, $kb$draft$kb$, $kb$## Shape the problem before the solution

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
$kb$, array[]::text[], 30),
  ($kb$design-review$kb$, $kb$howto$kb$, $kb$Design review$kb$, $kb$Use reviews to improve the decision, not to perform a final approval ritual.$kb$, $kb$How we work$kb$, $kb$draft$kb$, $kb$## Match the review to the maturity of the work

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
$kb$, array[]::text[], 31),
  ($kb$ai-principles$kb$, $kb$decision$kb$, $kb$AI usage principles$kb$, $kb$How the team uses AI tools in design work, and what we check before anything AI-assisted ships.$kb$, $kb$How we work$kb$, $kb$draft$kb$, $kb$## What this page will cover

Where AI tools help and where they get in the way, what we review before AI-assisted work goes out, what never goes into a prompt, and how we say when AI was used. The principles are being written with the team; nothing here is final yet.
$kb$, array[]::text[], 32),
  ($kb$linear-handoff$kb$, $kb$howto$kb$, $kb$Handoff flow$kb$, $kb$The board flow and review gates that carry design work from an idea through Engineering QA.$kb$, $kb$Linear$kb$, $kb$published$kb$, $kb$## From idea to Engineering QA

The columns below mirror the live Design and Engineering workflows. The card remains the source of truth throughout the process; ownership changes at explicit gates, but the designer stays connected through Engineering QA.

```eon:linear-flow
```

## Related

- [Card quality & QA](kb:linear-cards#keep-qa-findings-in-one-comment-thread) for how Engineering QA findings are recorded.
$kb$, array[$kb$linear-cards#keep-qa-findings-in-one-comment-thread$kb$]::text[], 40),
  ($kb$linear-estimation$kb$, $kb$reference$kb$, $kb$Estimation$kb$, $kb$What a point means on our boards, so an estimate reads the same to everyone who opens the card.$kb$, $kb$Linear$kb$, $kb$published$kb$, $kb$## What a point is worth

Linear's doubling scale: each size is twice the one before. Points describe effort, not a delivery date.

```eon:estimate-scale
```

## How to land on a number

Estimate the whole card, including the states, the edge cases, and the review rounds the work will actually need.

- Size the work as written on the card. If the scope is not clear enough to size, the card is not ready to estimate.
- For anything under a day, pick by how much is unknown, not by counting hours.

```eon:estimate-examples
```
$kb$, array[]::text[], 41),
  ($kb$linear-cards$kb$, $kb$howto$kb$, $kb$Card quality & QA$kb$, $kb$What a card has to contain to be useful to the next person, and how QA findings stay readable.$kb$, $kb$Linear$kb$, $kb$published$kb$, $kb$## The assignee owns the quality of the card

Whoever is working on the card must use the Feature template and complete every required field. The card should let the next person understand the outcome, behavior, decisions, and validation criteria without reconstructing the project history.

- Start from the Feature template. Do not create an unstructured delivery card.
- Fill every required field, including outcome, scope, design links, states, analytics, and acceptance criteria.
- Keep decisions and scope changes on the card as the work moves through review and implementation.
- Stay accountable after handoff: follow the card until it reaches Engineering QA.
- If you designed it, you QA the implemented experience and record your approval.

## Keep QA findings in one comment thread

QA should read as one continuous record. Open one top-level comment, capture findings as a checklist, and use replies on that original comment for every follow-up round.

```eon:qa-protocol
```
$kb$, array[]::text[], 42),
  ($kb$tracking-mixpanel$kb$, $kb$howto$kb$, $kb$Mixpanel tracking setup$kb$, $kb$How we turn something a person does in the product into an event we can trust in a report, shown on the trip review flow.$kb$, $kb$Tracking$kb$, $kb$published$kb$, $kb$## What we track, and in what order

```eon:tracking
mixpanel-overview
```

## From a tap to an event

```eon:tracking
mixpanel-tap
```

## How we name and format things

```eon:tracking
mixpanel-format
```

## The trip review flow, event by event

Three events and one that already exists. For each: when it fires, the payload as sent, and every property with its type and allowed values.

```eon:tracking
mixpanel-plan
```

## Rules we keep to

```eon:tracking
mixpanel-rules
```

## Setup prompt

```eon:tracking
mixpanel-prompt
```
$kb$, array[]::text[], 50),
  ($kb$tracking-websites$kb$, $kb$reference$kb$, $kb$Site-wide attribution & routing$kb$, $kb$How a person who taps an ad ends up in the app or the web app with the campaign and promo code still attached.$kb$, $kb$Tracking$kb$, $kb$published$kb$, $kb$## What the script does

```eon:tracking
attr-overview
```

## Where a click goes

The site builds the link. AppsFlyer OneLink records the click and decides where the person ends up, based on their device and whether the app is installed.

```eon:tracking
attr-map
```

## What a campaign link looks like

```eon:tracking
attr-url
```

## What the script remembers

```eon:tracking
attr-memory
```

## How a button gets its link

```eon:tracking
attr-buttons
```

## Opening the right screen in the app

```eon:tracking
attr-deeplink
```

## Keeping the details from page to page

```eon:tracking
attr-across
```

## Arriving at the web app

```eon:tracking
attr-return
```

## What happens on each device

```eon:tracking
attr-devices
```

## Worked examples

The same person, six visits. What the Subscribe button on the page carries after each one.

```eon:tracking
attr-examples
```

## Settings the script depends on

The values at the top of the script, and what has to be true in AppsFlyer and in the apps for the whole chain to work.

```eon:tracking
attr-settings
```

## Checking it in the browser

```eon:tracking
attr-console
```
$kb$, array[]::text[], 51),
  ($kb$common-files$kb$, $kb$reference$kb$, $kb$Common files & tools$kb$, $kb$Links to the files and tools the team uses most.$kb$, $kb$Resources$kb$, $kb$draft$kb$, $kb$## Eon Design tools

- [Prototype hub](#/): build, review, comment on, and share interactive product work.
- [Prompt library](#/prompts): reusable prompts and templates for design and delivery work.
- [Tracking guides](kb:tracking-mixpanel): Mixpanel setup, and how attribution flows through the websites.

## Shared destinations to connect

Replace each placeholder when the team agrees on the destination URL.

- **Figma libraries:** published product libraries, foundations, and shared components. _Link needed._
- **Linear workspace:** initiatives, product projects, delivery cycles, and issue templates. _Link needed._
- **Research repository:** customer evidence, studies, interview notes, and insight summaries. _Link needed._
- **Product strategy:** vision, priorities, operating metrics, and current bets. _Link needed._
$kb$, array[]::text[], 60)
) as seed (slug, type, title, summary, group_path, status, body_md, refs, sort_order)
on conflict (team_id, slug) do nothing;
