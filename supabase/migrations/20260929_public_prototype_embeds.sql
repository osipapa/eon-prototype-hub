-- Hub prototype links embed anywhere (Notion, Confluence, Miro...) and render
-- for anyone, signed in or not. The embed reads through this one function, so
-- only what a prototype needs to render is public: its title, HTML, states,
-- and the media its tokens resolve to. Notes, comments, Linear links, history,
-- and every other table stay behind RLS.
create or replace function public.get_embed_prototype(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'slug', p.slug,
    'title', p.title,
    'prototype_html', p.prototype_html,
    'controls', coalesce(p.controls, '[]'::jsonb),
    'defaults', coalesce(p.defaults, '{}'::jsonb),
    'html_version', p.html_version,
    'media', coalesce(
      (select jsonb_object_agg(a.key, a.url) from public.assets a where a.team_id = p.team_id and a.url is not null),
      '{}'::jsonb
    )
  )
  from public.projects p
  where p.slug = p_slug
  order by p.sort_order
  limit 1;
$$;

revoke all on function public.get_embed_prototype(text) from public;
grant execute on function public.get_embed_prototype(text) to anon, authenticated;
