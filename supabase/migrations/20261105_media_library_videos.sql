-- The media library takes videos too: MP4, WebM, and MOV up to 50 MB (the
-- free-tier upload ceiling). The client keeps images at 10 MB and comment
-- screenshots at 5 MB.
update storage.buckets
set file_size_limit = 52428800,
    allowed_mime_types = array['image/*', 'video/mp4', 'video/webm', 'video/quicktime']
where id = 'media';
