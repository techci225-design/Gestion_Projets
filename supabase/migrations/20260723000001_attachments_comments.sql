-- 1. ATTACHMENTS TABLE
CREATE TABLE attachments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  related_table text NOT NULL,
  related_id uuid NOT NULL,
  file_name text NOT NULL,
  file_size int NOT NULL,
  file_type text NOT NULL,
  storage_path text NOT NULL,
  uploaded_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "att_select" ON attachments FOR SELECT
  USING (organization_id IN (SELECT fn_get_my_org_ids()));

CREATE POLICY "att_insert" ON attachments FOR INSERT
  WITH CHECK (organization_id IN (SELECT fn_get_my_org_ids()));

CREATE POLICY "att_delete" ON attachments FOR DELETE
  USING (uploaded_by = auth.uid()
    OR fn_get_my_org_role(organization_id) IN ('owner','admin'));

-- 2. COMMENTS TABLE
CREATE TABLE comments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  related_table text NOT NULL,
  related_id uuid NOT NULL,
  content text NOT NULL,
  author_id uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cmt_select" ON comments FOR SELECT
  USING (organization_id IN (SELECT fn_get_my_org_ids()));

CREATE POLICY "cmt_insert" ON comments FOR INSERT
  WITH CHECK (organization_id IN (SELECT fn_get_my_org_ids()));

CREATE POLICY "cmt_update" ON comments FOR UPDATE
  USING (author_id = auth.uid());

CREATE POLICY "cmt_delete" ON comments FOR DELETE
  USING (author_id = auth.uid()
    OR fn_get_my_org_role(organization_id) IN ('owner','admin'));

-- 3. GLOBAL SEARCH RPC
CREATE OR REPLACE FUNCTION search_global(query_text text, org_id uuid)
RETURNS TABLE (
  type text,
  title text,
  subtitle text,
  project_id uuid
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 'operation'::text as type, o.task_code::text as title, o.phase_wbs::text as subtitle, o.project_id
  FROM operations_journal o
  JOIN projects p ON o.project_id = p.id
  WHERE p.organization_id = org_id
    AND (o.task_code ILIKE '%' || query_text || '%' OR o.phase_wbs ILIKE '%' || query_text || '%')
    
  UNION ALL
  
  SELECT 'marche'::text as type, m.description::text as title, m.market_type::text as subtitle, m.project_id
  FROM procurement_plan m
  JOIN projects p ON m.project_id = p.id
  WHERE p.organization_id = org_id
    AND (m.description ILIKE '%' || query_text || '%')
    
  UNION ALL
  
  SELECT 'risque'::text as type, r.description::text as title, r.category::text as subtitle, r.project_id
  FROM risks r
  JOIN projects p ON r.project_id = p.id
  WHERE p.organization_id = org_id
    AND (r.description ILIKE '%' || query_text || '%' OR r.category ILIKE '%' || query_text || '%')
    
  UNION ALL
  
  SELECT 'tache_evm'::text as type, w.description::text as title, w.code::text as subtitle, w.project_id
  FROM wbs_tasks w
  JOIN projects p ON w.project_id = p.id
  WHERE p.organization_id = org_id
    AND (w.description ILIKE '%' || query_text || '%' OR w.code ILIKE '%' || query_text || '%')
    
  LIMIT 20;
END;
$$;
