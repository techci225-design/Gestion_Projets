-- Fonction SECURITY DEFINER anti-récursion
CREATE OR REPLACE FUNCTION fn_get_my_org_ids()
RETURNS SETOF uuid
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $$ SELECT organization_id FROM organization_members WHERE user_id = auth.uid(); $$;

CREATE OR REPLACE FUNCTION fn_get_my_org_role(p_org_id uuid)
RETURNS text
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $$ SELECT org_role FROM organization_members WHERE organization_id = p_org_id AND user_id = auth.uid() LIMIT 1; $$;

-- Policies organizations
DROP POLICY IF EXISTS "org_insert_auth" ON organizations;
CREATE POLICY "org_insert_auth" ON organizations FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "org_select_membres" ON organizations;
CREATE POLICY "org_select_membres" ON organizations FOR SELECT USING (id IN (SELECT fn_get_my_org_ids()));
DROP POLICY IF EXISTS "org_update_admin" ON organizations;
CREATE POLICY "org_update_admin" ON organizations FOR UPDATE USING (fn_get_my_org_role(id) IN ('owner','admin'));
DROP POLICY IF EXISTS "org_delete_owner" ON organizations;
CREATE POLICY "org_delete_owner" ON organizations FOR DELETE USING (fn_get_my_org_role(id) = 'owner');

-- Policies organization_members
DROP POLICY IF EXISTS "member_self_insert" ON organization_members;
CREATE POLICY "member_self_insert" ON organization_members FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "member_select" ON organization_members;
CREATE POLICY "member_select" ON organization_members FOR SELECT USING (organization_id IN (SELECT fn_get_my_org_ids()));
DROP POLICY IF EXISTS "member_delete_owner" ON organization_members;
CREATE POLICY "member_delete_owner" ON organization_members FOR DELETE USING (fn_get_my_org_role(organization_id) = 'owner');
