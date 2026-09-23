-- Automatic checks: the latest results per prototype. Whichever teammate's
-- browser runs the checks writes the row; the whole team reads it, and
-- realtime keeps open workspaces current. `hash` fingerprints the HTML, the
-- states, and the checker version the results were measured against.
create table if not exists public.prototype_checks (
  project_id uuid primary key references public.projects(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  hash text not null,
  results jsonb not null default '{}'::jsonb,
  checked_by uuid references public.profiles(id) on delete set null,
  checked_at timestamptz not null default now()
);

alter table public.prototype_checks enable row level security;

drop policy if exists "team read prototype checks" on public.prototype_checks;
create policy "team read prototype checks" on public.prototype_checks for select
  using (team_id = public.current_team_id());

drop policy if exists "team insert prototype checks" on public.prototype_checks;
create policy "team insert prototype checks" on public.prototype_checks for insert
  with check (
    team_id = public.current_team_id()
    and checked_by = auth.uid()
    and exists (
      select 1 from public.projects p
      where p.id = project_id and p.team_id = public.current_team_id()
    )
  );

drop policy if exists "team update prototype checks" on public.prototype_checks;
create policy "team update prototype checks" on public.prototype_checks for update
  using (team_id = public.current_team_id())
  with check (team_id = public.current_team_id() and checked_by = auth.uid());

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'prototype_checks'
  ) then
    alter publication supabase_realtime add table public.prototype_checks;
  end if;
end $$;
