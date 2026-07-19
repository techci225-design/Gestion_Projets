-- Alignment migration for SaaS Multi-Tenant based on BRIEF.md

-- 1. Table organizations: add new columns requested in the brief
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS slug text UNIQUE;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS plan text DEFAULT 'trial' CHECK (plan IN ('trial','pro','institutionnel'));
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS max_projects int DEFAULT 5;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Update existing "Mon Organisation" to match the TSBC Démo requirements
UPDATE organizations 
SET slug = 'tsbc-demo', name = 'TSBC Démo', plan = 'pro', max_projects = 99 
WHERE slug IS NULL;

-- Make new columns NOT NULL as requested
ALTER TABLE organizations ALTER COLUMN slug SET NOT NULL;
ALTER TABLE organizations ALTER COLUMN plan SET NOT NULL;
ALTER TABLE organizations ALTER COLUMN max_projects SET NOT NULL;
ALTER TABLE organizations ALTER COLUMN is_active SET NOT NULL;

-- 2. Table organization_members
-- Rename org_id to organization_id as requested
ALTER TABLE organization_members RENAME COLUMN org_id TO organization_id;
-- Rename role to org_role and convert Enum to Text with check
ALTER TABLE organization_members ALTER COLUMN role TYPE text;
ALTER TABLE organization_members RENAME COLUMN role TO org_role;
ALTER TABLE organization_members ADD CONSTRAINT org_role_check CHECK (org_role IN ('owner','admin','member'));
ALTER TABLE organization_members ALTER COLUMN org_role SET DEFAULT 'member';
ALTER TABLE organization_members ADD COLUMN IF NOT EXISTS joined_at timestamptz NOT NULL DEFAULT now();

-- Update existing admins to 'owner' for the demo organization
UPDATE organization_members SET org_role = 'owner' WHERE org_role = 'admin';

-- 3. RLS Organizations
DROP POLICY IF EXISTS "lecture_organisation_membres" ON organizations;
CREATE POLICY "org_lecture_membres" ON organizations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = organizations.id AND user_id = auth.uid()
  ));

CREATE POLICY "org_modif_admin" ON organizations FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = organizations.id
    AND user_id = auth.uid()
    AND org_role IN ('owner','admin')
  ));

-- 4. RLS Projects
-- Supprimer les anciennes policies de tous types
DROP POLICY IF EXISTS "lecture_membres" ON projects;
DROP POLICY IF EXISTS "ecriture_roles_autorises" ON projects;
DROP POLICY IF EXISTS "lecture_membres_ou_createur" ON projects;
DROP POLICY IF EXISTS "update_projets" ON projects;
DROP POLICY IF EXISTS "insert_projets" ON projects;
DROP POLICY IF EXISTS "delete_projets" ON projects;
DROP POLICY IF EXISTS "lecture_projets" ON projects;

CREATE POLICY "project_lecture_org" ON projects FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "project_ecriture_org" ON projects FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND org_role IN ('owner','admin')
    )
  );

CREATE POLICY "project_update_org" ON projects FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND org_role IN ('owner','admin')
    )
  );

CREATE POLICY "project_delete_org" ON projects FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND org_role IN ('owner','admin')
    )
  );
