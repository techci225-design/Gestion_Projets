-- Migration Additive : Consolidation des liens WBS, PTBA et Budget

-- 1. Ajout de budget_line_id à ptba_activities pour lier le PTBA au budget
ALTER TABLE ptba_activities
ADD COLUMN IF NOT EXISTS budget_line_id UUID REFERENCES budget_lines(id) ON DELETE SET NULL;

-- 2. Ajout de wbs_task_id à operations_journal pour consolider le lien avec la tâche
ALTER TABLE operations_journal
ADD COLUMN IF NOT EXISTS wbs_task_id UUID REFERENCES wbs_tasks(id) ON DELETE SET NULL;

-- 3. Index pour optimiser les requêtes (facultatif mais recommandé)
CREATE INDEX IF NOT EXISTS idx_ptba_activities_budget_line_id ON ptba_activities(budget_line_id);
CREATE INDEX IF NOT EXISTS idx_operations_journal_wbs_task_id ON operations_journal(wbs_task_id);
