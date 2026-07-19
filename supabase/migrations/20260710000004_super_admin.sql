-- Add Super Admin flag to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_super_admin boolean NOT NULL DEFAULT false;

-- Allow super admins to view all organizations
CREATE POLICY "super_admin_org_select" ON organizations
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND is_super_admin = true
  )
);

-- Allow super admins to view all organization members
CREATE POLICY "super_admin_org_members_select" ON organization_members
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND is_super_admin = true
  )
);

-- Allow super admins to view all projects
CREATE POLICY "super_admin_projects_select" ON projects
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND is_super_admin = true
  )
);

-- Note: The user should manually set is_super_admin to true on their Demo User account.
