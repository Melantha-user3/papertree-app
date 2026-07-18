do $$
begin
  create type group_member_role as enum ('owner', 'member');
exception
  when duplicate_object then null;
end
$$;

create table if not exists groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  description text,
  invite_code text not null unique default encode(extensions.gen_random_bytes(8), 'hex'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists group_members (
  group_id uuid not null references groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role group_member_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

alter table projects
  add column if not exists group_id uuid references groups(id) on delete set null;

create table if not exists paper_comments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  node_id uuid not null references nodes(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) > 0),
  page_number integer check (page_number is null or page_number >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists paper_read_progress (
  project_id uuid not null references projects(id) on delete cascade,
  node_id uuid not null references nodes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  current_page integer not null default 1 check (current_page >= 1),
  total_pages integer check (total_pages is null or total_pages > 0),
  active_seconds integer not null default 0 check (active_seconds >= 0),
  last_active_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (project_id, node_id, user_id)
);

create table if not exists paper_read_sessions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  node_id uuid not null references nodes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  active_seconds integer not null check (active_seconds >= 0),
  started_at timestamptz not null,
  ended_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_groups_owner_id on groups(owner_id, created_at desc);
create index if not exists idx_group_members_user_id on group_members(user_id, joined_at desc);
create index if not exists idx_projects_group_id on projects(group_id, created_at desc);
create index if not exists idx_paper_comments_node_created_at on paper_comments(node_id, created_at desc);
create index if not exists idx_paper_read_progress_project_user on paper_read_progress(project_id, user_id);
create index if not exists idx_paper_read_sessions_project_node on paper_read_sessions(project_id, node_id, created_at desc);

create or replace function is_group_member(
  target_group_id uuid,
  target_user_id uuid default auth.uid()
) returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_members
    where group_id = target_group_id
      and user_id = target_user_id
  );
$$;

revoke all on function is_group_member(uuid, uuid) from public;
grant execute on function is_group_member(uuid, uuid) to authenticated;

create or replace function set_groups_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_set_groups_updated_at on groups;
create trigger trg_set_groups_updated_at
before update on groups
for each row
execute function set_groups_updated_at();

create or replace function set_paper_comments_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_set_paper_comments_updated_at on paper_comments;
create trigger trg_set_paper_comments_updated_at
before update on paper_comments
for each row
execute function set_paper_comments_updated_at();

create or replace function set_paper_read_progress_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_set_paper_read_progress_updated_at on paper_read_progress;
create trigger trg_set_paper_read_progress_updated_at
before update on paper_read_progress
for each row
execute function set_paper_read_progress_updated_at();

alter table groups enable row level security;
alter table group_members enable row level security;
alter table paper_comments enable row level security;
alter table paper_read_progress enable row level security;
alter table paper_read_sessions enable row level security;

drop policy if exists "Members can view their groups" on groups;
create policy "Members can view their groups"
on groups
for select
to authenticated
using (
  owner_id = (select auth.uid())
  or is_group_member(id)
);

drop policy if exists "Users can create owned groups" on groups;
create policy "Users can create owned groups"
on groups
for insert
to authenticated
with check (owner_id = (select auth.uid()));

drop policy if exists "Owners can update groups" on groups;
create policy "Owners can update groups"
on groups
for update
to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

drop policy if exists "Owners can delete groups" on groups;
create policy "Owners can delete groups"
on groups
for delete
to authenticated
using (owner_id = (select auth.uid()));

drop policy if exists "Members can view group members" on group_members;
create policy "Members can view group members"
on group_members
for select
to authenticated
using (
  user_id = (select auth.uid())
  or is_group_member(group_id)
);

drop policy if exists "Users can join as themselves" on group_members;
create policy "Users can join as themselves"
on group_members
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from groups g
    where g.id = group_id
      and g.owner_id = (select auth.uid())
  )
);

drop policy if exists "Owners can manage group members" on group_members;
create policy "Owners can manage group members"
on group_members
for update
to authenticated
using (
  exists (
    select 1
    from groups g
    where g.id = group_members.group_id
      and g.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from groups g
    where g.id = group_members.group_id
      and g.owner_id = (select auth.uid())
  )
);

drop policy if exists "Owners can remove group members" on group_members;
create policy "Owners can remove group members"
on group_members
for delete
to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1
    from groups g
    where g.id = group_members.group_id
      and g.owner_id = (select auth.uid())
  )
);

drop policy if exists "Users can view accessible projects" on projects;
create policy "Users can view accessible projects"
on projects
for select
to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1
    from group_members gm
    where gm.group_id = projects.group_id
      and gm.user_id = (select auth.uid())
  )
);

drop policy if exists "Users can insert accessible projects" on projects;
create policy "Users can insert accessible projects"
on projects
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and (
    group_id is null
    or exists (
      select 1
      from groups g
      where g.id = group_id
        and g.owner_id = (select auth.uid())
    )
  )
);

drop policy if exists "Users can update accessible projects" on projects;
create policy "Users can update accessible projects"
on projects
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "Users can delete accessible projects" on projects;
create policy "Users can delete accessible projects"
on projects
for delete
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "Members can view paper comments" on paper_comments;
create policy "Members can view paper comments"
on paper_comments
for select
to authenticated
using (
  exists (
    select 1
    from projects p
    where p.id = paper_comments.project_id
      and (
        p.user_id = (select auth.uid())
        or exists (
          select 1
          from group_members gm
          where gm.group_id = p.group_id
            and gm.user_id = (select auth.uid())
        )
      )
  )
);

drop policy if exists "Members can add paper comments" on paper_comments;
create policy "Members can add paper comments"
on paper_comments
for insert
to authenticated
with check (
  author_id = (select auth.uid())
  and exists (
    select 1
    from projects p
    where p.id = project_id
      and (
        p.user_id = (select auth.uid())
        or exists (
          select 1
          from group_members gm
          where gm.group_id = p.group_id
            and gm.user_id = (select auth.uid())
        )
      )
  )
);

drop policy if exists "Authors can update paper comments" on paper_comments;
create policy "Authors can update paper comments"
on paper_comments
for update
to authenticated
using (author_id = (select auth.uid()))
with check (author_id = (select auth.uid()));

drop policy if exists "Authors can delete paper comments" on paper_comments;
create policy "Authors can delete paper comments"
on paper_comments
for delete
to authenticated
using (author_id = (select auth.uid()));

drop policy if exists "Members can view read progress" on paper_read_progress;
create policy "Members can view read progress"
on paper_read_progress
for select
to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1
    from projects p
    join groups g on g.id = p.group_id
    where p.id = paper_read_progress.project_id
      and g.owner_id = (select auth.uid())
  )
);

drop policy if exists "Users can upsert own read progress" on paper_read_progress;
create policy "Users can upsert own read progress"
on paper_read_progress
for insert
to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "Users can update own read progress" on paper_read_progress;
create policy "Users can update own read progress"
on paper_read_progress
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "Members can view read sessions" on paper_read_sessions;
create policy "Members can view read sessions"
on paper_read_sessions
for select
to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1
    from projects p
    join groups g on g.id = p.group_id
    where p.id = paper_read_sessions.project_id
      and g.owner_id = (select auth.uid())
  )
);

drop policy if exists "Users can insert own read sessions" on paper_read_sessions;
create policy "Users can insert own read sessions"
on paper_read_sessions
for insert
to authenticated
with check (user_id = (select auth.uid()));
