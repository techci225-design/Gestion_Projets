-- =========================================================
-- MIGRATION : CORRECTION DES P0 DU JOURNAL (PHASE 12)
-- =========================================================

-- 1. Aligner la RLS sur la matrice des rôles métier (OWNER, PROJECT_MANAGER, ACCOUNTANT)
DROP POLICY IF EXISTS "write_operations_all" ON operations_journal;

CREATE POLICY "write_operations_all" ON operations_journal
FOR ALL
USING (
  fn_user_role(project_id) IN ('OWNER'::project_role, 'PROJECT_MANAGER'::project_role, 'ACCOUNTANT'::project_role)
);

-- 2. Invariant Décaissé : actual_cost > 0 et operation_date NOT NULL lorsque status = 'decaisse'
ALTER TABLE operations_journal
DROP CONSTRAINT IF EXISTS chk_journal_decaisse_valid;

ALTER TABLE operations_journal
ADD CONSTRAINT chk_journal_decaisse_valid
CHECK (
  status <> 'decaisse'::operation_status
  OR (actual_cost IS NOT NULL AND actual_cost > 0 AND operation_date IS NOT NULL)
);
