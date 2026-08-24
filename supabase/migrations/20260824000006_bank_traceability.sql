-- =========================================================
-- MIGRATION : TRAÇABILITÉ BANCAIRE & IDEMPOTENCE (PHASE 15B)
-- =========================================================

-- 1. Table des imports de relevés bancaires
CREATE TABLE IF NOT EXISTS public.bank_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_hash text NOT NULL,
  account_reference text,
  statement_start_date date,
  statement_end_date date,
  currency text NOT NULL DEFAULT 'XOF',
  total_rows integer NOT NULL DEFAULT 0,
  imported_by uuid REFERENCES profiles(id),
  imported_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT uq_bank_imports_project_file UNIQUE (project_id, file_hash),
  CONSTRAINT uq_bank_imports_project_id UNIQUE (project_id, id)
);

CREATE INDEX IF NOT EXISTS idx_bank_imports_project ON bank_imports(project_id, imported_at DESC);

-- 2. Table des transactions bancaires
CREATE TABLE IF NOT EXISTS public.bank_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_import_id uuid NOT NULL,
  project_id uuid NOT NULL,
  source_row_index integer,
  transaction_date date NOT NULL,
  value_date date,
  description text NOT NULL,
  bank_reference text,
  debit_amount numeric(16,2) NOT NULL DEFAULT 0 CHECK (debit_amount >= 0),
  credit_amount numeric(16,2) NOT NULL DEFAULT 0 CHECK (credit_amount >= 0),
  currency text NOT NULL,
  fingerprint text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT chk_bank_tx_single_direction CHECK (
    (debit_amount > 0 AND credit_amount = 0) OR 
    (credit_amount > 0 AND debit_amount = 0)
  ),
  CONSTRAINT fk_bank_tx_import_project 
    FOREIGN KEY (project_id, bank_import_id) 
    REFERENCES bank_imports(project_id, id) 
    ON DELETE CASCADE,
  CONSTRAINT uq_bank_transactions_project_id UNIQUE (project_id, id)
);

CREATE INDEX IF NOT EXISTS idx_bank_tx_proj_fingerprint ON bank_transactions(project_id, fingerprint);
CREATE INDEX IF NOT EXISTS idx_bank_tx_import ON bank_transactions(bank_import_id);
CREATE INDEX IF NOT EXISTS idx_bank_tx_date ON bank_transactions(project_id, transaction_date);

-- 3. Ajout de la liaison bank_transaction_id sur operation_disbursements
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'operation_disbursements' AND column_name = 'bank_transaction_id'
  ) THEN
    ALTER TABLE operation_disbursements ADD COLUMN bank_transaction_id uuid;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_disbursement_bank_tx') THEN
    ALTER TABLE operation_disbursements 
      ADD CONSTRAINT fk_disbursement_bank_tx 
      FOREIGN KEY (project_id, bank_transaction_id) 
      REFERENCES bank_transactions(project_id, id) 
      ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_operation_disbursements_bank_tx ON operation_disbursements(bank_transaction_id);

-- 4. Vue dérivée des transactions bancaires avec état de rapprochement
CREATE OR REPLACE VIEW public.v_bank_transactions AS
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
  COALESCE(SUM(od.amount), 0::numeric) AS matched_amount,
  GREATEST(0::numeric, bt.debit_amount - COALESCE(SUM(od.amount), 0::numeric)) AS remaining_amount,
  CASE 
    WHEN bt.debit_amount = 0::numeric THEN 'CREDIT_IGNORED'::text
    WHEN COALESCE(SUM(od.amount), 0::numeric) = 0::numeric THEN 'UNMATCHED'::text
    WHEN COALESCE(SUM(od.amount), 0::numeric) >= bt.debit_amount THEN 'MATCHED'::text
    ELSE 'PARTIALLY_MATCHED'::text
  END AS match_status
FROM bank_transactions bt
LEFT JOIN operation_disbursements od ON od.bank_transaction_id = bt.id
GROUP BY bt.id;

-- 5. RLS sur bank_imports et bank_transactions
ALTER TABLE bank_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_bank_imports_all" ON bank_imports;
CREATE POLICY "read_bank_imports_all" ON bank_imports
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM project_members 
    WHERE project_members.project_id = bank_imports.project_id 
      AND project_members.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "write_bank_imports_all" ON bank_imports;
CREATE POLICY "write_bank_imports_all" ON bank_imports
FOR ALL
USING (
  fn_user_role(project_id) IN ('OWNER'::project_role, 'PROJECT_MANAGER'::project_role, 'ACCOUNTANT'::project_role)
)
WITH CHECK (
  fn_user_role(project_id) IN ('OWNER'::project_role, 'PROJECT_MANAGER'::project_role, 'ACCOUNTANT'::project_role)
);

DROP POLICY IF EXISTS "read_bank_transactions_all" ON bank_transactions;
CREATE POLICY "read_bank_transactions_all" ON bank_transactions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM project_members 
    WHERE project_members.project_id = bank_transactions.project_id 
      AND project_members.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "write_bank_transactions_all" ON bank_transactions;
CREATE POLICY "write_bank_transactions_all" ON bank_transactions
FOR ALL
USING (
  fn_user_role(project_id) IN ('OWNER'::project_role, 'PROJECT_MANAGER'::project_role, 'ACCOUNTANT'::project_role)
)
WITH CHECK (
  fn_user_role(project_id) IN ('OWNER'::project_role, 'PROJECT_MANAGER'::project_role, 'ACCOUNTANT'::project_role)
);

-- 6. RPC PostgreSQL transactionnelle atomique pour le rapprochement multi-split
CREATE OR REPLACE FUNCTION fn_reconcile_bank_transaction(
  p_project_id uuid,
  p_bank_transaction_id uuid,
  p_splits jsonb,
  p_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_bt record;
  v_proj_currency text;
  v_matched_amount numeric;
  v_total_split_amount numeric := 0;
  v_split record;
  v_op record;
  v_op_paid numeric;
  v_disb_ids uuid[] := '{}';
  v_created_disb operation_disbursements;
BEGIN
  -- 1. Vérifier la devise du projet
  SELECT currency INTO v_proj_currency FROM projects WHERE id = p_project_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Projet introuvable (ID: %)', p_project_id;
  END IF;

  -- 2. Verrouiller la transaction bancaire
  SELECT id, project_id, transaction_date, debit_amount, credit_amount, currency, bank_reference, description
  INTO v_bt
  FROM bank_transactions
  WHERE id = p_bank_transaction_id AND project_id = p_project_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction bancaire introuvable pour ce projet.';
  END IF;

  IF v_bt.currency <> v_proj_currency THEN
    RAISE EXCEPTION 'BANK_CURRENCY_MISMATCH: La devise du relevé (%) ne correspond pas à la devise du projet (%).',
      v_bt.currency, v_proj_currency;
  END IF;

  IF v_bt.debit_amount <= 0 THEN
    RAISE EXCEPTION 'Seuls les débits bancaires peuvent être rapprochés d''engagements financiers.';
  END IF;

  -- 3. Calculer le montant déjà rapproché sur cette transaction
  SELECT COALESCE(SUM(amount), 0)
  INTO v_matched_amount
  FROM operation_disbursements
  WHERE bank_transaction_id = p_bank_transaction_id;

  -- 4. Calculer la somme des splits demandés
  FOR v_split IN SELECT * FROM jsonb_to_recordset(p_splits) AS x(operation_id uuid, amount numeric, notes text)
  LOOP
    IF v_split.amount <= 0 THEN
      RAISE EXCEPTION 'Chaque split doit avoir un montant strictement positif.';
    END IF;
    v_total_split_amount := v_total_split_amount + v_split.amount;
  END LOOP;

  IF (v_matched_amount + v_total_split_amount) > v_bt.debit_amount THEN
    RAISE EXCEPTION 'Dépassement transaction bancaire : le montant total rapproché (%) dépasserait le débit bancaire (%).',
      (v_matched_amount + v_total_split_amount), v_bt.debit_amount;
  END IF;

  -- 5. Exécuter chaque split avec verrouillage déterministe (tri par operation_id pour éviter tout deadlock)
  FOR v_split IN 
    SELECT * 
    FROM jsonb_to_recordset(p_splits) AS x(operation_id uuid, amount numeric, notes text)
    ORDER BY operation_id
  LOOP
    -- Verrouiller l'engagement parent
    SELECT id, project_id, planned_cost, status
    INTO v_op
    FROM operations_journal
    WHERE id = v_split.operation_id AND project_id = p_project_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Opération financière introuvable (%) pour ce projet.', v_split.operation_id;
    END IF;

    IF v_op.status = 'annule' THEN
      RAISE EXCEPTION 'Impossible de rapprocher un paiement sur une opération annulée (%).', v_split.operation_id;
    END IF;

    -- Calcul du montant déjà décaissé sur l'engagement
    SELECT COALESCE(SUM(amount), 0)
    INTO v_op_paid
    FROM operation_disbursements
    WHERE operation_id = v_split.operation_id;

    IF (v_op_paid + v_split.amount) > v_op.planned_cost THEN
      RAISE EXCEPTION 'Dépassement engagement : le montant décaissé (%) dépasserait le coût prévu (%) de l''opération.',
        (v_op_paid + v_split.amount), v_op.planned_cost;
    END IF;

    -- Insertion du décaissement unitaire lié
    INSERT INTO operation_disbursements (
      operation_id,
      project_id,
      bank_transaction_id,
      disbursement_date,
      amount,
      reference_piece,
      external_reference,
      notes,
      created_by
    ) VALUES (
      v_split.operation_id,
      p_project_id,
      p_bank_transaction_id,
      v_bt.transaction_date,
      v_split.amount,
      COALESCE(v_bt.bank_reference, 'Rapprochement bancaire'),
      'BANK_TX_' || p_bank_transaction_id::text,
      COALESCE(v_split.notes, v_bt.description),
      p_user_id
    ) RETURNING * INTO v_created_disb;

    v_disb_ids := array_append(v_disb_ids, v_created_disb.id);

    -- Mise à jour miroir de operations_journal
    IF (v_op_paid + v_split.amount) >= v_op.planned_cost THEN
      UPDATE operations_journal 
      SET status = 'decaisse',
          actual_cost = (v_op_paid + v_split.amount),
          operation_date = v_bt.transaction_date
      WHERE id = v_split.operation_id;
    ELSE
      UPDATE operations_journal 
      SET status = 'engage',
          actual_cost = (v_op_paid + v_split.amount),
          operation_date = v_bt.transaction_date
      WHERE id = v_split.operation_id;
    END IF;
  END LOOP;

  -- 6. Enregistrement dans audit_log si disponible
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
      'BANK_TRANSACTION_RECONCILED',
      'bank_transactions',
      p_bank_transaction_id,
      jsonb_build_object(
        'matched_amount', v_matched_amount + v_total_split_amount,
        'debit_amount', v_bt.debit_amount,
        'disbursements_created', v_disb_ids
      )
    );
  EXCEPTION WHEN OTHERS THEN
    -- Silently ignore audit_log failure if schema varies
    NULL;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'bank_transaction_id', p_bank_transaction_id,
    'total_matched', v_matched_amount + v_total_split_amount,
    'disbursements_count', array_length(v_disb_ids, 1)
  );
END;
$$;
