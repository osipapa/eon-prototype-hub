-- Emoji reactions on prototype comments. One row per person per emoji per
-- comment; toggling off deletes the row.
create table if not exists public.comment_reactions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  comment_id uuid not null references public.comments(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null check (char_length(emoji) between 1 and 16),
  created_at timestamptz not null default now(),
  unique (comment_id, profile_id, emoji)
);

create index if not exists comment_reactions_comment_idx
  on public.comment_reactions (comment_id);

alter table public.comment_reactions enable row level security;

drop policy if exists "team read reactions" on public.comment_reactions;
create policy "team read reactions" on public.comment_reactions for select
  using (team_id = public.current_team_id());

drop policy if exists "own insert reactions" on public.comment_reactions;
create policy "own insert reactions" on public.comment_reactions for insert
  with check (
    team_id = public.current_team_id()
    and profile_id = auth.uid()
    and exists (
      select 1 from public.comments cm
      where cm.id = comment_id and cm.team_id = public.current_team_id()
    )
  );

drop policy if exists "own delete reactions" on public.comment_reactions;
create policy "own delete reactions" on public.comment_reactions for delete
  using (profile_id = auth.uid() and team_id = public.current_team_id());

do $$
begin
  alter publication supabase_realtime add table public.comment_reactions;
exception
  when duplicate_object then null;
end $$;
