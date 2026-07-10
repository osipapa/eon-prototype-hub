-- Shared prototype comments for the already-deployed Eon database.
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists comments_project_created_idx
  on public.comments (project_id, created_at);

drop trigger if exists comments_touch on public.comments;
create trigger comments_touch before update on public.comments
  for each row execute function public.touch_updated_at();

alter table public.comments enable row level security;

drop policy if exists "team read comments" on public.comments;
create policy "team read comments" on public.comments for select
  using (team_id = public.current_team_id());

drop policy if exists "team insert comments" on public.comments;
create policy "team insert comments" on public.comments for insert
  with check (
    team_id = public.current_team_id()
    and author_id = auth.uid()
    and exists (
      select 1 from public.projects p
      where p.id = project_id and p.team_id = public.current_team_id()
    )
  );

drop policy if exists "author update comments" on public.comments;
create policy "author update comments" on public.comments for update
  using (author_id = auth.uid() and team_id = public.current_team_id())
  with check (author_id = auth.uid() and team_id = public.current_team_id());

drop policy if exists "author delete comments" on public.comments;
create policy "author delete comments" on public.comments for delete
  using ((author_id = auth.uid() or public.is_admin()) and team_id = public.current_team_id());

do $$
begin
  alter publication supabase_realtime add table public.comments;
exception
  when duplicate_object then null;
end $$;
