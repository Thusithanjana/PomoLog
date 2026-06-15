-- ── 1. Nickname per group membership ─────────────────────────────────────────
alter table group_members
  add column nickname text check (char_length(nickname) <= 50);

-- ── 2. Updated RPCs that accept an optional nickname ──────────────────────────

create or replace function create_group(p_name text, p_nickname text default null)
returns groups language plpgsql security definer
set search_path = public as $$
declare v_group groups;
begin
  insert into groups (name, owner_id)
  values (p_name, auth.uid())
  returning * into v_group;

  insert into group_members (group_id, user_id, role, nickname)
  values (v_group.id, auth.uid(), 'owner', nullif(trim(coalesce(p_nickname, '')), ''));

  return v_group;
end; $$;

create or replace function join_group_by_invite_code(p_invite_code text, p_nickname text default null)
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

  insert into group_members (group_id, user_id, role, nickname)
  values (v_group_id, auth.uid(), 'member', nullif(trim(coalesce(p_nickname, '')), ''))
  returning * into v_member;

  return v_member;
end; $$;

-- ── 3. Personal reporting RPCs ────────────────────────────────────────────────
-- All use auth.uid() implicitly — callers can only ever query their own data.

create function personal_weekly_summary()
returns table (week_start date, total_seconds bigint, entry_count int)
language sql security definer stable set search_path = public as $$
  select
    date_trunc('week', started_at)::date as week_start,
    sum(duration_seconds)::bigint        as total_seconds,
    count(*)::int                        as entry_count
  from time_entries
  where user_id = auth.uid()
    and started_at >= now() - interval '12 weeks'
  group by 1
  order by 1;
$$;

create function personal_monthly_summary()
returns table (month_start date, total_seconds bigint, entry_count int)
language sql security definer stable set search_path = public as $$
  select
    date_trunc('month', started_at)::date as month_start,
    sum(duration_seconds)::bigint         as total_seconds,
    count(*)::int                         as entry_count
  from time_entries
  where user_id = auth.uid()
    and started_at >= now() - interval '12 months'
  group by 1
  order by 1;
$$;

-- Consecutive-day streak ending today or yesterday.
create function personal_current_streak()
returns int language sql security definer stable set search_path = public as $$
  with daily as (
    select distinct started_at::date as d
    from time_entries
    where user_id = auth.uid()
  ),
  with_gaps as (
    select d,
           d - (row_number() over (order by d))::int as grp
    from daily
  ),
  streaks as (
    select max(d) as last_day, count(*)::int as len
    from with_gaps
    group by grp
  )
  select coalesce(
    (select len from streaks
     where last_day >= current_date - 1
     order by last_day desc
     limit 1),
    0
  );
$$;

create function personal_top_tasks(p_limit int default 10)
returns table (task_label text, total_seconds bigint, entry_count int)
language sql security definer stable set search_path = public as $$
  select
    task_label,
    sum(duration_seconds)::bigint as total_seconds,
    count(*)::int                 as entry_count
  from time_entries
  where user_id = auth.uid()
  group by task_label
  order by total_seconds desc
  limit p_limit;
$$;

-- ── 4. Group reporting RPCs ───────────────────────────────────────────────────
-- Callers must be a member of the group (checked inside via is_group_member).

create function group_leaderboard(p_group_id uuid)
returns table (user_id uuid, nickname text, total_seconds bigint, entry_count int)
language sql security definer stable set search_path = public as $$
  select
    te.user_id,
    coalesce(nullif(gm.nickname, ''), p.display_name, left(te.user_id::text, 8)) as nickname,
    sum(te.duration_seconds)::bigint as total_seconds,
    count(*)::int                    as entry_count
  from time_entries te
  join group_members gm on gm.group_id = te.group_id and gm.user_id = te.user_id
  left join profiles p  on p.user_id = te.user_id
  where te.group_id = p_group_id
    and is_group_member(p_group_id, auth.uid())
    and te.started_at >= date_trunc('week', now())
  group by te.user_id, gm.nickname, p.display_name
  order by total_seconds desc;
$$;

create function group_task_breakdown(p_group_id uuid)
returns table (task_label text, total_seconds bigint, contributor_count int)
language sql security definer stable set search_path = public as $$
  select
    task_label,
    sum(duration_seconds)::bigint  as total_seconds,
    count(distinct user_id)::int   as contributor_count
  from time_entries
  where group_id = p_group_id
    and is_group_member(p_group_id, auth.uid())
    and started_at >= date_trunc('week', now())
  group by task_label
  order by total_seconds desc;
$$;
