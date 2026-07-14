-- Personalized tutorial tracks and admin-triggered walkthrough assignments.
alter table public.profiles
  add column if not exists tutorial_persona text,
  add column if not exists tutorial_requested_at timestamptz,
  add column if not exists tutorial_completed_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_tutorial_persona_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_tutorial_persona_check
      check (tutorial_persona in ('designer', 'operations', 'engineer'));
  end if;
end $$;

-- Profile changes let an admin start a walkthrough for an online teammate.
do $$
begin
  alter publication supabase_realtime add table public.profiles;
exception
  when duplicate_object then null;
end $$;
