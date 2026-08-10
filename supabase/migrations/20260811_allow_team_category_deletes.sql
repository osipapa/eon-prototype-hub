-- Category organization is shared team work. Any authenticated teammate may
-- remove a non-General category from their own team; prompts are preserved by
-- moving them to General in the same transaction.
create or replace function public.delete_prompt_category(p_category_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  target public.prompt_categories%rowtype;
begin
  select * into target
  from public.prompt_categories
  where id = p_category_id;

  if target.id is null or target.team_id is distinct from public.current_team_id() then
    raise exception 'Category not found';
  end if;
  if lower(target.name) = 'general' then
    raise exception 'The General category cannot be deleted';
  end if;

  insert into public.prompt_categories (team_id, name, sort_order)
  values (target.team_id, 'General', 0)
  on conflict (team_id, name) do nothing;

  update public.prompts
  set category = 'General', updated_by = auth.uid()
  where team_id = target.team_id and lower(category) = lower(target.name);

  delete from public.prompt_categories where id = target.id;
end;
$$;

revoke all on function public.delete_prompt_category(uuid) from public;
grant execute on function public.delete_prompt_category(uuid) to authenticated;
