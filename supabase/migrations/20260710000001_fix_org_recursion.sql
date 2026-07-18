-- Fix infinite recursion on organization_members
DROP POLICY IF EXISTS "lecture_membres_org" ON organization_members;

CREATE POLICY "lecture_propres_adhesions" ON organization_members
FOR SELECT USING (
  user_id = auth.uid()
);
