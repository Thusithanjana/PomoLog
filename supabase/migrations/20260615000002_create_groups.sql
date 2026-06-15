-- ── Profiles (display names shown in group dashboards) ──────────────────────
create table profiles (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  created_at   timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "profiles_readable_by_all" on profiles
  for select using (true);

create policy "owner_can_update_profile" on profiles
  for update using     (auth.uid() = user_id)
             with check (auth.uid() = user_id);

-- Auto-populate display_name from email prefix on signup.
create function handle_new_user()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  insert into profiles (user_id, display_name)
  values (new.id, split_part(new.email, '@', 1));
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ── group_role enum ───────────────────────────────────────────────────────────
create type group_role as enum ('owner', 'admin', 'member');

-- ── groups ────────────────────────────────────────────────────────────────────
create table groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  owner_id    uuid not null references auth.users(id) on delete cascade,
  invite_code text not null unique default encode(gen_random_bytes(6), 'hex'),
  created_at  timestamptz not null default now()
);

-- ── group_members ─────────────────────────────────────────────────────────────
create table group_members (
  group_id  uuid       not null references groups(id)     on delete cascade,
  user_id   uuid       not null references auth.users(id) on delete cascade,
  role      group_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

-- ── Security-definer helpers ──────────────────────────────────────────────────
--
-- A policy on group_members cannot subquery group_members directly — Postgres
-- evaluates the policy for every row in that inner query, which re-triggers the
-- policy → infinite recursion. SECURITY DEFINER runs as the function owner
-- (postgres), bypassing RLS inside the body. set search_path = public closes
-- the search-path injection vector present on all privileged functions.

create function is_group_member(p_group_id uuid, p_user_id uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from group_members
    where group_id = p_group_id and user_id = p_user_id
  );
$$;

create function is_group_owner_or_admin(p_group_id uuid, p_user_id uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from group_members
    where group_id = p_group_id
      and user_id = p_user_id
      and role in ('owner', 'admin')
  );
$$;

-- ── RPCs — the only path to INSERT into groups / group_members ────────────────
--
-- No INSERT policy is added to either table. All inserts go through these
-- security-definer functions, which validate the call before writing.

create function create_group(p_name text)
returns groups language plpgsql security definer
set search_path = public as $$
declare v_group groups;
begin
  insert into groups (name, owner_id)
  values (p_name, auth.uid())
  returning * into v_group;

  insert into group_members (group_id, user_id, role)
  values (v_group.id, auth.uid(), 'owner');

  return v_group;
end; $$;

create function join_group_by_invite_code(p_invite_code text)
returns group_members language plpgsql security definer
set search_path = public as $$
declare
  v_group_id uuid;
  v_member   group_members;
begin
  select id into v_group_id from groups where invite_code = p_invite_code;
  if v_group_id is null then raise exception 'Invalid invite code'; end if;

  if is_group_member(v_group_id, auth.uid()) then
    raise exception 'Already a member of this group';
  end if;

  insert into group_members (group_id, user_id, role)
  values (v_group_id, auth.uid(), 'member')
  returning * into v_member;

  return v_member;
end; $$;

-- ── RLS: groups ───────────────────────────────────────────────────────────────
alter table groups enable row level security;

create policy "members_can_read_groups" on groups
  for select using (owner_id = auth.uid() or is_group_member(id, auth.uid()));

create policy "owner_admin_can_update_groups" on groups
  for update using     (is_group_owner_or_admin(id, auth.uid()))
             with check (is_group_owner_or_admin(id, auth.uid()));

create policy "owner_can_delete_groups" on groups
  for delete using (owner_id = auth.uid());

-- ── RLS: group_members ────────────────────────────────────────────────────────
alter table group_members enable row level security;

create policy "members_can_read_group_members" on group_members
  for select using (is_group_member(group_id, auth.uid()));

create policy "owner_admin_can_update_roles" on group_members
  for update using     (is_group_owner_or_admin(group_id, auth.uid()))
             with check (is_group_owner_or_admin(group_id, auth.uid()));

create policy "owner_admin_or_self_can_delete" on group_members
  for delete using (
    user_id = auth.uid() or is_group_owner_or_admin(group_id, auth.uid())
  );
