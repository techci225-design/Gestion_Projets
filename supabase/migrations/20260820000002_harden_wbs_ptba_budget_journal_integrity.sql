-- Migration pour durcir l'intégrité inter-projets (ÉTAPE 14)

-- 1. Préparer les contraintes UNIQUE nécessaires sur les tables référencées
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wbs_tasks_project_id_id_key') THEN
        ALTER TABLE wbs_tasks ADD CONSTRAINT wbs_tasks_project_id_id_key UNIQUE (project_id, id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'budget_lines_project_id_id_key') THEN
        ALTER TABLE budget_lines ADD CONSTRAINT budget_lines_project_id_id_key UNIQUE (project_id, id);
    END IF;
END $$;

-- 2. Remplacer les FK simples par des FK composites sur ptba_activities
DO $$ 
BEGIN
    -- Suppression de la contrainte FK sur wbs_task_id
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ptba_activities_wbs_task_id_fkey') THEN
        ALTER TABLE ptba_activities DROP CONSTRAINT ptba_activities_wbs_task_id_fkey;
    END IF;
    
    -- Ajout de la contrainte composite (project_id, wbs_task_id) -> wbs_tasks(project_id, id)
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ptba_project_wbs') THEN
        ALTER TABLE ptba_activities 
        ADD CONSTRAINT fk_ptba_project_wbs 
        FOREIGN KEY (project_id, wbs_task_id) 
        REFERENCES wbs_tasks(project_id, id) 
        ON DELETE RESTRICT;
    END IF;

    -- Suppression de la contrainte FK sur budget_line_id
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ptba_activities_budget_line_id_fkey') THEN
        ALTER TABLE ptba_activities DROP CONSTRAINT ptba_activities_budget_line_id_fkey;
    END IF;

    -- Ajout de la contrainte composite (project_id, budget_line_id) -> budget_lines(project_id, id)
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ptba_project_budget') THEN
        ALTER TABLE ptba_activities 
        ADD CONSTRAINT fk_ptba_project_budget 
        FOREIGN KEY (project_id, budget_line_id) 
        REFERENCES budget_lines(project_id, id) 
        ON DELETE RESTRICT;
    END IF;
END $$;

-- 3. Remplacer les FK simples par des FK composites sur operations_journal
DO $$ 
BEGIN
    -- Suppression de la contrainte FK sur wbs_task_id
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'operations_journal_wbs_task_id_fkey') THEN
        ALTER TABLE operations_journal DROP CONSTRAINT operations_journal_wbs_task_id_fkey;
    END IF;

    -- Ajout de la contrainte composite (project_id, wbs_task_id) -> wbs_tasks(project_id, id)
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_journal_project_wbs') THEN
        ALTER TABLE operations_journal 
        ADD CONSTRAINT fk_journal_project_wbs 
        FOREIGN KEY (project_id, wbs_task_id) 
        REFERENCES wbs_tasks(project_id, id) 
        ON DELETE RESTRICT;
    END IF;
END $$;
