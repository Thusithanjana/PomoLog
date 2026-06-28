-- Normalized per-task rows replacing the single JSON blob in task_logs.
-- Each task gets its own row; edits and deletes are targeted operations.
-- pomodoro_sessions is kept as JSONB because it's always loaded/saved as a unit.

create table tasks (
  id                  text        primary key,
  user_id             uuid        not null references auth.users(id) on delete cascade,
  date                date        not null,
  description         text        not null default '',
  start_iso           timestamptz not null,
  end_iso             timestamptz,
  use_pomodo          boolean     not null default false,
  focus_minutes       integer     check (focus_minutes is null or (focus_minutes > 0 and focus_minutes <= 120)),
  pomodoro_sessions   jsonb       not null default '[]',
  total_break_ms      bigint      not null default 0 check (total_break_ms >= 0),
  is_call             boolean     not null default false,
  deleted_at          timestamptz,
  updated_at          timestamptz not null default now(),
  created_at          timestamptz not null default now(),

  constraint pomodoro_sessions_must_be_array check (jsonb_typeof(pomodoro_sessions) = 'array')
);

alter table tasks enable row level security;

create policy "owner_all" on tasks
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index tasks_user_date on tasks (user_id, date) where deleted_at is null;
