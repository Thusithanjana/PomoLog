create table time_entries (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null references auth.users(id) on delete cascade,
  task_label       text        not null default '',
  started_at       timestamptz not null,
  duration_seconds integer     not null,
  created_at       timestamptz not null default now(),

  constraint duration_sane check (
    duration_seconds > 0 and duration_seconds < 86400
  )
);

alter table time_entries enable row level security;

create policy "owner_select" on time_entries
  for select using (auth.uid() = user_id);

create policy "owner_insert" on time_entries
  for insert with check (auth.uid() = user_id);

create policy "owner_update" on time_entries
  for update using     (auth.uid() = user_id)
             with check (auth.uid() = user_id);

create policy "owner_delete" on time_entries
  for delete using (auth.uid() = user_id);
