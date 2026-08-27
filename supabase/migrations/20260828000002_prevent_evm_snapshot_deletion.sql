-- Official EVM snapshots are append-only records. Notes remain the only editable field.

CREATE OR REPLACE FUNCTION public.fn_trg_evm_snapshots_immutability()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Un arrêté officiel EVM ne peut pas être supprimé.';
  END IF;

  IF (NEW.id <> OLD.id) OR
     (NEW.project_id <> OLD.project_id) OR
     (NEW.control_date <> OLD.control_date) OR
     (NEW.baseline_id IS DISTINCT FROM OLD.baseline_id) OR
     (NEW.bac_total IS DISTINCT FROM OLD.bac_total) OR
     (NEW.pv_total IS DISTINCT FROM OLD.pv_total) OR
     (NEW.ev_total IS DISTINCT FROM OLD.ev_total) OR
     (NEW.ac_total IS DISTINCT FROM OLD.ac_total) OR
     (NEW.cpi_global IS DISTINCT FROM OLD.cpi_global) OR
     (NEW.spi_global IS DISTINCT FROM OLD.spi_global) OR
     (NEW.eac_global IS DISTINCT FROM OLD.eac_global) OR
     (NEW.created_by IS DISTINCT FROM OLD.created_by) OR
     (NEW.created_at IS DISTINCT FROM OLD.created_at) THEN
    RAISE EXCEPTION 'Les métriques et références d’un arrêté officiel EVM sont strictement immuables. Seul le champ notes peut être modifié.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_evm_snapshots_immutability ON public.evm_snapshots;

CREATE TRIGGER trg_evm_snapshots_immutability
BEFORE UPDATE OR DELETE ON public.evm_snapshots
FOR EACH ROW
EXECUTE FUNCTION public.fn_trg_evm_snapshots_immutability();

REVOKE DELETE ON TABLE public.evm_snapshots FROM anon, authenticated;
