-- 20260816000000_invitation_rls_invited_user.sql
-- Allow an invited user to read their own invitation

CREATE POLICY "inv_select_invited" ON invitations FOR SELECT
USING (
  invited_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);
