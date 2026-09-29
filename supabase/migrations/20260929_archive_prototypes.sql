-- Archive: a prototype the team wants to keep but not see. It leaves the
-- library for a collapsed Archived section, keeping its feedback, history,
-- and links. Null means active. Redefines log_project_activity from
-- 20260925_prototype_revisions.sql; only the archived_at branch is new.
alter table public.projects add column if not exists archived_at timestamptz;

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

  if NEW.archived_at is distinct from OLD.archived_at then
    perform public.record_activity(NEW.team_id, NEW.id, NEW.title, v_actor, v_actor_name,
      case when NEW.archived_at is null then 'unarchived' else 'archived' end, '{}'::jsonb, false);
  end if;

  return NEW;
end;
$$;
revoke execute on function public.log_project_activity() from public, anon, authenticated;
