-- =========================================================
-- MIGRATION : PAIEMENTS PARTIELS / OPERATION_DISBURSEMENTS (PHASE 14)
-- =========================================================

-- 1. Clé unique composite pour supporter la FK composite
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_operations_journal_project_id_id') THEN
    ALTER TABLE operations_journal ADD CONSTRAINT uq_operations_journal_project_id_id UNIQUE (project_id, id);
  END IF;
END $$;

-- 2. Création de la table operation_disbursements
CREATE TABLE IF NOT EXISTS public.operation_disbursements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id uuid NOT NULL,
  project_id uuid NOT NULL,
  disbursement_date date NOT NULL,
  amount numeric(16,2) NOT NULL CHECK (amount > 0),
  reference_piece text,
  external_reference text,
  funding_source_id uuid REFERENCES funding_sources(id),
  notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT fk_disbursement_operation_project 
    FOREIGN KEY (project_id, operation_id) 
    REFERENCES operations_journal(project_id, id) 
    ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_operation_disbursements_op ON operation_disbursements(operation_id);
CREATE INDEX IF NOT EXISTS idx_operation_disbursements_proj_date ON operation_disbursements(project_id, disbursement_date);
CREATE INDEX IF NOT EXISTS idx_operation_disbursements_ext_ref ON operation_disbursements(external_reference);

-- 3. RLS sur operation_disbursements
ALTER TABLE operation_disbursements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_disbursements_all" ON operation_disbursements;
CREATE POLICY "read_disbursements_all" ON operation_disbursements
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM project_members 
    WHERE project_members.project_id = operation_disbursements.project_id 
      AND project_members.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "write_disbursements_all" ON operation_disbursements;
CREATE POLICY "write_disbursements_all" ON operation_disbursements
FOR ALL
USING (
  fn_user_role(project_id) IN ('OWNER'::project_role, 'PROJECT_MANAGER'::project_role, 'ACCOUNTANT'::project_role)
)
WITH CHECK (
  fn_user_role(project_id) IN ('OWNER'::project_role, 'PROJECT_MANAGER'::project_role, 'ACCOUNTANT'::project_role)
);

-- 4. Backfill idempotent des opérations decaisse historiques
INSERT INTO operation_disbursements (
  operation_id,
  project_id,
  disbursement_date,
  amount,
  reference_piece,
  external_reference,
  funding_source_id,
  notes,
  created_by,
  created_at
)
SELECT 
  oj.id,
  oj.project_id,
  oj.operation_date,
  oj.actual_cost,
  'Migration initiale',
  'MIGRATION_HISTORIQUE_' || oj.id::text,
  oj.funding_source_id,
  'Backfill historique Phase 14 depuis operations_journal.actual_cost',
  oj.created_by,
  oj.created_at
FROM operations_journal oj
WHERE oj.status = 'decaisse' 
  AND oj.actual_cost IS NOT NULL 
  AND oj.actual_cost > 0 
  AND oj.operation_date IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM operation_disbursements od 
    WHERE od.external_reference = 'MIGRATION_HISTORIQUE_' || oj.id::text
  );

-- 5. RPC PostgreSQL transactionnelle avec verrouillage anti-concurrence et anti-dépassement
CREATE OR REPLACE FUNCTION fn_add_operation_disbursement(
  p_project_id uuid,
  p_operation_id uuid,
  p_disbursement_date date,
  p_amount numeric,
  p_reference_piece text DEFAULT NULL,
  p_funding_source_id uuid DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_created_by uuid DEFAULT NULL
)
RETURNS operation_disbursements
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_op record;
  v_total_paid numeric;
  v_new_disbursement operation_disbursements;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Le montant du décaissement doit être strictement positif.';
  END IF;

  IF p_disbursement_date IS NULL THEN
    RAISE EXCEPTION 'La date de décaissement est obligatoire.';
  END IF;

  -- Verrouillage de la ligne engagement pour prévenir toute race condition concurrente
  SELECT id, project_id, planned_cost, status 
  INTO v_op
  FROM operations_journal
  WHERE id = p_operation_id AND project_id = p_project_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Opération financière introuvable pour ce projet.';
  END IF;

  IF v_op.status = 'annule' THEN
    RAISE EXCEPTION 'Impossible d''enregistrer un décaissement sur une opération annulée.';
  END IF;

  -- Calcul du montant déjà décaissé
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total_paid
  FROM operation_disbursements
  WHERE operation_id = p_operation_id;

  IF (v_total_paid + p_amount) > v_op.planned_cost THEN
    RAISE EXCEPTION 'Dépassement d''engagement : le montant cumulé décaissé (%) dépasserait le coût prévu (%) de l''opération.',
      (v_total_paid + p_amount), v_op.planned_cost;
  END IF;

  -- Insertion du paiement unitaire
  INSERT INTO operation_disbursements (
    operation_id,
    project_id,
    disbursement_date,
    amount,
    reference_piece,
    funding_source_id,
    notes,
    created_by
  ) VALUES (
    p_operation_id,
    p_project_id,
    p_disbursement_date,
    p_amount,
    p_reference_piece,
    p_funding_source_id,
    p_notes,
    p_created_by
  ) RETURNING * INTO v_new_disbursement;

  -- Mise à jour synchrone de l'engagement parent
  IF (v_total_paid + p_amount) >= v_op.planned_cost THEN
    UPDATE operations_journal 
    SET status = 'decaisse',
        actual_cost = (v_total_paid + p_amount),
        operation_date = p_disbursement_date
    WHERE id = p_operation_id;
  ELSE
    UPDATE operations_journal 
    SET status = 'engage',
        actual_cost = (v_total_paid + p_amount),
        operation_date = p_disbursement_date
    WHERE id = p_operation_id;
  END IF;

  RETURN v_new_disbursement;
END;
$$;

-- 6. Mise à jour de la vue v_budget_consumption
CREATE OR REPLACE VIEW public.v_budget_consumption AS
WITH op_summary AS (
  SELECT 
    oj.id AS operation_id,
    oj.budget_line_id,
    oj.planned_cost,
    oj.status,
    COALESCE(SUM(od.amount), 0::numeric) AS total_paid
  FROM operations_journal oj
  LEFT JOIN operation_disbursements od ON od.operation_id = oj.id
  GROUP BY oj.id, oj.budget_line_id, oj.planned_cost, oj.status
),
bl_consumption AS (
  SELECT 
    budget_line_id,
    SUM(total_paid) AS total_decaisse,
    SUM(
      CASE 
        WHEN status = 'engage'::operation_status THEN GREATEST(0::numeric, planned_cost - total_paid)
        WHEN status = 'planifie'::operation_status THEN planned_cost
        ELSE 0::numeric
      END
    ) AS total_engage
  FROM op_summary
  WHERE status <> 'annule'::operation_status
  GROUP BY budget_line_id
)
SELECT 
  bl.id AS budget_line_id,
  bl.project_id,
  bl.code,
  bl.label,
  bl.initial_allocated_amount,
  COALESCE(bc.total_engage, 0::numeric) AS total_engage,
  COALESCE(bc.total_decaisse, 0::numeric) AS total_decaisse,
  bl.initial_allocated_amount - COALESCE(bc.total_engage, 0::numeric) - COALESCE(bc.total_decaisse, 0::numeric) AS solde_disponible,
  CASE
    WHEN bl.initial_allocated_amount = 0::numeric THEN 0::numeric
    ELSE (COALESCE(bc.total_engage, 0::numeric) + COALESCE(bc.total_decaisse, 0::numeric)) / bl.initial_allocated_amount
  END AS taux_consommation,
  CASE
    WHEN bl.initial_allocated_amount = 0::numeric THEN 'neutre'::text
    WHEN ((COALESCE(bc.total_engage, 0::numeric) + COALESCE(bc.total_decaisse, 0::numeric)) / bl.initial_allocated_amount) >= 1::numeric THEN 'rouge'::text
    WHEN ((COALESCE(bc.total_engage, 0::numeric) + COALESCE(bc.total_decaisse, 0::numeric)) / bl.initial_allocated_amount) >= 0.8 THEN 'orange'::text
    ELSE 'vert'::text
  END AS niveau_alerte,
  bl.responsible,
  bl.unit,
  bl.quantity,
  bl.unit_cost
FROM budget_lines bl
LEFT JOIN bl_consumption bc ON bc.budget_line_id = bl.id;
