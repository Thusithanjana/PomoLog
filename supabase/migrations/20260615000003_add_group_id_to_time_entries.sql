alter table time_entries
  add column group_id uuid references groups(id) on delete set null;

-- The existing owner_select policy only allows users to read their own entries.
-- Replace it so group members can also read entries tagged with their group.
drop policy "owner_select" on time_entries;

create policy "owner_or_group_member_can_read" on time_entries
  for select using (
    user_id = auth.uid()
    or (group_id is not null and is_group_member(group_id, auth.uid()))
  );

-- INSERT / UPDATE / DELETE remain owner-only — existing policies unchanged.
