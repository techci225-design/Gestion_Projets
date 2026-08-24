-- =========================================================
-- MIGRATION : FONDATION DE LA BASELINE EVM VERSIONNÉE (PHASE 6)
-- =========================================================

-- 1. Table evm_baselines
CREATE TABLE IF NOT EXISTS evm_baselines (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  version_number  INTEGER NOT NULL CHECK (version_number > 0),
  name            TEXT NOT NULL,
  description     TEXT,
  status          TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'APPROVED', 'SUPERSEDED')),
  effective_date  DATE,
  approved_at     TIMESTAMPTZ,
  approved_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  total_bac       NUMERIC(16,2) NOT NULL DEFAULT 0 CHECK (total_bac >= 0),
  start_date      DATE,
  end_date        DATE,
  created_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_evm_baselines_project_version UNIQUE (project_id, version_number)
);

-- 2. Table evm_baseline_items
CREATE TABLE IF NOT EXISTS evm_baseline_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baseline_id         UUID NOT NULL REFERENCES evm_baselines(id) ON DELETE CASCADE,
  wbs_task_id         UUID REFERENCES wbs_tasks(id) ON DELETE SET NULL,
  wbs_code_snapshot   TEXT NOT NULL,
  wbs_name_snapshot   TEXT NOT NULL,
  planned_start       DATE NOT NULL,
  planned_end         DATE NOT NULL,
  planned_bac         NUMERIC(16,2) NOT NULL DEFAULT 0 CHECK (planned_bac >= 0),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_baseline_item_dates CHECK (planned_end >= planned_start)
);

-- Index unique sur (baseline_id, wbs_task_id) uniquement quand wbs_task_id n'est pas NULL
CREATE UNIQUE INDEX IF NOT EXISTS uq_baseline_items_task ON evm_baseline_items(baseline_id, wbs_task_id) WHERE wbs_task_id IS NOT NULL;

-- 3. Ajout de baseline_id sur evm_snapshots
ALTER TABLE evm_snapshots 
  ADD COLUMN IF NOT EXISTS baseline_id UUID REFERENCES evm_baselines(id) ON DELETE SET NULL;

-- 4. Triggers d'immutabilité
CREATE OR REPLACE FUNCTION fn_trg_evm_baselines_immutability()
RETURNS TRIGGER AS $$
BEGIN
  -- Empêcher la suppression d'une baseline APPROVED ou SUPERSEDED
  IF TG_OP = 'DELETE' THEN
    IF OLD.status IN ('APPROVED', 'SUPERSEDED') THEN
      RAISE EXCEPTION 'Impossible de supprimer une baseline approuvée ou archivée.';
    END IF;
    RETURN OLD;
  END IF;

  -- Contrôler les mises à jour
  IF TG_OP = 'UPDATE' THEN
    IF OLD.status IN ('APPROVED', 'SUPERSEDED') THEN
      -- Seule transition autorisée : APPROVED -> SUPERSEDED (lors d'un rebaselining vers une nouvelle version)
      IF OLD.status = 'APPROVED' AND NEW.status = 'SUPERSEDED' THEN
        -- Vérifier qu'aucun autre champ critique n'a été altéré
        IF NEW.id <> OLD.id OR 
           NEW.project_id <> OLD.project_id OR 
           NEW.version_number <> OLD.version_number OR 
           NEW.total_bac <> OLD.total_bac OR 
           NEW.start_date <> OLD.start_date OR 
           NEW.end_date <> OLD.end_date OR 
           NEW.effective_date <> OLD.effective_date OR 
           NEW.approved_at <> OLD.approved_at OR 
           NEW.approved_by <> OLD.approved_by THEN
          RAISE EXCEPTION 'Une baseline approuvée ne peut pas être modifiée lors de son archivage.';
        END IF;
        RETURN NEW;
      ELSE
        RAISE EXCEPTION 'Une baseline approuvée ou archivée est strictement immutable.';
      END IF;
    END IF;
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_evm_baselines_immutability ON evm_baselines;
CREATE TRIGGER trg_evm_baselines_immutability
  BEFORE UPDATE OR DELETE ON evm_baselines
  FOR EACH ROW
  EXECUTE FUNCTION fn_trg_evm_baselines_immutability();

CREATE OR REPLACE FUNCTION fn_trg_evm_baseline_items_immutability()
RETURNS TRIGGER AS $$
DECLARE
  v_status TEXT;
  v_baseline_id UUID;
BEGIN
  v_baseline_id := COALESCE(NEW.baseline_id, OLD.baseline_id);
  SELECT status INTO v_status FROM evm_baselines WHERE id = v_baseline_id;

  IF v_status IN ('APPROVED', 'SUPERSEDED') THEN
    RAISE EXCEPTION 'Les éléments d''une baseline approuvée ou archivée ne peuvent pas être modifiés ou supprimés.';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_evm_baseline_items_immutability ON evm_baseline_items;
CREATE TRIGGER trg_evm_baseline_items_immutability
  BEFORE INSERT OR UPDATE OR DELETE ON evm_baseline_items
  FOR EACH ROW
  EXECUTE FUNCTION fn_trg_evm_baseline_items_immutability();

-- 5. Trigger d'audit
DROP TRIGGER IF EXISTS trg_audit_evm_baselines ON evm_baselines;
CREATE TRIGGER trg_audit_evm_baselines
  AFTER INSERT OR UPDATE OR DELETE ON evm_baselines
  FOR EACH ROW
  EXECUTE FUNCTION trg_audit_log();

-- 6. Row Level Security (RLS)
ALTER TABLE evm_baselines ENABLE ROW LEVEL SECURITY;
ALTER TABLE evm_baseline_items ENABLE ROW LEVEL SECURITY;

-- Lecture : tous les membres du projet
DROP POLICY IF EXISTS "read_evm_baselines" ON evm_baselines;
CREATE POLICY "read_evm_baselines" ON evm_baselines
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM project_members 
      WHERE project_members.project_id = evm_baselines.project_id 
        AND project_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "read_evm_baseline_items" ON evm_baseline_items;
CREATE POLICY "read_evm_baseline_items" ON evm_baseline_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM evm_baselines b
      JOIN project_members pm ON pm.project_id = b.project_id
      WHERE b.id = evm_baseline_items.baseline_id 
        AND pm.user_id = auth.uid()
    )
  );

-- Écriture DRAFT : OWNER et PROJECT_MANAGER
DROP POLICY IF EXISTS "write_evm_baselines_pm" ON evm_baselines;
CREATE POLICY "write_evm_baselines_pm" ON evm_baselines
  FOR ALL USING (
    fn_user_role(project_id) IN ('OWNER', 'PROJECT_MANAGER')
  );

DROP POLICY IF EXISTS "write_evm_baseline_items_pm" ON evm_baseline_items;
CREATE POLICY "write_evm_baseline_items_pm" ON evm_baseline_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM evm_baselines b
      WHERE b.id = evm_baseline_items.baseline_id
        AND fn_user_role(b.project_id) IN ('OWNER', 'PROJECT_MANAGER')
    )
  );
