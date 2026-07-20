-- Supprimer les policies existantes
DROP POLICY IF EXISTS "org_insert_owner" ON organizations;
DROP POLICY IF EXISTS "org_modif_admin" ON organizations;
DROP POLICY IF EXISTS "lecture_organisation_membres" ON organizations;
DROP POLICY IF EXISTS "org_lecture_membres" ON organizations;

-- Nouvelle policy INSERT : tout utilisateur authentifié peut créer
CREATE POLICY "org_creation_libre" ON organizations
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Policy SELECT : uniquement les membres
CREATE POLICY "org_lecture_membres" ON organizations FOR SELECT
USING (EXISTS (
  SELECT 1 FROM organization_members
  WHERE organization_id = organizations.id
  AND user_id = auth.uid()
));

-- Policy UPDATE : uniquement owner ou admin de l'organisation
CREATE POLICY "org_update_admin" ON organizations FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM organization_members
  WHERE organization_id = organizations.id
  AND user_id = auth.uid()
  AND org_role IN ('owner','admin')
));

-- Policy DELETE : uniquement owner
CREATE POLICY "org_delete_owner" ON organizations FOR DELETE
USING (EXISTS (
  SELECT 1 FROM organization_members
  WHERE organization_id = organizations.id
  AND user_id = auth.uid()
  AND org_role = 'owner'
));

-- Policy organization_members INSERT : l'utilisateur s'ajoute lui-même
DROP POLICY IF EXISTS "org_member_insert" ON organization_members;
CREATE POLICY "org_member_self_insert" ON organization_members
FOR INSERT WITH CHECK (user_id = auth.uid());

-- Policy organization_members SELECT
DROP POLICY IF EXISTS "org_member_select" ON organization_members;
CREATE POLICY "org_member_select" ON organization_members
FOR SELECT USING (
  organization_id IN (
    SELECT organization_id FROM organization_members om2
    WHERE om2.user_id = auth.uid()
  )
);
