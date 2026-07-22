ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_code_key;
ALTER TABLE projects ADD CONSTRAINT projects_org_code_key UNIQUE (organization_id, code);
