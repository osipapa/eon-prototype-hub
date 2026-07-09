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

-- Trigger functions never need to be client-callable via PostgREST RPC.
revoke execute on function public.handle_new_user() from anon, authenticated;
revoke execute on function public.guard_profile_privileges() from anon, authenticated;
revoke execute on function public.touch_updated_at() from anon, authenticated;

drop trigger if exists projects_touch on public.projects;
create trigger projects_touch before update on public.projects
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

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.teams    enable row level security;
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.assets   enable row level security;
alter table public.invites  enable row level security;

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
create policy "admin delete projects" on public.projects for delete
  using (public.is_admin() and team_id = public.current_team_id());

-- assets: same pattern.
create policy "team read assets" on public.assets for select
  using (team_id = public.current_team_id());
create policy "team upsert assets" on public.assets for insert
  with check (team_id = public.current_team_id());
create policy "team update assets" on public.assets for update
  using (team_id = public.current_team_id());
create policy "admin delete assets" on public.assets for delete
  using (public.is_admin() and team_id = public.current_team_id());

-- ---------------------------------------------------------------------------
-- Realtime: postgres_changes only fires for tables in this publication.
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.projects;
alter publication supabase_realtime add table public.assets;

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
