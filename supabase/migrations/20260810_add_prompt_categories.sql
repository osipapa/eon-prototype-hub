-- Persist team prompt categories independently from prompts so empty categories
-- can be created, displayed, and deleted.
create table if not exists public.prompt_categories (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  sort_order int not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_id, name)
);

create unique index if not exists prompt_categories_team_name_ci_idx
  on public.prompt_categories (team_id, lower(name));

-- Seed the standard library for every existing workspace.
insert into public.prompt_categories (team_id, name, sort_order)
select teams.id, category.name, category.sort_order
from public.teams
cross join (values
  ('General', 0),
  ('Image generation', 10),
  ('Research & discovery', 20),
  ('UI & interaction', 30),
  ('Prototyping', 40),
  ('Critique & QA', 50),
  ('Content & UX writing', 60),
  ('Analytics & tracking', 70),
  ('Handoff & documentation', 80)
) as category(name, sort_order)
on conflict (team_id, name) do nothing;

-- Preserve any custom category labels that already exist on prompt rows.
insert into public.prompt_categories (team_id, name, sort_order)
select existing.team_id, existing.name, (1000 + existing.position * 10)::int
from (
  select
    distinct_categories.team_id,
    distinct_categories.name,
    row_number() over (partition by distinct_categories.team_id order by distinct_categories.name) as position
  from (
    select distinct on (team_id, lower(btrim(category)))
      team_id,
      btrim(category) as name
    from public.prompts
    where btrim(category) <> ''
    order by team_id, lower(btrim(category)), btrim(category)
  ) as distinct_categories
) as existing
where not exists (
  select 1
  from public.prompt_categories category
  where category.team_id = existing.team_id
    and lower(category.name) = lower(existing.name)
);

-- Canonicalize legacy case variants so every prompt lands in the visible row.
update public.prompts prompt
set category = category.name
from public.prompt_categories category
where prompt.team_id = category.team_id
  and lower(prompt.category) = lower(category.name)
  and prompt.category <> category.name;

create or replace function public.seed_prompt_categories_for_team()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.prompt_categories (team_id, name, sort_order)
  values
    (new.id, 'General', 0),
    (new.id, 'Image generation', 10),
    (new.id, 'Research & discovery', 20),
    (new.id, 'UI & interaction', 30),
    (new.id, 'Prototyping', 40),
    (new.id, 'Critique & QA', 50),
    (new.id, 'Content & UX writing', 60),
    (new.id, 'Analytics & tracking', 70),
    (new.id, 'Handoff & documentation', 80)
  on conflict (team_id, name) do nothing;
  return new;
end;
$$;

drop trigger if exists teams_seed_prompt_categories on public.teams;
create trigger teams_seed_prompt_categories
  after insert on public.teams
  for each row execute function public.seed_prompt_categories_for_team();

drop trigger if exists prompt_categories_touch on public.prompt_categories;
create trigger prompt_categories_touch before update on public.prompt_categories
  for each row execute function public.touch_updated_at();

alter table public.prompt_categories enable row level security;

create policy "team read prompt categories" on public.prompt_categories for select
  using (team_id = public.current_team_id());
create policy "team insert prompt categories" on public.prompt_categories for insert
  with check (
    team_id = public.current_team_id()
    and created_by = auth.uid()
  );

-- Keep category deletion and prompt reassignment atomic. Any category can be
-- removed when another category is available; its prompts are never deleted.
create or replace function public.delete_prompt_category(p_category_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  target public.prompt_categories%rowtype;
  fallback_name text;
begin
  select * into target
  from public.prompt_categories
  where id = p_category_id;

  if target.id is null or target.team_id is distinct from public.current_team_id() then
    raise exception 'Category not found';
  end if;
  select name into fallback_name
  from public.prompt_categories
  where team_id = target.team_id and id <> target.id
  order by sort_order asc, name asc
  limit 1;

  if fallback_name is null then
    raise exception 'Create another category before deleting the last category';
  end if;

  update public.prompts
  set category = fallback_name, updated_by = auth.uid()
  where team_id = target.team_id and lower(category) = lower(target.name);

  delete from public.prompt_categories where id = target.id;
end;
$$;

revoke execute on function public.seed_prompt_categories_for_team() from public, anon, authenticated;
revoke all on function public.delete_prompt_category(uuid) from public;
grant execute on function public.delete_prompt_category(uuid) to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.prompt_categories;
exception when duplicate_object then
  null;
end;
$$;
