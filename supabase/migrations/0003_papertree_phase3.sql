do $$
begin
  create type analysis_status as enum ('uploaded', 'analyzing', 'ready', 'error');
exception
  when duplicate_object then null;
end
$$;

alter table nodes
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists source_file_name text,
  add column if not exists source_file_path text,
  add column if not exists source_mime_type text,
  add column if not exists file_size_bytes bigint,
  add column if not exists page_count integer check (page_count is null or page_count > 0),
  add column if not exists source_excerpt text,
  add column if not exists summary text,
  add column if not exists analysis_status analysis_status not null default 'uploaded',
  add column if not exists analysis_error text,
  add column if not exists analysis_started_at timestamptz,
  add column if not exists analysis_completed_at timestamptz,
  add column if not exists analysis_attempt_count integer not null default 0,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_nodes_user_id_updated_at on nodes(user_id, updated_at desc);
create index if not exists idx_nodes_analysis_status on nodes(analysis_status);

create or replace function set_nodes_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_set_nodes_updated_at on nodes;
create trigger trg_set_nodes_updated_at
before update on nodes
for each row
execute function set_nodes_updated_at();
