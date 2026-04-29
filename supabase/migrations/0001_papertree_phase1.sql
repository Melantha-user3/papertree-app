create extension if not exists pgcrypto;
create extension if not exists vector;

create type node_type as enum ('article', 'section', 'topic');
create type node_status as enum ('unread', 'deep', 'replicated', 'disputed');
create type relation_type as enum ('cites', 'supports', 'contradicts', 'semantic', 'custom');
 
create table if not exists nodes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type node_type not null,
  metadata jsonb not null default '{}'::jsonb,
  embedding vector(1536),
  status node_status not null default 'unread',
  created_at timestamptz not null default now()
);

create table if not exists edges (
  source_id uuid not null references nodes(id) on delete cascade,
  target_id uuid not null references nodes(id) on delete cascade,
  relation_type relation_type not null,
  weight real not null default 0.5 check (weight >= 0 and weight <= 1),
  created_at timestamptz not null default now(),
  primary key (source_id, target_id, relation_type),
  check (source_id <> target_id)
);

create table if not exists annotations (
  id uuid primary key default gen_random_uuid(),
  node_id uuid not null references nodes(id) on delete cascade,
  pdf_page integer not null check (pdf_page >= 1),
  text_content text not null,
  bounding_box jsonb not null,
  created_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists idx_nodes_type on nodes(type);
create index if not exists idx_nodes_status on nodes(status);
create index if not exists idx_nodes_metadata_gin on nodes using gin(metadata);
create index if not exists idx_annotations_node_page on annotations(node_id, pdf_page);
create index if not exists idx_edges_source on edges(source_id);
create index if not exists idx_edges_target on edges(target_id);

create index if not exists idx_nodes_embedding_hnsw_cosine
  on nodes using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

create index if not exists idx_nodes_embedding_ivfflat_cosine
  on nodes using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create or replace function ensure_dag_edge() returns trigger
language plpgsql as $$
declare
  cycle_found boolean;
begin
  with recursive downstream(id) as (
    select new.target_id
    union all
    select e.target_id
    from edges e
    join downstream d on e.source_id = d.id
  )
  select exists(select 1 from downstream where id = new.source_id)
  into cycle_found;

  if cycle_found then
    raise exception 'DAG violation: adding edge % -> % creates a cycle', new.source_id, new.target_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_ensure_dag_edge on edges;
create constraint trigger trg_ensure_dag_edge
after insert or update on edges
deferrable initially immediate
for each row
execute function ensure_dag_edge();

create or replace function get_node_subgraph(root_node uuid)
returns table (
  node_id uuid,
  depth integer,
  path uuid[]
)
language sql
stable
as $$
  with recursive walk as (
    select n.id as node_id, 0 as depth, array[n.id]::uuid[] as path
    from nodes n
    where n.id = root_node
    union all
    select e.target_id, w.depth + 1, w.path || e.target_id
    from walk w
    join edges e on e.source_id = w.node_id
    where not e.target_id = any(w.path)
  )
  select node_id, depth, path
  from walk
  order by depth, node_id;
$$;
-- run: supabase/migrations/0001_papertree_phase1.sql
