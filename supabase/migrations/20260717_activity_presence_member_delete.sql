-- ============================================================================
-- Eon Prototype Hub — activity log, coalesced change history, and member delete
--   1. public.activity: self-contained audit rows (snapshotted actor_name /
--      project_title, no project_id FK) so history survives a project delete.
--   2. A SECURITY DEFINER trigger on projects writes one row per meaningful
--      change, coalescing chatty text edits (same field, same actor, 5 min).
--   3. Members may delete prototypes they created; admins delete any.
-- Additive apart from broadening the projects DELETE policy.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Activity log
-- ---------------------------------------------------------------------------
create table if not exists public.activity (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  project_id uuid,                       -- intentionally no FK: rows outlive the project
  project_title text,                    -- snapshot so deleted prototypes still read well
  actor_id uuid references public.profiles(id) on delete set null,
  actor_name text,                       -- snapshot so History/toasts need no join
  action text not null,                  -- created | deleted | uploaded_html | updated_html
                                         -- removed_html | status_changed | renamed
                                         -- edited_figma | edited_linear | edited_notes | moved_group
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists activity_team_created_idx on public.activity (team_id, created_at desc);
create index if not exists activity_project_created_idx on public.activity (project_id, created_at desc);

alter table public.activity enable row level security;

-- Teammates read their team's activity. Inserts flow only through the trigger
-- below (SECURITY DEFINER, so it bypasses RLS); no client insert policy exists,
-- which blocks forged activity rows from the browser.
drop policy if exists "team read activity" on public.activity;
create policy "team read activity" on public.activity for select
  using (team_id = public.current_team_id());

-- ---------------------------------------------------------------------------
-- Writers
-- ---------------------------------------------------------------------------

-- Insert an activity row, or (when p_coalesce) fold it into the caller's most
-- recent same-action row on the same project within 5 minutes. Coalescing keeps
-- debounced text edits (notes, links, renames) from flooding the timeline.
create or replace function public.record_activity(
  p_team uuid, p_project uuid, p_title text, p_actor uuid, p_actor_name text,
  p_action text, p_detail jsonb, p_coalesce boolean)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  if p_coalesce then
    select id into v_id from public.activity
      where project_id = p_project
        and actor_id is not distinct from p_actor
        and action = p_action
        and created_at > now() - interval '5 minutes'
      order by created_at desc
      limit 1;
    if v_id is not null then
      update public.activity
        set created_at = now(), detail = p_detail, project_title = p_title
        where id = v_id;
      return;
    end if;
  end if;

  insert into public.activity(team_id, project_id, project_title, actor_id, actor_name, action, detail)
    values (p_team, p_project, p_title, p_actor, p_actor_name, p_action, p_detail);
end;
$$;

create or replace function public.log_project_activity()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_actor uuid := auth.uid();
  v_actor_name text;
begin
  select coalesce(full_name, email) into v_actor_name from public.profiles where id = v_actor;

  if TG_OP = 'INSERT' then
    insert into public.activity(team_id, project_id, project_title, actor_id, actor_name, action)
      values (NEW.team_id, NEW.id, NEW.title, v_actor, v_actor_name, 'created');
    return NEW;
  elsif TG_OP = 'DELETE' then
    insert into public.activity(team_id, project_id, project_title, actor_id, actor_name, action)
      values (OLD.team_id, OLD.id, OLD.title, v_actor, v_actor_name, 'deleted');
    return OLD;
  end if;

  -- UPDATE: one row per changed field. sort_order / updated_at churn is ignored,
  -- so drag-to-reorder never lands in the timeline.
  if NEW.prototype_html is distinct from OLD.prototype_html then
    perform public.record_activity(NEW.team_id, NEW.id, NEW.title, v_actor, v_actor_name,
      case when NEW.prototype_html is null then 'removed_html'
           when OLD.prototype_html is null then 'uploaded_html'
           else 'updated_html' end,
      '{}'::jsonb, false);
  end if;

  if NEW.status is distinct from OLD.status then
    perform public.record_activity(NEW.team_id, NEW.id, NEW.title, v_actor, v_actor_name,
      'status_changed', jsonb_build_object('from', OLD.status, 'to', NEW.status), false);
  end if;

  if NEW.title is distinct from OLD.title then
    perform public.record_activity(NEW.team_id, NEW.id, NEW.title, v_actor, v_actor_name,
      'renamed', jsonb_build_object('from', OLD.title, 'to', NEW.title), true);
  end if;

  if NEW.figma_url is distinct from OLD.figma_url then
    perform public.record_activity(NEW.team_id, NEW.id, NEW.title, v_actor, v_actor_name,
      'edited_figma', jsonb_build_object('to', NEW.figma_url), true);
  end if;

  if (NEW.issue_url is distinct from OLD.issue_url) or (NEW.issue_id is distinct from OLD.issue_id) then
    perform public.record_activity(NEW.team_id, NEW.id, NEW.title, v_actor, v_actor_name,
      'edited_linear', jsonb_build_object('to', coalesce(NEW.issue_url, NEW.issue_id)), true);
  end if;

  if NEW.notes is distinct from OLD.notes then
    perform public.record_activity(NEW.team_id, NEW.id, NEW.title, v_actor, v_actor_name,
      'edited_notes', '{}'::jsonb, true);
  end if;

  if NEW.group_name is distinct from OLD.group_name then
    perform public.record_activity(NEW.team_id, NEW.id, NEW.title, v_actor, v_actor_name,
      'moved_group', jsonb_build_object('to', NEW.group_name), false);
  end if;

  return NEW;
end;
$$;

-- Internal helpers only; never callable via PostgREST RPC. Revoke the default
-- PUBLIC grant too — otherwise anon/authenticated keep EXECUTE through PUBLIC
-- and a signed-in user could forge activity rows via rpc/record_activity.
revoke execute on function public.record_activity(uuid, uuid, text, uuid, text, text, jsonb, boolean) from public, anon, authenticated;
revoke execute on function public.log_project_activity() from public, anon, authenticated;

drop trigger if exists projects_activity on public.projects;
create trigger projects_activity
  after insert or update or delete on public.projects
  for each row execute function public.log_project_activity();

-- ---------------------------------------------------------------------------
-- Member delete: creators may delete their own prototype; admins delete any.
-- ---------------------------------------------------------------------------
drop policy if exists "admin delete projects" on public.projects;
drop policy if exists "member or admin delete projects" on public.projects;
create policy "member or admin delete projects" on public.projects for delete
  using ((public.is_admin() or created_by = auth.uid()) and team_id = public.current_team_id());

-- ---------------------------------------------------------------------------
-- Realtime: History tab and change toasts read from this stream.
-- ---------------------------------------------------------------------------
do $$ begin
  alter publication supabase_realtime add table public.activity;
exception when duplicate_object then null;
end $$;
