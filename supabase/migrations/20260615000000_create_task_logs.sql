-- Task logs: one row per user per calendar day.
-- The tasks column stores the full task array as JSONB (matching the
-- existing localStorage shape: id, description, startISO, endISO,
-- usePomodo, pomodoroSessions, totalBreakTime, etc.).

create table task_logs (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null references auth.users (id) on delete cascade,
  date             date        not null,
  tasks            jsonb       not null default '[]',
  running_id       text,
  running_call_id  text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  unique (user_id, date),
  constraint tasks_must_be_array check (jsonb_typeof(tasks) = 'array')
);

-- Row-level security: users may only read/write their own rows.
alter table task_logs enable row level security;

create policy "owner_all" on task_logs
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
