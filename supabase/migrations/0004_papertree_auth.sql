alter table nodes enable row level security;
alter table edges enable row level security;
alter table annotations enable row level security;

drop policy if exists "Users can view their own nodes" on nodes;
create policy "Users can view their own nodes"
on nodes
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own nodes" on nodes;
create policy "Users can insert their own nodes"
on nodes
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own nodes" on nodes;
create policy "Users can update their own nodes"
on nodes
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own nodes" on nodes;
create policy "Users can delete their own nodes"
on nodes
for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can read their own paper objects" on storage.objects;
create policy "Users can read their own paper objects"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'papers'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "Users can upload their own paper objects" on storage.objects;
create policy "Users can upload their own paper objects"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'papers'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "Users can update their own paper objects" on storage.objects;
create policy "Users can update their own paper objects"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'papers'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
)
with check (
  bucket_id = 'papers'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "Users can delete their own paper objects" on storage.objects;
create policy "Users can delete their own paper objects"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'papers'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);
