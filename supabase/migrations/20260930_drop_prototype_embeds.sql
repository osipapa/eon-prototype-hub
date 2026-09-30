-- Embeds are gone: they never played in Notion, Confluence, or Miro. Drop the
-- public read path so prototype HTML is behind RLS again, like everything else.
drop function if exists public.get_embed_prototype(text);
