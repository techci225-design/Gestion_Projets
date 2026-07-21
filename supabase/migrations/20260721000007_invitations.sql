CREATE TABLE invitations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  invited_email text NOT NULL,
  invited_role project_role NOT NULL DEFAULT 'chef_projet',
  token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by uuid NOT NULL REFERENCES profiles(id),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'expired')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Lecture : membres de l'organisation
CREATE POLICY "inv_select" ON invitations FOR SELECT
USING (organization_id IN (SELECT fn_get_my_org_ids()));

-- Insert : owner et admin seulement
CREATE POLICY "inv_insert" ON invitations FOR INSERT
WITH CHECK (
  organization_id IN (SELECT fn_get_my_org_ids())
  AND fn_get_my_org_role(organization_id) IN ('owner', 'admin')
);

-- Update : système uniquement (via service_role pour acceptation)
CREATE POLICY "inv_update_system" ON invitations FOR UPDATE
USING (true);
