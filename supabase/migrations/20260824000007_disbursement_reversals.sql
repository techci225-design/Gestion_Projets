-- =========================================================
-- MIGRATION : CONTRE-PASSATIONS FINANCIÈRES APPEND-ONLY (PHASE 16B)
-- =========================================================

-- 1. Ajout des colonnes de contre-passation sur operation_disbursements
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'operation_disbursements' AND column_name = 'entry_type'
  ) THEN
    ALTER TABLE operation_disbursements 
      ADD COLUMN entry_type text NOT NULL DEFAULT 'PAYMENT',
      ADD COLUMN reversal_of_id uuid,
      ADD COLUMN reversal_reason text;
  END IF;
END $$;

-- Contraintes d'intégrité conditionnelle
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_disbursement_entry_type') THEN
    ALTER TABLE operation_disbursements 
      ADD CONSTRAINT chk_disbursement_entry_type 
      CHECK (entry_type IN ('PAYMENT', 'REVERSAL'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_disbursement_reversal_valid') THEN
    ALTER TABLE operation_disbursements 
      ADD CONSTRAINT chk_disbursement_reversal_valid 
      CHECK (
        (entry_type = 'PAYMENT' AND reversal_of_id IS NULL) OR
        (entry_type = 'REVERSAL' AND reversal_of_id IS NOT NULL AND reversal_reason IS NOT NULL AND length(trim(reversal_reason)) > 0)
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_disbursement_reversal_no_bank_tx') THEN
    ALTER TABLE operation_disbursements 
      ADD CONSTRAINT chk_disbursement_reversal_no_bank_tx 
      CHECK (
        entry_type = 'PAYMENT' OR 
        (entry_type = 'REVERSAL' AND bank_transaction_id IS NULL)
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_disbursement_reversal_of') THEN
    ALTER TABLE operation_disbursements 
      ADD CONSTRAINT fk_disbursement_reversal_of 
      FOREIGN KEY (reversal_of_id) 
      REFERENCES operation_disbursements(id) 
      ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_operation_disbursements_reversal_of ON operation_disbursements(reversal_of_id);
CREATE INDEX IF NOT EXISTS idx_operation_disbursements_entry_type ON operation_disbursements(entry_type);

-- 2. Trigger d'immutabilité stricte sur operation_disbursements
CREATE OR REPLACE FUNCTION fn_trg_disbursements_immutability()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.id <> NEW.id 
     OR OLD.project_id <> NEW.project_id 
     OR OLD.operation_id <> NEW.operation_id 
     OR OLD.entry_type <> NEW.entry_type 
     OR OLD.reversal_of_id IS DISTINCT FROM NEW.reversal_of_id 
     OR OLD.amount <> NEW.amount 
     OR OLD.disbursement_date <> NEW.disbursement_date 
     OR OLD.bank_transaction_id IS DISTINCT FROM NEW.bank_transaction_id 
     OR OLD.created_by IS DISTINCT FROM NEW.created_by 
     OR OLD.created_at <> NEW.created_at 
     OR OLD.reversal_reason IS DISTINCT FROM NEW.reversal_reason THEN
    RAISE EXCEPTION 'IMMUTABLE_DISBURSEMENT: Les enregistrements de décaissement et contre-passation sont strictement immuables.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_disbursements_immutability ON operation_disbursements;
CREATE TRIGGER trg_disbursements_immutability
BEFORE UPDATE ON operation_disbursements
FOR EACH ROW
EXECUTE FUNCTION fn_trg_disbursements_immutability();

-- 3. Séparation RLS : Interdiction formelle du DELETE direct
DROP POLICY IF EXISTS "write_disbursements_all" ON operation_disbursements;
DROP POLICY IF EXISTS "insert_disbursements_all" ON operation_disbursements;

CREATE POLICY "insert_disbursements_all" ON operation_disbursements
FOR INSERT
WITH CHECK (
  fn_user_role(project_id) IN ('OWNER'::project_role, 'PROJECT_MANAGER'::project_role, 'ACCOUNTANT'::project_role)
);

-- 4. Vue v_budget_consumption adaptée aux contre-passations (Net décaissé)
DROP VIEW IF EXISTS public.v_budget_consumption CASCADE;

CREATE VIEW public.v_budget_consumption AS
WITH op_summary AS (
  SELECT 
    oj.id AS operation_id,
    oj.budget_line_id,
    oj.planned_cost,
    oj.status,
    COALESCE(SUM(
      CASE 
        WHEN od.entry_type = 'REVERSAL' THEN -od.amount 
        ELSE od.amount 
      END
    ), 0::numeric) AS net_paid
  FROM operations_journal oj
  LEFT JOIN operation_disbursements od ON od.operation_id = oj.id
  GROUP BY oj.id, oj.budget_line_id, oj.planned_cost, oj.status
),
bl_consumption AS (
  SELECT 
    budget_line_id,
    SUM(net_paid) AS total_decaisse,
    SUM(
      CASE 
        WHEN status = 'engage'::operation_status THEN GREATEST(0::numeric, planned_cost - net_paid)
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
  (bl.initial_allocated_amount - COALESCE(bc.total_engage, 0::numeric) - COALESCE(bc.total_decaisse, 0::numeric)) AS solde_disponible
FROM budget_lines bl
LEFT JOIN bl_consumption bc ON bc.budget_line_id = bl.id;

-- 5. Vue v_bank_transactions adaptée aux contre-passations
DROP VIEW IF EXISTS public.v_bank_transactions CASCADE;

CREATE VIEW public.v_bank_transactions AS
WITH tx_payments AS (
  SELECT 
    bt.id AS bank_transaction_id,
    COALESCE(SUM(
      p.amount - COALESCE(rev.total_reversed, 0::numeric)
    ), 0::numeric) AS net_matched_amount
  FROM bank_transactions bt
  LEFT JOIN operation_disbursements p 
    ON p.bank_transaction_id = bt.id AND p.entry_type = 'PAYMENT'
  LEFT JOIN (
    SELECT reversal_of_id, SUM(amount) AS total_reversed
    FROM operation_disbursements
    WHERE entry_type = 'REVERSAL'
    GROUP BY reversal_of_id
  ) rev ON rev.reversal_of_id = p.id
  GROUP BY bt.id
)
SELECT 
  bt.id,
  bt.bank_import_id,
  bt.project_id,
  bt.source_row_index,
  bt.transaction_date,
  bt.value_date,
  bt.description,
  bt.bank_reference,
  bt.debit_amount,
  bt.credit_amount,
  bt.currency,
  bt.fingerprint,
  bt.created_at,
  tp.net_matched_amount AS matched_amount,
  GREATEST(0::numeric, bt.debit_amount - tp.net_matched_amount) AS remaining_amount,
  CASE 
    WHEN bt.debit_amount = 0::numeric THEN 'CREDIT_IGNORED'::text
    WHEN tp.net_matched_amount = 0::numeric THEN 'UNMATCHED'::text
    WHEN tp.net_matched_amount >= bt.debit_amount THEN 'MATCHED'::text
    ELSE 'PARTIALLY_MATCHED'::text
  END AS match_status
FROM bank_transactions bt
JOIN tx_payments tp ON tp.bank_transaction_id = bt.id;

-- 6. RPC atomique de création de contre-passation (fn_create_disbursement_reversal)
CREATE OR REPLACE FUNCTION fn_create_disbursement_reversal(
  p_project_id uuid,
  p_payment_id uuid,
  p_amount numeric,
  p_reason text,
  p_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_orig_payment operation_disbursements;
  v_op operations_journal;
  v_already_reversed numeric;
  v_new_net_paid numeric;
  v_reversal_id uuid;
  v_server_today date := CURRENT_DATE;
BEGIN
  -- 1. Validations d'entrée
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Le montant de contre-passation doit être strictement positif.';
  END IF;

  IF p_reason IS NULL OR length(trim(p_reason)) < 3 THEN
    RAISE EXCEPTION 'Un motif explicite de contre-passation est obligatoire (min 3 caractères).';
  END IF;

  -- 2. Verrouillage du paiement original
  SELECT *
  INTO v_orig_payment
  FROM operation_disbursements
  WHERE id = p_payment_id AND project_id = p_project_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Paiement original introuvable pour ce projet.';
  END IF;

  IF v_orig_payment.entry_type <> 'PAYMENT' THEN
    RAISE EXCEPTION 'INVALID_REVERSAL_TARGET: Une contre-passation ne peut cibler qu''un paiement original (PAYMENT).';
  END IF;

  -- 3. Calcul du montant déjà contre-passé sur ce paiement
  SELECT COALESCE(SUM(amount), 0)
  INTO v_already_reversed
  FROM operation_disbursements
  WHERE reversal_of_id = p_payment_id AND entry_type = 'REVERSAL';

  IF (v_already_reversed + p_amount) > v_orig_payment.amount THEN
    RAISE EXCEPTION 'REVERSAL_EXCEEDS_PAYMENT: Le montant cumulé contre-passé (%) dépasserait le montant du paiement original (%).',
      (v_already_reversed + p_amount), v_orig_payment.amount;
  END IF;

  -- 4. Verrouillage de l'engagement parent
  SELECT *
  INTO v_op
  FROM operations_journal
  WHERE id = v_orig_payment.operation_id AND project_id = p_project_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Engagement financier parent introuvable.';
  END IF;

  -- 5. Insertion de l'écriture de contre-passation (REVERSAL)
  INSERT INTO operation_disbursements (
    operation_id,
    project_id,
    bank_transaction_id,
    entry_type,
    reversal_of_id,
    disbursement_date,
    amount,
    reference_piece,
    external_reference,
    reversal_reason,
    notes,
    created_by
  ) VALUES (
    v_orig_payment.operation_id,
    p_project_id,
    NULL, -- Jamais de bank_transaction directe sur le reversal
    'REVERSAL',
    p_payment_id,
    v_server_today,
    p_amount,
    'CONTRE-PASSATION / ' || COALESCE(v_orig_payment.reference_piece, 'N/A'),
    'REV_' || p_payment_id::text,
    trim(p_reason),
    'Contre-passation du paiement ' || p_payment_id::text || ' : ' || trim(p_reason),
    p_user_id
  ) RETURNING id INTO v_reversal_id;

  -- 6. Calcul du nouveau montant net payé sur l'engagement
  SELECT COALESCE(SUM(
    CASE WHEN entry_type = 'REVERSAL' THEN -amount ELSE amount END
  ), 0)
  INTO v_new_net_paid
  FROM operation_disbursements
  WHERE operation_id = v_orig_payment.operation_id;

  -- 7. Synchronisation du statut parent legacy
  IF v_new_net_paid >= v_op.planned_cost THEN
    UPDATE operations_journal
    SET status = 'decaisse',
        actual_cost = v_new_net_paid,
        operation_date = v_server_today
    WHERE id = v_orig_payment.operation_id;
  ELSE
    UPDATE operations_journal
    SET status = 'engage',
        actual_cost = GREATEST(0, v_new_net_paid),
        operation_date = v_server_today
    WHERE id = v_orig_payment.operation_id;
  END IF;

  -- 8. Audit trail
  BEGIN
    INSERT INTO audit_log (
      project_id,
      user_id,
      action,
      entity_type,
      entity_id,
      new_values
    ) VALUES (
      p_project_id,
      p_user_id,
      'DISBURSEMENT_REVERSED',
      'operation_disbursements',
      v_reversal_id,
      jsonb_build_object(
        'payment_id', p_payment_id,
        'amount', p_amount,
        'reason', trim(p_reason),
        'disbursement_date', v_server_today,
        'operation_id', v_orig_payment.operation_id
      )
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'reversal_id', v_reversal_id,
    'payment_id', p_payment_id,
    'reversed_amount', p_amount,
    'total_reversed_on_payment', v_already_reversed + p_amount,
    'new_net_paid_on_operation', v_new_net_paid
  );
END;
$$;

-- 9. Mise à jour de fn_add_operation_disbursement pour compter le net_paid avec reversals
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
  v_net_paid numeric;
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

  -- Calcul du montant net déjà décaissé
  SELECT COALESCE(SUM(
    CASE WHEN entry_type = 'REVERSAL' THEN -amount ELSE amount END
  ), 0)
  INTO v_net_paid
  FROM operation_disbursements
  WHERE operation_id = p_operation_id;

  -- Vérification anti-dépassement strict
  IF (v_net_paid + p_amount) > v_op.planned_cost THEN
    RAISE EXCEPTION 'Dépassement d''engagement : le montant cumulé décaissé (%) dépasserait le coût prévu (%) de l''opération.',
      (v_net_paid + p_amount), v_op.planned_cost;
  END IF;

  -- Insertion du décaissement
  INSERT INTO operation_disbursements (
    operation_id,
    project_id,
    disbursement_date,
    amount,
    entry_type,
    reference_piece,
    funding_source_id,
    notes,
    created_by
  ) VALUES (
    p_operation_id,
    p_project_id,
    p_disbursement_date,
    p_amount,
    'PAYMENT',
    p_reference_piece,
    p_funding_source_id,
    p_notes,
    p_created_by
  )
  RETURNING * INTO v_new_disbursement;

  -- Mise à jour synchrone de l'engagement parent
  IF (v_net_paid + p_amount) >= v_op.planned_cost THEN
    UPDATE operations_journal 
    SET status = 'decaisse',
        actual_cost = (v_net_paid + p_amount),
        operation_date = p_disbursement_date
    WHERE id = p_operation_id;
  ELSE
    UPDATE operations_journal 
    SET status = 'engage',
        actual_cost = (v_net_paid + p_amount),
        operation_date = p_disbursement_date
    WHERE id = p_operation_id;
  END IF;

  RETURN v_new_disbursement;
END;
$$;
