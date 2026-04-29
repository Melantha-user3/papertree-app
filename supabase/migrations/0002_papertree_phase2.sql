do $$
begin
  alter type node_status add value if not exists 'pending_review';
exception
  when duplicate_object then null;
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('papers', 'papers', true, 52428800, array['application/pdf'])
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('covers', 'covers', true, 10485760, array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])
on conflict (id) do nothing;

drop policy if exists "Public read papers and covers" on storage.objects;
create policy "Public read papers and covers"
on storage.objects for select
to public
using (bucket_id in ('papers', 'covers'));

drop policy if exists "Authenticated upload papers" on storage.objects;
create policy "Authenticated upload papers"
on storage.objects for insert
to authenticated
with check (bucket_id = 'papers');

drop policy if exists "Authenticated upload covers" on storage.objects;
create policy "Authenticated upload covers"
on storage.objects for insert
to authenticated
with check (bucket_id = 'covers');
