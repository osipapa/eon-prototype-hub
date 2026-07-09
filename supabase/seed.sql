-- ============================================================================
-- Seed data. Run AFTER at least one user has signed up (so a team exists).
-- Attaches the two starter stories to the first team. The prototype_html is
-- left null here; the app ships built-in builders for these two slugs and will
-- backfill prototype_html on first save. Replace with your own HTML any time.
-- ============================================================================

with t as (select id from public.teams order by created_at asc limit 1)
insert into public.projects (team_id, slug, title, group_name, status, controls, defaults, figma_url, issue_id, issue_url, notes, sort_order)
select t.id, v.slug, v.title, v.group_name, v.status, v.controls::jsonb, v.defaults::jsonb, v.figma_url, v.issue_id, v.issue_url, v.notes, v.sort_order
from t, (values
  (
    'signin', 'Sign in', 'Onboarding', 'In review',
    '[{"key":"state","label":"State","options":["default","error","loading"]}]',
    '{"state":"default"}',
    'https://figma.com/file/REPLACE/onboarding', 'PRO-12', 'https://linear.app/acme/issue/PRO-12',
    'Email/password with Google + SSO. Error and loading states covered.', 0
  ),
  (
    'dashboard', 'Overview', 'Dashboard', 'Handoff',
    '[{"key":"plan","label":"Plan","options":["free","pro"]},{"key":"state","label":"State","options":["default","empty","loading"]}]',
    '{"plan":"pro","state":"default"}',
    'https://figma.com/file/REPLACE/dashboard', 'PRO-30', 'https://linear.app/acme/issue/PRO-30',
    'Customers overview: 4 KPI cards + table with status pills.', 1
  )
) as v(slug, title, group_name, status, controls, defaults, figma_url, issue_id, issue_url, notes, sort_order)
on conflict (team_id, slug) do nothing;
