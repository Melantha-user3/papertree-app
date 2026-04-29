create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_projects_user_name on projects(user_id, lower(name));
create index if not exists idx_projects_user_created_at on projects(user_id, created_at desc);

alter table projects enable row level security;

drop policy if exists "Users can view their own projects" on projects;
create policy "Users can view their own projects"
on projects
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own projects" on projects;
create policy "Users can insert their own projects"
on projects
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own projects" on projects;
create policy "Users can update their own projects"
on projects
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own projects" on projects;
create policy "Users can delete their own projects"
on projects
for delete
to authenticated
using ((select auth.uid()) = user_id);

create or replace function set_projects_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_set_projects_updated_at on projects;
create trigger trg_set_projects_updated_at
before update on projects
for each row
execute function set_projects_updated_at();

insert into projects (user_id, name)
select distinct n.user_id, 'Imported Papers'
from nodes n
where n.user_id is not null
  and not exists (
    select 1
    from projects p
    where p.user_id = n.user_id
      and p.name = 'Imported Papers'
  );

alter table nodes
  add column if not exists project_id uuid references projects(id) on delete cascade,
  add column if not exists is_academic boolean not null default true,
  add column if not exists publication_year integer check (publication_year is null or publication_year between 1800 and 2100),
  add column if not exists position_x double precision,
  add column if not exists position_y double precision;

update nodes n
set project_id = p.id,
    publication_year = coalesce(
      n.publication_year,
      case
        when (n.metadata ->> 'publication_year') ~ '^\d{4}$'
          then (n.metadata ->> 'publication_year')::integer
        else null
      end,
      case
        when (n.metadata ->> 'year') ~ '^\d{4}$'
          then (n.metadata ->> 'year')::integer
        else null
      end
    )
from projects p
where n.user_id = p.user_id
  and p.name = 'Imported Papers'
  and n.project_id is null;

create index if not exists idx_nodes_project_id_updated_at on nodes(project_id, updated_at desc);
create index if not exists idx_nodes_project_id_publication_year on nodes(project_id, publication_year);
create index if not exists idx_nodes_project_id_is_academic on nodes(project_id, is_academic);

alter table edges
  add column if not exists project_id uuid references projects(id) on delete cascade,
  add column if not exists is_locked boolean not null default false;

update edges e
set project_id = n.project_id
from nodes n
where e.source_id = n.id
  and e.project_id is null;

create index if not exists idx_edges_project_id on edges(project_id);
create index if not exists idx_edges_project_id_locked on edges(project_id, is_locked);

create or replace function ensure_edge_project_scope() returns trigger
language plpgsql as $$
declare
  source_project uuid;
  target_project uuid;
begin
  select project_id into source_project from nodes where id = new.source_id;
  select project_id into target_project from nodes where id = new.target_id;

  if source_project is null or target_project is null then
    raise exception 'Edges require nodes that belong to a project';
  end if;

  if source_project <> target_project then
    raise exception 'Edges cannot connect nodes across projects';
  end if;

  new.project_id = source_project;
  return new;
end;
$$;

drop trigger if exists trg_ensure_edge_project_scope on edges;
create trigger trg_ensure_edge_project_scope
before insert or update on edges
for each row
execute function ensure_edge_project_scope();
