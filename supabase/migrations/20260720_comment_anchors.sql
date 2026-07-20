-- Anchored comments: a comment can pin to a spot on the rendered prototype,
-- and any team member can resolve/unresolve a comment.

-- anchor: { selector, rel_x, rel_y, x_pct, y_pct, viewport, args, theme }
--   selector  structural DOM path inside the prototype iframe
--   rel_x/y   click offset within that element (0..1), so the pin tracks it
--   x_pct/y_pct  click point as % of the prototype viewport (fallback when
--                the selector no longer resolves)
--   viewport/args/theme  canvas state at placement, for jump-to-context
alter table public.comments add column if not exists anchor jsonb;
alter table public.comments add column if not exists resolved_at timestamptz;
alter table public.comments add column if not exists resolved_by uuid
  references public.profiles(id) on delete set null;

-- Row updates are author-only under RLS, but resolving is a team action, so
-- it goes through a definer function that only touches the resolved fields.
create or replace function public.set_comment_resolved(comment_id uuid, resolved boolean)
returns setof public.comments
language sql security definer set search_path = public as $$
  update public.comments
     set resolved_at = case when resolved then now() else null end,
         resolved_by = case when resolved then auth.uid() else null end
   where id = comment_id and team_id = public.current_team_id()
  returning *;
$$;

revoke all on function public.set_comment_resolved(uuid, boolean) from anon, public;
grant execute on function public.set_comment_resolved(uuid, boolean) to authenticated;
