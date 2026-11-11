-- ============================================================================
-- Eon Prototype Hub — SHA-256 of prototype HTML for the Claude connector.
-- Agents compare it with `shasum -a 256` on their local build instead of
-- comparing sizes. Computed columns, like html_bytes: select=html_sha256.
-- ============================================================================

create or replace function public.html_sha256(p public.projects)
returns text language sql stable set search_path = public as $$
  select case when p.prototype_html is null then null
              else encode(sha256(convert_to(p.prototype_html, 'UTF8')), 'hex') end
$$;

create or replace function public.revision_sha256(r public.prototype_revisions)
returns text language sql stable set search_path = public as $$
  select encode(sha256(convert_to(r.html, 'UTF8')), 'hex')
$$;
