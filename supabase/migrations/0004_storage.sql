-- Pictures move out of the repository and into storage.
--
-- Safe to run more than once.
--
-- Until now every picture lived in public/puzzles, which meant adding one
-- required a deploy. From here the files live in a bucket and the catalogue
-- points at them, so a new picture is live as soon as it is uploaded.
--
-- The bucket is public, which is the honest state of things today: every
-- picture in the catalogue is either free or unlocked with points, and the
-- paid ones are still demo photographs that could not be sold anyway. When
-- there are real pictures to sell they move to a private bucket with signed
-- URLs, and the blurred preview stays here.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'puzzles',
  'puzzles',
  true,
  10485760, -- 10 MB: a 2400px JPEG is well under one
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Anyone may look at the pictures; only the server key may put them there.
drop policy if exists "puzzle pictures are readable by anyone" on storage.objects;
create policy "puzzle pictures are readable by anyone"
  on storage.objects for select
  using (bucket_id = 'puzzles');
