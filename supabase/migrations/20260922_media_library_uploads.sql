-- Media library uploads live under library/ in the public media bucket.
-- Teammates can already replace and delete shared assets, so they may also
-- remove the files those assets pointed at. Comment screenshots (comments/)
-- stay undeletable.
create policy "auth delete library media" on storage.objects for delete
  using (
    bucket_id = 'media'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = 'library'
  );

-- Back the client's upload checks with the bucket's own: images only, and
-- nothing over 10 MB.
update storage.buckets
set file_size_limit = 10485760,
    allowed_mime_types = array['image/*']
where id = 'media';
