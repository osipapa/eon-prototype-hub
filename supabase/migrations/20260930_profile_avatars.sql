-- Profile photos, pulled once from Slack (avatars.slack-edge.com, 192px) along
-- with real names. Null means the hub draws its own icon for that person.
alter table public.profiles add column if not exists avatar_url text;
