-- Ajouter la colonne description si elle n'existe pas
ALTER TABLE projects ADD COLUMN IF NOT EXISTS description text;

-- Fonction RPC pour créer le projet et ses éléments en une seule transaction
CREATE OR REPLACE FUNCTION create_project_with_budget(payload JSONB) 
RETURNS UUID AS $$
DECLARE
  v_project_id UUID;
  v_fs_map JSONB := '{}'::jsonb;
  v_fs_elem JSONB;
  v_bl_elem JSONB;
  v_new_fs_id UUID;
  v_user_id UUID;
BEGIN
  v_user_id := (payload->>'user_id')::uuid;

  -- 1. Insérer le projet
  INSERT INTO projects (name, code, start_date, end_date, description, created_by)
  VALUES (
    payload->>'name',
    payload->>'code',
    (payload->>'start_date')::date,
    (payload->>'end_date')::date,
    payload->>'description',
    v_user_id
  ) RETURNING id INTO v_project_id;

  -- 2. Insérer le propriétaire dans project_members
  INSERT INTO project_members (project_id, user_id, role)
  VALUES (v_project_id, v_user_id, 'owner');

  -- 3. Insérer les bailleurs (funding_sources)
  FOR v_fs_elem IN SELECT * FROM jsonb_array_elements(payload->'funding_sources')
  LOOP
    INSERT INTO funding_sources (project_id, name, type, amount_committed)
    VALUES (
      v_project_id,
      v_fs_elem->>'name',
      v_fs_elem->>'type',
      (v_fs_elem->>'amount')::numeric
    ) RETURNING id INTO v_new_fs_id;
    
    -- Stocker l'association entre l'ID temporaire et le nouvel UUID
    v_fs_map := jsonb_set(v_fs_map, array[v_fs_elem->>'id'], to_jsonb(v_new_fs_id));
  END LOOP;

  -- 4. Insérer les lignes budgétaires (budget_lines)
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

  -- 5. Insérer dans l'audit_log
  INSERT INTO audit_log (project_id, user_id, action, details)
  VALUES (
    v_project_id,
    v_user_id,
    'CREATE',
    'Création du projet avec assistant (financements et budget)'
  );

  RETURN v_project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
