CREATE TABLE ai_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  analysis_type text NOT NULL,
  input_hash text NOT NULL,
  result jsonb NOT NULL,
  model text NOT NULL DEFAULT 'claude-3-5-sonnet-20240620',
  tokens_used int,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ai_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_select" ON ai_analyses FOR SELECT
  USING (project_id IN (
    SELECT id FROM projects
    WHERE organization_id IN (SELECT fn_get_my_org_ids())
  ));
