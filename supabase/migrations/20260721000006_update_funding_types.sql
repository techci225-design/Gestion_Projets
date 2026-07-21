-- Drop old constraint if exists and add new one
DO $$
DECLARE
    const_name text;
BEGIN
    SELECT conname INTO const_name
    FROM pg_constraint
    WHERE conrelid = 'funding_sources'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%type %';

    IF const_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE funding_sources DROP CONSTRAINT ' || const_name;
    END IF;
END $$;

ALTER TABLE funding_sources ADD CONSTRAINT funding_sources_type_check CHECK (type IN ('bailleur', 'donateur', 'etat', 'contrepartie', 'autre'));

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
  INSERT INTO project_members (project_id, user_id, role)
  VALUES (v_project_id, v_user_id, 'owner');

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
$$ LANGUAGE plpgsql SECURITY DEFINER;
