-- 1. Create Organization Schema
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Organization Role Enum
CREATE TYPE org_role AS ENUM ('admin', 'member');

CREATE TABLE organization_members (
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role org_role NOT NULL DEFAULT 'member',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (org_id, user_id)
);

-- 2. Update Projects Table
ALTER TABLE projects ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- 3. Migration of Existing Data
DO $$
DECLARE
    default_org_id UUID;
    prof RECORD;
BEGIN
    -- Create default organization
    INSERT INTO organizations (name) VALUES ('Mon Organisation') RETURNING id INTO default_org_id;

    -- Update all existing projects to belong to this organization
    UPDATE projects SET organization_id = default_org_id WHERE organization_id IS NULL;

    -- Add all existing users to this organization as admins (to ensure no one loses access)
    FOR prof IN SELECT id FROM profiles LOOP
        INSERT INTO organization_members (org_id, user_id, role) 
        VALUES (default_org_id, prof.id, 'admin') 
        ON CONFLICT DO NOTHING;
    END LOOP;
END $$;

-- Make organization_id NOT NULL after migrating existing data
ALTER TABLE projects ALTER COLUMN organization_id SET NOT NULL;

-- 4. Set up RLS for Organizations
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- Policies for organizations
CREATE POLICY "lecture_organisation_membres" ON organizations
FOR SELECT USING (
  id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid())
);

-- Policies for organization_members
CREATE POLICY "lecture_membres_org" ON organization_members
FOR SELECT USING (
  org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid())
);

-- 5. Update RLS for Projects
-- We must drop the existing policy and recreate it to include organization admins
-- Note: Policy names must exactly match what exists to be dropped, 
-- but let's drop the common known ones or just create a new one that grants additional access.
-- Actually, the existing policy is "lecture_membres_ou_createur". Let's recreate it.
DROP POLICY IF EXISTS "lecture_membres_ou_createur" ON projects;
DROP POLICY IF EXISTS "lecture_projets" ON projects; -- sometimes named this way

CREATE POLICY "lecture_membres_ou_createur" ON projects
FOR SELECT USING (
  created_by = auth.uid() 
  OR id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
  OR organization_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid() AND role = 'admin')
);

-- Enable organization admins to insert/update projects
DROP POLICY IF EXISTS "update_projets" ON projects;
CREATE POLICY "update_projets" ON projects
FOR UPDATE USING (
  created_by = auth.uid()
  OR organization_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "insert_projets" ON projects;
CREATE POLICY "insert_projets" ON projects
FOR INSERT WITH CHECK (
  organization_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid())
);

-- Also allow org admins to delete projects
DROP POLICY IF EXISTS "delete_projets" ON projects;
CREATE POLICY "delete_projets" ON projects
FOR DELETE USING (
  created_by = auth.uid()
  OR organization_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid() AND role = 'admin')
);
