-- Allow users to insert their own profile row.
-- The handle_new_user() trigger (SECURITY DEFINER) handles this on signup,
-- but if the trigger fails the user would have no profile and no way to create
-- one — this policy closes that gap.
create policy "owner_can_insert_profile" on profiles
  for insert with check (auth.uid() = user_id);
