-- Optimistic locking: each save increments version.
-- saveRemote checks version before updating to prevent last-write-wins overwrites.
alter table task_logs add column if not exists version integer not null default 0;
