-- 20260816000001_project_roles_update.sql

-- 1. Rename existing enum values (Supported in PostgreSQL 10+)
-- This automatically migrates all existing rows without needing UPDATE statements!
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'owner' AND enumtypid = 'project_role'::regtype) AND
       NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'OWNER' AND enumtypid = 'project_role'::regtype) THEN
        ALTER TYPE project_role RENAME VALUE 'owner' TO 'OWNER';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'chef_projet' AND enumtypid = 'project_role'::regtype) AND
       NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'PROJECT_MANAGER' AND enumtypid = 'project_role'::regtype) THEN
        ALTER TYPE project_role RENAME VALUE 'chef_projet' TO 'PROJECT_MANAGER';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'comptable' AND enumtypid = 'project_role'::regtype) AND
       NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'ACCOUNTANT' AND enumtypid = 'project_role'::regtype) THEN
        ALTER TYPE project_role RENAME VALUE 'comptable' TO 'ACCOUNTANT';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'consultant' AND enumtypid = 'project_role'::regtype) AND
       NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'CONSULTANT' AND enumtypid = 'project_role'::regtype) THEN
        ALTER TYPE project_role RENAME VALUE 'consultant' TO 'CONSULTANT';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'bailleur_lecture' AND enumtypid = 'project_role'::regtype) AND
       NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'FUNDER_READONLY' AND enumtypid = 'project_role'::regtype) THEN
        ALTER TYPE project_role RENAME VALUE 'bailleur_lecture' TO 'FUNDER_READONLY';
    END IF;
END $$;

-- 3. Update RLS policies to use new values
DROP POLICY IF EXISTS "write_logframe_all" ON logframe_items;
CREATE POLICY "write_logframe_all" ON logframe_items FOR ALL USING (fn_user_role(project_id) IN ('OWNER', 'PROJECT_MANAGER'));

DROP POLICY IF EXISTS "write_ptba_all" ON ptba_activities;
CREATE POLICY "write_ptba_all" ON ptba_activities FOR ALL USING (fn_user_role(project_id) IN ('OWNER', 'PROJECT_MANAGER', 'CONSULTANT'));

DROP POLICY IF EXISTS "write_budget_lines_all" ON budget_lines;
CREATE POLICY "write_budget_lines_all" ON budget_lines FOR ALL USING (fn_user_role(project_id) IN ('OWNER', 'ACCOUNTANT'));

DROP POLICY IF EXISTS "write_operations_all" ON operations_journal;
CREATE POLICY "write_operations_all" ON operations_journal FOR ALL USING (fn_user_role(project_id) IN ('OWNER', 'ACCOUNTANT'));

DROP POLICY IF EXISTS "write_wbs_tasks_all" ON wbs_tasks;
CREATE POLICY "write_wbs_tasks_all" ON wbs_tasks FOR ALL USING (fn_user_role(project_id) IN ('OWNER', 'PROJECT_MANAGER', 'CONSULTANT'));

DROP POLICY IF EXISTS "write_procurement_all" ON procurement_plan;
CREATE POLICY "write_procurement_all" ON procurement_plan FOR ALL USING (fn_user_role(project_id) IN ('OWNER', 'PROJECT_MANAGER'));

DROP POLICY IF EXISTS "write_risks_all" ON risks;
CREATE POLICY "write_risks_all" ON risks FOR ALL USING (fn_user_role(project_id) IN ('OWNER', 'PROJECT_MANAGER', 'CONSULTANT'));

DROP POLICY IF EXISTS "write_attachments_all" ON attachments;
CREATE POLICY "write_attachments_all" ON attachments FOR ALL USING (fn_user_role(project_id) IN ('OWNER', 'PROJECT_MANAGER', 'ACCOUNTANT', 'CONSULTANT'));

DROP POLICY IF EXISTS "write_projects_all" ON projects;
CREATE POLICY "write_projects_all" ON projects FOR ALL USING (fn_user_role(id) IN ('OWNER'));

DROP POLICY IF EXISTS "write_members_all" ON project_members;
CREATE POLICY "write_members_all" ON project_members FOR ALL USING (fn_user_role(project_id) IN ('OWNER'));

DROP POLICY IF EXISTS "write_funding_all" ON funding_sources;
CREATE POLICY "write_funding_all" ON funding_sources FOR ALL USING (fn_user_role(project_id) IN ('OWNER', 'ACCOUNTANT'));

DROP POLICY IF EXISTS "read_audit" ON audit_log;
CREATE POLICY "read_audit" ON audit_log FOR SELECT USING (fn_user_role(project_id) IN ('OWNER', 'PROJECT_MANAGER'));

-- 4. Transfer ownership function
CREATE OR REPLACE FUNCTION transfer_project_ownership(p_project_id uuid, p_new_owner_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_user_id uuid;
    v_current_user_role project_role;
    v_new_owner_role project_role;
BEGIN
    v_current_user_id := auth.uid();
    
    -- 1. Row-level lock on the project to serialize concurrent executions
    -- This prevents race conditions if two requests try to transfer ownership simultaneously.
    PERFORM 1 FROM projects WHERE id = p_project_id FOR UPDATE;
    
    -- 2. Check current user is OWNER
    SELECT role INTO v_current_user_role FROM project_members 
    WHERE project_id = p_project_id AND user_id = v_current_user_id;
    
    IF v_current_user_role IS NULL OR v_current_user_role != 'OWNER' THEN
        RAISE EXCEPTION 'Not authorized. Must be OWNER.';
    END IF;

    -- 3. Check new owner exists in project and is not already OWNER
    SELECT role INTO v_new_owner_role FROM project_members 
    WHERE project_id = p_project_id AND user_id = p_new_owner_id;

    IF v_new_owner_role IS NULL THEN
        RAISE EXCEPTION 'Target user is not a member of this project.';
    END IF;

    IF v_new_owner_role = 'OWNER' THEN
        RAISE EXCEPTION 'Target user is already an OWNER.';
    END IF;

    -- 4. Atomic swap (Safe from race conditions due to project lock)
    -- Demote all existing owners to PROJECT_MANAGER
    UPDATE project_members 
    SET role = 'PROJECT_MANAGER' 
    WHERE project_id = p_project_id AND role = 'OWNER';

    -- Promote new owner
    UPDATE project_members 
    SET role = 'OWNER' 
    WHERE project_id = p_project_id AND user_id = p_new_owner_id;

END;
$$;

-- 5. Guarantee uniqueness of OWNER at the database schema level
-- Prevents any bug or race condition from ever resulting in 2 OWNERs.
CREATE UNIQUE INDEX IF NOT EXISTS project_single_owner_idx 
ON project_members (project_id) 
WHERE role = 'OWNER';
