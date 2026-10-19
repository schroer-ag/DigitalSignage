-- Lets an image/video asset be uploaded directly instead of only pasting a
-- link to something already hosted elsewhere (Drive, YouTube, etc. -- both
-- still work, this just adds a second option). Files are stored under
-- "<org>/<...>", and the org-access check reuses that first path segment,
-- same idea as assets.org already works for the assets table.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'assets',
  'assets',
  true,
  52428800, -- 50MB -- comfortable for photos/flyers and short video clips;
            -- raise this later (Supabase dashboard -> Storage -> assets)
            -- if a video needs more room than that.
  array[
    'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml',
    'video/mp4', 'video/webm', 'video/quicktime'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public bucket -- reads go straight through the public URL with no RLS
-- check at all, same as every other asset link today. Writes still need
-- a policy: only someone with org access to the uploaded-into org may
-- insert/update/delete an object filed under it.
create policy "asset_uploads_insert_org_access" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'assets'
    and public.has_org_access((storage.foldername(name))[1])
  );

create policy "asset_uploads_update_org_access" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'assets'
    and public.has_org_access((storage.foldername(name))[1])
  )
  with check (
    bucket_id = 'assets'
    and public.has_org_access((storage.foldername(name))[1])
  );

create policy "asset_uploads_delete_org_access" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'assets'
    and public.has_org_access((storage.foldername(name))[1])
  );
