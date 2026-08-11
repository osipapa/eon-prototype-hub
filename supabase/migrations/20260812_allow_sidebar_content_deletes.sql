-- Category deletion remains atomic and never deletes prompts. General can be
-- removed just like any other category when a fallback category is available.
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

revoke all on function public.delete_prompt_category(uuid) from public;
grant execute on function public.delete_prompt_category(uuid) to authenticated;
