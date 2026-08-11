-- ============================================================================
-- Eon Prototype Hub — Supabase schema
-- Run in the Supabase SQL editor, or as a migration:
--   supabase db push   (with the CLI and a linked project)
-- Model: one team, role-based access. Every authenticated user gets a profile
-- with role 'member' by default; 'admin' manages roles and can delete content.
-- ============================================================================

-- Extensions
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'member' check (role in ('admin', 'member')),
  tutorial_persona text check (tutorial_persona in ('designer', 'operations', 'engineer')),
  tutorial_requested_at timestamptz,
  tutorial_completed_at timestamptz,
  team_id uuid references public.teams(id) on delete set null,
  created_at timestamptz not null default now()
);

-- A "story" / prototype.
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  slug text not null,
  title text not null,
  group_name text not null default 'General',
  status text not null default 'Exploration'
    check (status in ('Exploration', 'In review', 'Handoff', 'Shipped')),
  prototype_html text,                 -- self-contained HTML source of the prototype
  controls jsonb not null default '[]'::jsonb,   -- [{key,label,options}]
  defaults jsonb not null default '{}'::jsonb,   -- {key: value}
  figma_url text,
  issue_id text,
  issue_url text,
  notes text default '',
  sort_order int not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (team_id, slug)
);

-- Shared media library (logos, placeholders). Files live in Storage; this row
-- carries the metadata + public URL.
create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  key text not null,                   -- e.g. 'eonLogo', 'acmeLogo'
  name text not null,
  type text not null default 'image',
  url text not null,                   -- public URL or data URI
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (team_id, key)
);

-- Shared prompt reference library. Prompt bodies use {{variable_name}}
-- placeholders; variables describes the copy-time input contract.
create table if not exists public.prompts (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  slug text not null,
  title text not null,
  summary text not null default '',
  category text not null default 'General',
  status text not null default 'draft'
    check (status in ('draft', 'published', 'deprecated')),
  prompt_body text not null,
  variables jsonb not null default '[]'::jsonb
    check (jsonb_typeof(variables) = 'array'),
  usage_notes text not null default '',
  avoid_notes text not null default '',
  expected_output text not null default '',
  examples jsonb not null default '[]'::jsonb
    check (jsonb_typeof(examples) = 'array'),
  tags text[] not null default '{}',
  model_hint text,
  tools text[] not null default '{}',
  version int not null default 1 check (version > 0),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_id, slug)
);

create index if not exists prompts_team_category_title_idx
  on public.prompts (team_id, category, title);

-- Team-managed categories remain visible even when they contain no prompts.
create table if not exists public.prompt_categories (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  sort_order int not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_id, name)
);

create unique index if not exists prompt_categories_team_name_ci_idx
  on public.prompt_categories (team_id, lower(name));

-- Keep the standard library categories available for existing and new teams.
insert into public.prompt_categories (team_id, name, sort_order)
select teams.id, category.name, category.sort_order
from public.teams
cross join (values
  ('General', 0),
  ('Image generation', 10),
  ('Research & discovery', 20),
  ('UI & interaction', 30),
  ('Prototyping', 40),
  ('Critique & QA', 50),
  ('Content & UX writing', 60),
  ('Analytics & tracking', 70),
  ('Handoff & documentation', 80)
) as category(name, sort_order)
on conflict (team_id, name) do nothing;

create or replace function public.seed_prompt_categories_for_team()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.prompt_categories (team_id, name, sort_order)
  values
    (new.id, 'General', 0),
    (new.id, 'Image generation', 10),
    (new.id, 'Research & discovery', 20),
    (new.id, 'UI & interaction', 30),
    (new.id, 'Prototyping', 40),
    (new.id, 'Critique & QA', 50),
    (new.id, 'Content & UX writing', 60),
    (new.id, 'Analytics & tracking', 70),
    (new.id, 'Handoff & documentation', 80)
  on conflict (team_id, name) do nothing;
  return new;
end;
$$;

drop trigger if exists teams_seed_prompt_categories on public.teams;
create trigger teams_seed_prompt_categories
  after insert on public.teams
  for each row execute function public.seed_prompt_categories_for_team();

-- Threaded-by-project team comments. Messages are immutable in the first
-- version; authors (or admins) may remove their own messages.
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  -- Public URL of an attached screenshot in the `media` bucket, under comments/.
  image_url text,
  -- Pin on the rendered prototype:
  -- { selector, rel_x, rel_y, x_pct, y_pct, viewport, args, theme }
  anchor jsonb,
  -- Resolution is a team action (see set_comment_resolved below).
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- An attachment is a complete comment on its own, so the body may be empty
  -- when there is an image.
  constraint comments_body_check check (
    char_length(trim(body)) <= 4000
    and (char_length(trim(body)) >= 1 or image_url is not null)
  )
);

create index if not exists comments_project_created_idx
  on public.comments (project_id, created_at);

-- Team activity log powering the History tab and live change toasts. Rows are
-- self-contained: actor_name and project_title are snapshotted and project_id
-- carries no FK, so history reads correctly even after a prototype is deleted.
create table if not exists public.activity (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  project_id uuid,
  project_title text,
  actor_id uuid references public.profiles(id) on delete set null,
  actor_name text,
  action text not null,                -- created | deleted | uploaded_html | updated_html
                                       -- removed_html | status_changed | renamed
                                       -- edited_figma | edited_linear | edited_notes | moved_group
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists activity_team_created_idx on public.activity (team_id, created_at desc);
create index if not exists activity_project_created_idx on public.activity (project_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.current_team_id()
returns uuid language sql stable security definer set search_path = public as $$
  select team_id from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false);
$$;

-- Invite-gated signup: strangers who sign up get a profile with no team,
-- which RLS resolves to zero data access. Admins pre-approve emails here.
create table if not exists public.invites (
  email text primary key,
  team_id uuid not null references public.teams(id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  invited_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Auto-create a profile on signup. First user becomes admin of the default
-- team; later signups only join a team if their email was invited.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  default_team uuid;
  user_count int;
  inv record;
begin
  select count(*) into user_count from public.profiles;

  if user_count = 0 then
    select id into default_team from public.teams order by created_at asc limit 1;
    if default_team is null then
      insert into public.teams (name) values ('Design') returning id into default_team;
    end if;
    insert into public.profiles (id, email, full_name, role, team_id)
    values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.email), 'admin', default_team);
    return new;
  end if;

  select * into inv from public.invites where lower(email) = lower(new.email);

  insert into public.profiles (id, email, full_name, role, team_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(inv.role, 'member'),
    inv.team_id  -- null when not invited
  );

  if inv.email is not null then
    delete from public.invites where lower(email) = lower(new.email);
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;

-- Deleting a category is one atomic operation: keep its prompts and move them
-- to the next available category before removing the category itself.
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

-- The signed-out login can read only the logo URL, not the asset row or any
-- other team media. The fixed search path keeps this security-definer helper
-- from resolving attacker-controlled objects.
create or replace function public.get_public_eon_logo()
returns text language sql stable security definer set search_path = public as $$
  select url from public.assets where key = 'eonLogo' order by created_at asc limit 1;
$$;
revoke all on function public.get_public_eon_logo() from public;
grant execute on function public.get_public_eon_logo() to anon, authenticated;

-- Trigger functions never need to be client-callable via PostgREST RPC.
revoke execute on function public.handle_new_user() from anon, authenticated;
revoke execute on function public.guard_profile_privileges() from anon, authenticated;
revoke execute on function public.touch_updated_at() from anon, authenticated;
revoke execute on function public.seed_prompt_categories_for_team() from public, anon, authenticated;
revoke all on function public.delete_prompt_category(uuid) from public;
grant execute on function public.delete_prompt_category(uuid) to authenticated;

drop trigger if exists projects_touch on public.projects;
create trigger projects_touch before update on public.projects
  for each row execute function public.touch_updated_at();

drop trigger if exists prompts_touch on public.prompts;
create trigger prompts_touch before update on public.prompts
  for each row execute function public.touch_updated_at();

drop trigger if exists prompt_categories_touch on public.prompt_categories;
create trigger prompt_categories_touch before update on public.prompt_categories
  for each row execute function public.touch_updated_at();

drop trigger if exists comments_touch on public.comments;
create trigger comments_touch before update on public.comments
  for each row execute function public.touch_updated_at();

-- Members may edit their own profile, but only admins may change role/team.
-- Without this, the "update own profile" policy lets a member set their own
-- role to admin. auth.uid() is null for server-side access, which stays allowed.
create or replace function public.guard_profile_privileges()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null
     and not public.is_admin()
     and (new.role is distinct from old.role or new.team_id is distinct from old.team_id) then
    raise exception 'only admins can change roles or teams';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_privileges on public.profiles;
create trigger profiles_guard_privileges before update on public.profiles
  for each row execute function public.guard_profile_privileges();

-- Activity writers. record_activity inserts a row, or (when coalescing) folds
-- the change into the caller's most recent same-action row on the same project
-- within 5 minutes — so debounced text edits don't flood the timeline.
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

  -- UPDATE: one row per changed field. sort_order / updated_at churn is ignored
  -- so drag-to-reorder never lands in the timeline. The chatty fields (rename,
  -- links, notes, and repeated HTML updates from live file sync) coalesce;
  -- discrete events (first upload, removal) do not.
  if NEW.prototype_html is distinct from OLD.prototype_html then
    perform public.record_activity(NEW.team_id, NEW.id, NEW.title, v_actor, v_actor_name,
      case when NEW.prototype_html is null then 'removed_html'
           when OLD.prototype_html is null then 'uploaded_html'
           else 'updated_html' end,
      '{}'::jsonb,
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

-- Internal helpers only; revoke the default PUBLIC grant so neither is callable
-- via PostgREST RPC (record_activity is a writer — leaving it exposed would let
-- a signed-in user forge activity rows).
revoke execute on function public.record_activity(uuid, uuid, text, uuid, text, text, jsonb, boolean) from public, anon, authenticated;
revoke execute on function public.log_project_activity() from public, anon, authenticated;

drop trigger if exists projects_activity on public.projects;
create trigger projects_activity
  after insert or update or delete on public.projects
  for each row execute function public.log_project_activity();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.teams    enable row level security;
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.assets   enable row level security;
alter table public.prompts  enable row level security;
alter table public.prompt_categories enable row level security;
alter table public.comments enable row level security;
alter table public.invites  enable row level security;
alter table public.activity enable row level security;

-- invites: team members read; admins manage.
create policy "team read invites" on public.invites for select
  using (team_id = public.current_team_id());
create policy "admin insert invites" on public.invites for insert
  with check (public.is_admin() and team_id = public.current_team_id());
create policy "admin delete invites" on public.invites for delete
  using (public.is_admin() and team_id = public.current_team_id());

-- teams: members can read their own team; admins can update it.
create policy "read own team" on public.teams for select
  using (id = public.current_team_id());
create policy "admin update team" on public.teams for update
  using (public.is_admin() and id = public.current_team_id());

-- profiles: read teammates; update self; admins manage roles within team.
create policy "read team profiles" on public.profiles for select
  using (team_id = public.current_team_id());
create policy "update own profile" on public.profiles for update
  using (id = auth.uid());
create policy "admin manage profiles" on public.profiles for update
  using (public.is_admin() and team_id = public.current_team_id());
create policy "admin delete profiles" on public.profiles for delete
  using (public.is_admin() and team_id = public.current_team_id() and id <> auth.uid());

-- projects: any team member reads + writes; admins delete.
create policy "team read projects" on public.projects for select
  using (team_id = public.current_team_id());
create policy "team insert projects" on public.projects for insert
  with check (team_id = public.current_team_id());
create policy "team update projects" on public.projects for update
  using (team_id = public.current_team_id());
-- Creators may delete their own prototype; admins may delete any.
create policy "member or admin delete projects" on public.projects for delete
  using ((public.is_admin() or created_by = auth.uid()) and team_id = public.current_team_id());

-- assets: same pattern.
create policy "team read assets" on public.assets for select
  using (team_id = public.current_team_id());
create policy "team upsert assets" on public.assets for insert
  with check (team_id = public.current_team_id());
create policy "team update assets" on public.assets for update
  using (team_id = public.current_team_id());
create policy "admin delete assets" on public.assets for delete
  using (public.is_admin() and team_id = public.current_team_id());

-- prompts: every teammate reads and contributes; creators/admins delete.
create policy "team read prompts" on public.prompts for select
  using (team_id = public.current_team_id());
create policy "team insert prompts" on public.prompts for insert
  with check (
    team_id = public.current_team_id()
    and (created_by is null or created_by = auth.uid())
  );
create policy "team update prompts" on public.prompts for update
  using (team_id = public.current_team_id())
  with check (team_id = public.current_team_id());
create policy "creator or admin delete prompts" on public.prompts for delete
  using (
    team_id = public.current_team_id()
    and (public.is_admin() or created_by = auth.uid())
  );

-- prompt categories: teammates can add categories. Deletes intentionally have
-- no table policy and must use the RPC that preserves prompts in another category.
create policy "team read prompt categories" on public.prompt_categories for select
  using (team_id = public.current_team_id());
create policy "team insert prompt categories" on public.prompt_categories for insert
  with check (
    team_id = public.current_team_id()
    and created_by = auth.uid()
  );

-- comments: teammates read and participate; authors or admins may clean up.
create policy "team read comments" on public.comments for select
  using (team_id = public.current_team_id());
create policy "team insert comments" on public.comments for insert
  with check (
    team_id = public.current_team_id()
    and author_id = auth.uid()
    and exists (
      select 1 from public.projects p
      where p.id = project_id and p.team_id = public.current_team_id()
    )
  );
create policy "author update comments" on public.comments for update
  using (author_id = auth.uid() and team_id = public.current_team_id())
  with check (author_id = auth.uid() and team_id = public.current_team_id());
create policy "author delete comments" on public.comments for delete
  using ((author_id = auth.uid() or public.is_admin()) and team_id = public.current_team_id());

-- Emoji reactions on comments. One row per person per emoji per comment;
-- toggling off deletes the row.
create table if not exists public.comment_reactions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  comment_id uuid not null references public.comments(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null check (char_length(emoji) between 1 and 16),
  created_at timestamptz not null default now(),
  unique (comment_id, profile_id, emoji)
);

create index if not exists comment_reactions_comment_idx
  on public.comment_reactions (comment_id);

alter table public.comment_reactions enable row level security;

create policy "team read reactions" on public.comment_reactions for select
  using (team_id = public.current_team_id());
create policy "own insert reactions" on public.comment_reactions for insert
  with check (
    team_id = public.current_team_id()
    and profile_id = auth.uid()
    and exists (
      select 1 from public.comments cm
      where cm.id = comment_id and cm.team_id = public.current_team_id()
    )
  );
create policy "own delete reactions" on public.comment_reactions for delete
  using (profile_id = auth.uid() and team_id = public.current_team_id());

alter publication supabase_realtime add table public.comment_reactions;

-- Row updates are author-only, but resolving is a team action, so it goes
-- through a definer function that only touches the resolved fields.
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

-- activity: teammates read; rows are written only by the projects trigger.
create policy "team read activity" on public.activity for select
  using (team_id = public.current_team_id());

-- ---------------------------------------------------------------------------
-- Realtime: postgres_changes only fires for tables in this publication.
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.projects;
alter publication supabase_realtime add table public.assets;
alter publication supabase_realtime add table public.prompts;
alter publication supabase_realtime add table public.prompt_categories;
alter publication supabase_realtime add table public.comments;
alter publication supabase_realtime add table public.profiles;
alter publication supabase_realtime add table public.activity;

-- ---------------------------------------------------------------------------
-- Storage bucket for media (public read, authenticated write)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

-- Objects in a public bucket are reachable by URL without a SELECT policy;
-- limiting SELECT keeps anonymous clients from listing the bucket.
create policy "auth read media" on storage.objects for select
  using (bucket_id = 'media' and auth.role() = 'authenticated');
create policy "auth upload media" on storage.objects for insert
  with check (bucket_id = 'media' and auth.role() = 'authenticated');
create policy "auth update media" on storage.objects for update
  using (bucket_id = 'media' and auth.role() = 'authenticated');
