-- Allow the signed-out login screen to read only the shared Eon logo URL.
-- No asset rows, team metadata, other media, or write access are exposed.
drop policy if exists "public read Eon branding" on public.assets;

create or replace function public.get_public_eon_logo()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select url
  from public.assets
  where key = 'eonLogo'
  order by created_at asc
  limit 1;
$$;

revoke all on function public.get_public_eon_logo() from public;
grant execute on function public.get_public_eon_logo() to anon, authenticated;
