-- Image attachments on prototype comments (paste or upload a screenshot).
-- The file itself lives in the existing public `media` bucket under a
-- `comments/` prefix; the row only carries its public URL.
alter table public.comments add column if not exists image_url text;

-- A screenshot is often the whole point of the comment, so an attachment now
-- satisfies the "not empty" rule on its own. Text-only comments are unchanged.
alter table public.comments drop constraint if exists comments_body_check;
alter table public.comments add constraint comments_body_check check (
  char_length(trim(body)) <= 4000
  and (char_length(trim(body)) >= 1 or image_url is not null)
);
