-- =========================================================
-- MIGRATION : INVARIANT BASELINE APPROUVÉE UNIQUE (PHASE 7)
-- =========================================================

-- Garantir au niveau PostgreSQL qu'un projet ne peut avoir qu'UNE SEULE baseline au statut APPROVED à tout moment.
CREATE UNIQUE INDEX IF NOT EXISTS uq_evm_baselines_single_approved 
  ON evm_baselines(project_id) 
  WHERE status = 'APPROVED';
