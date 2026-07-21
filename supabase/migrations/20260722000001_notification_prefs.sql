-- Add specific notification preference columns to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS notif_email_alerts boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_email_weekly boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_push_critical boolean DEFAULT true;

-- Ensure RLS allows the user to update these new columns
-- We don't need to change RLS because it usually allows the user to UPDATE their own row, but we should make sure.
-- The existing policy usually is:
-- CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
