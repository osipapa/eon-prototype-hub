-- Every teammate manages the prototype library: rename, reorder, regroup, and
-- delete any prototype, not only ones they created. Deletes stay attributed in
-- public.activity. RLS still prevents a user from touching another team's rows.
drop policy if exists "member or admin delete projects" on public.projects;
drop policy if exists "team delete projects" on public.projects;

create policy "team delete projects" on public.projects for delete
  using (team_id = public.current_team_id());
