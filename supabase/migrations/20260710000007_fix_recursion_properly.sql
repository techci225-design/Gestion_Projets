-- 1. Fonction Security Definer pour lire les orgs d'un user sans déclencher RLS
CREATE OR REPLACE FUNCTION get_user_organizations()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM organization_members WHERE user_id = auth.uid();
$$;

-- 2. Refaire les policies proprement pour éviter l'Infinite Recursion
DROP POLICY IF EXISTS "org_lecture_membres" ON organizations;
DROP POLICY IF EXISTS "org_update_admin" ON organizations;
DROP POLICY IF EXISTS "org_delete_owner" ON organizations;
DROP POLICY IF EXISTS "org_member_select" ON organization_members;

-- Policy SELECT organizations
CREATE POLICY "org_lecture_membres" ON organizations FOR SELECT
USING (id IN (SELECT get_user_organizations()));

-- Policy SELECT organization_members
CREATE POLICY "org_member_select" ON organization_members FOR SELECT
USING (organization_id IN (SELECT get_user_organizations()));

-- Policy UPDATE organizations (owner/admin)
CREATE POLICY "org_update_admin" ON organizations FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = organizations.id
    AND user_id = auth.uid()
    AND org_role IN ('owner','admin')
  )
);

-- Policy DELETE organizations (owner)
CREATE POLICY "org_delete_owner" ON organizations FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = organizations.id
    AND user_id = auth.uid()
    AND org_role = 'owner'
  )
);
