-- ============================================================================
-- Eon Prototype Hub — prototype HTML versions and revisions (Claude connector)
--   1. projects.html_version: bumped by trigger on every HTML change, so any
--      writer can compare-and-swap. Clients cannot set it.
--   2. prototype_revisions: trigger-written snapshots; bursts by one author
--      and source coalesce (5 min, sliding); 30 kept per prototype.
--   3. restore_prototype_revision: guarded restore, recorded as its own row.
--   4. Activity marks HTML changes made through Claude (OAuth client_id).
-- ============================================================================

alter table public.projects add column if not exists html_version int not null default 0;
-- Backfill without firing triggers, so updated_at (recency order) is untouched.
alter table public.projects disable trigger user;
update public.projects set html_version = 1 where prototype_html is not null and html_version = 0;
alter table public.projects enable trigger user;

create or replace function public.bump_html_version()
returns trigger language plpgsql set search_path = public as $$
begin
  if TG_OP = 'INSERT' then
    NEW.html_version := case when NEW.prototype_html is null then 0 else 1 end;
  elsif NEW.prototype_html is distinct from OLD.prototype_html then
    NEW.html_version := OLD.html_version + 1;
  else
    NEW.html_version := OLD.html_version;
  end if;
  return NEW;
end;
$$;
revoke execute on function public.bump_html_version() from public, anon, authenticated;

drop trigger if exists projects_html_version on public.projects;
create trigger projects_html_version
  before insert or update on public.projects
  for each row execute function public.bump_html_version();

-- Size without shipping the HTML: select=html_bytes through PostgREST.
create or replace function public.html_bytes(p public.projects)
returns int language sql stable set search_path = public as $$
  select coalesce(octet_length(p.prototype_html), 0)
$$;

create table if not exists public.prototype_revisions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  version int not null,
  html text not null,
  bytes int not null,
  author_id uuid references public.profiles(id) on delete set null,
  source text not null check (source in ('hub', 'claude')),
  kind text not null default 'save' check (kind in ('initial', 'save', 'restore')),
  created_at timestamptz not null default now()
);
-- Versions only grow per prototype, so version order is recency order, even
-- for several saves inside one transaction (where now() is constant).
create index if not exists prototype_revisions_project_version_idx
  on public.prototype_revisions (project_id, version desc);

alter table public.prototype_revisions enable row level security;
drop policy if exists "team read prototype revisions" on public.prototype_revisions;
create policy "team read prototype revisions" on public.prototype_revisions for select
  using (team_id = public.current_team_id());
-- No insert/update/delete policies: only the trigger below writes.

create or replace function public.record_prototype_revision()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_author uuid := auth.uid();
  v_source text := case when coalesce(auth.jwt() ->> 'client_id', '') <> '' then 'claude' else 'hub' end;
  v_kind text := coalesce(nullif(current_setting('eon.revision_kind', true), ''), 'save');
  v_latest public.prototype_revisions%rowtype;
begin
  if NEW.prototype_html is null then return NEW; end if;
  if TG_OP = 'UPDATE' and NEW.prototype_html is not distinct from OLD.prototype_html then return NEW; end if;

  select * into v_latest from public.prototype_revisions
    where project_id = NEW.id
    order by version desc
    limit 1;

  if v_kind = 'save'
     and v_latest.id is not null
     and v_latest.kind = 'save'
     and v_latest.author_id is not distinct from v_author
     and v_latest.source = v_source
     and v_latest.created_at > now() - interval '5 minutes' then
    update public.prototype_revisions
      set html = NEW.prototype_html, bytes = octet_length(NEW.prototype_html),
          version = NEW.html_version, created_at = now()
      where id = v_latest.id;
  else
    insert into public.prototype_revisions(team_id, project_id, version, html, bytes, author_id, source, kind)
      values (NEW.team_id, NEW.id, NEW.html_version, NEW.prototype_html, octet_length(NEW.prototype_html),
              v_author, v_source, v_kind);
    delete from public.prototype_revisions
      where project_id = NEW.id
        and id not in (
          select id from public.prototype_revisions
            where project_id = NEW.id
            order by version desc
            limit 30);
  end if;
  return NEW;
end;
$$;
revoke execute on function public.record_prototype_revision() from public, anon, authenticated;

drop trigger if exists projects_revision on public.projects;
create trigger projects_revision
  after insert or update of prototype_html on public.projects
  for each row execute function public.record_prototype_revision();

-- Guarded restore. Runs as the caller (RLS applies). The transaction-local
-- flag makes the trigger record a fresh 'restore' row instead of coalescing.
create or replace function public.restore_prototype_revision(p_project uuid, p_version int, p_base_version int)
returns int language plpgsql security invoker set search_path = public as $$
declare
  v_html text;
  v_new int;
  v_current int;
begin
  select html into v_html from public.prototype_revisions
    where project_id = p_project and version = p_version
    limit 1;
  if v_html is null then
    raise exception 'revision_not_found';
  end if;

  perform set_config('eon.revision_kind', 'restore', true);
  update public.projects set prototype_html = v_html
    where id = p_project and html_version = p_base_version
    returning html_version into v_new;
  perform set_config('eon.revision_kind', '', true);

  if v_new is null then
    select html_version into v_current from public.projects where id = p_project;
    raise exception 'version_conflict' using detail = coalesce(v_current, -1)::text;
  end if;
  return v_new;
end;
$$;
revoke execute on function public.restore_prototype_revision(uuid, int, int) from public, anon;
grant execute on function public.restore_prototype_revision(uuid, int, int) to authenticated;

-- Seed: today's HTML becomes each prototype's restorable starting point.
insert into public.prototype_revisions(team_id, project_id, version, html, bytes, author_id, source, kind)
  select p.team_id, p.id, p.html_version, p.prototype_html, octet_length(p.prototype_html), null, 'hub', 'initial'
  from public.projects p
  where p.prototype_html is not null
    and not exists (select 1 from public.prototype_revisions r where r.project_id = p.id);

-- Activity: mark HTML changes made through Claude. Redefines
-- log_project_activity from 20260717_coalesce_updated_html_activity.sql; only
-- the prototype_html branch's detail changes.
create or replace function public.log_project_activity()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_actor uuid := auth.uid();
  v_actor_name text;
  v_html_detail jsonb := case when coalesce(auth.jwt() ->> 'client_id', '') <> ''
                              then jsonb_build_object('via', 'claude') else '{}'::jsonb end;
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

  if NEW.prototype_html is distinct from OLD.prototype_html then
    perform public.record_activity(NEW.team_id, NEW.id, NEW.title, v_actor, v_actor_name,
      case when NEW.prototype_html is null then 'removed_html'
           when OLD.prototype_html is null then 'uploaded_html'
           else 'updated_html' end,
      v_html_detail,
      NEW.prototype_html is not null and OLD.prototype_html is not null);
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
revoke execute on function public.log_project_activity() from public, anon, authenticated;
