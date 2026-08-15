-- 20260816000002_fix_project_role_regression.sql

-- ==========================================
-- 1. FIX: fn_user_role
-- Reason: It previously returned 'owner'::project_role for org admins,
-- causing 'invalid input value for enum project_role: "owner"' on any read query.
-- ==========================================
CREATE OR REPLACE FUNCTION public.fn_user_role(p_project_id uuid)
 RETURNS project_role
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_role project_role;
  v_org_role text;
begin
  -- Check if user is an organization owner/admin for this project's organization
  SELECT om.org_role INTO v_org_role
  FROM projects p
  JOIN organization_members om ON p.organization_id = om.organization_id
  WHERE p.id = p_project_id AND om.user_id = auth.uid()
  LIMIT 1;

  IF v_org_role IN ('owner', 'admin') THEN
    -- Changed from 'owner' to 'OWNER' to match the new enum value
    RETURN 'OWNER'::project_role;
  END IF;

  -- Otherwise, check project_members
  select role into v_role from project_members 
  where project_id = p_project_id and user_id = auth.uid()
  limit 1;
  
  return v_role;
end;
$function$;

-- ==========================================
-- 2. FIX: create_project_with_budget
-- Reason: Project creation wizard inserted 'owner' instead of 'OWNER'
-- ==========================================
CREATE OR REPLACE FUNCTION create_project_with_budget(payload JSONB) 
RETURNS UUID AS $$
DECLARE
  v_project_id UUID;
  v_fs_map JSONB := '{}'::jsonb;
  v_fs_elem JSONB;
  v_bl_elem JSONB;
  v_new_fs_id UUID;
  v_user_id UUID;
  v_org_id UUID;
  v_currency TEXT;
BEGIN
  v_user_id := (payload->>'user_id')::uuid;
  v_org_id := (payload->>'organization_id')::uuid;
  v_currency := COALESCE(payload->>'currency', 'XOF');

  -- 1. Insérer le projet
  INSERT INTO projects (name, code, start_date, end_date, description, created_by, organization_id, currency)
  VALUES (
    payload->>'name',
    payload->>'code',
    (payload->>'start_date')::date,
    (payload->>'end_date')::date,
    payload->>'description',
    v_user_id,
    v_org_id,
    v_currency
  ) RETURNING id INTO v_project_id;

  -- 2. Insérer le propriétaire dans project_members
  -- Changed from 'owner' to 'OWNER'
  INSERT INTO project_members (project_id, user_id, role)
  VALUES (v_project_id, v_user_id, 'OWNER');

  -- 3. Insérer les bailleurs de fonds (Funding Sources)
  FOR v_fs_elem IN SELECT * FROM jsonb_array_elements(payload->'funding_sources')
  LOOP
    INSERT INTO funding_sources (project_id, name, type, amount_committed)
    VALUES (
      v_project_id,
      v_fs_elem->>'name',
      COALESCE(v_fs_elem->>'type', 'bailleur'),
      (v_fs_elem->>'amount')::numeric
    ) RETURNING id INTO v_new_fs_id;

    -- Map old ID to new UUID
    v_fs_map := jsonb_set(v_fs_map, array[v_fs_elem->>'id'], to_jsonb(v_new_fs_id::text));
  END LOOP;

  -- 4. Insérer les lignes budgétaires
  FOR v_bl_elem IN SELECT * FROM jsonb_array_elements(payload->'budget_lines')
  LOOP
    INSERT INTO budget_lines (project_id, code, label, initial_allocated_amount, funding_source_id)
    VALUES (
      v_project_id,
      v_bl_elem->>'code',
      v_bl_elem->>'label',
      (v_bl_elem->>'amount')::numeric,
      (v_fs_map->>(v_bl_elem->>'funding_source_id'))::uuid
    );
  END LOOP;

  RETURN v_project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';
