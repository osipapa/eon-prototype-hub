-- Shared media can be created and replaced by every teammate, so removing an
-- item follows the same team-scoped permission model. RLS still prevents a
-- user from touching assets outside their team.
drop policy if exists "admin delete assets" on public.assets;
drop policy if exists "team delete assets" on public.assets;

create policy "team delete assets" on public.assets for delete
  using (team_id = public.current_team_id());
