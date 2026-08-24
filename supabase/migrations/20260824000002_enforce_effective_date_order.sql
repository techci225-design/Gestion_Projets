-- =========================================================
-- MIGRATION : ORDRE CHRONOLOGIQUE DES DATES D'EFFET (PHASE 8)
-- =========================================================

CREATE OR REPLACE FUNCTION fn_trg_evm_baselines_immutability()
RETURNS TRIGGER AS $$
DECLARE
  v_prev_effective_date DATE;
  v_prev_version INTEGER;
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
    -- Cas 1: Transition vers APPROVED (Vérification de l'ordre temporel des dates d'effet)
    IF NEW.status = 'APPROVED' AND (OLD.status IS NULL OR OLD.status <> 'APPROVED') THEN
      IF NEW.effective_date IS NULL THEN
        RAISE EXCEPTION 'Une date d''effet contractuelle valide est obligatoire pour approuver une baseline.';
      END IF;

      -- Récupérer la dernière baseline approuvée ou archivée
      SELECT effective_date, version_number INTO v_prev_effective_date, v_prev_version
      FROM evm_baselines
      WHERE project_id = NEW.project_id
        AND status = 'SUPERSEDED'
        AND id <> NEW.id
      ORDER BY effective_date DESC, version_number DESC
      LIMIT 1;

      IF v_prev_effective_date IS NOT NULL AND NEW.effective_date <= v_prev_effective_date THEN
        RAISE EXCEPTION 'La date d''effet contractuelle (%) doit être strictement supérieure à celle de la version archivée V% (%).',
          NEW.effective_date, v_prev_version, v_prev_effective_date;
      END IF;
    END IF;

    -- Cas 2: Baseline déjà APPROVED ou SUPERSEDED
    IF OLD.status IN ('APPROVED', 'SUPERSEDED') THEN
      -- Seule transition autorisée : APPROVED -> SUPERSEDED (lors d'un rebaselining)
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
          RAISE EXCEPTION 'Une baseline approuvée ne peut pas être altérée lors de son archivage.';
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
