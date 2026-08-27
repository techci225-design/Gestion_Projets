-- Empêche les appels RPC directs de contourner les contrôles applicatifs.
-- Les implémentations transactionnelles existantes sont conservées, mais ne
-- deviennent accessibles qu'à travers des façades qui contrôlent auth.uid().

CREATE OR REPLACE FUNCTION public.fn_require_financial_write(p_project_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_role project_role;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED: Authentification requise.';
  END IF;

  SELECT role
  INTO v_role
  FROM project_members
  WHERE project_id = p_project_id
    AND user_id = auth.uid();

  IF v_role IS NULL OR v_role NOT IN (
    'OWNER'::project_role,
    'PROJECT_MANAGER'::project_role,
    'ACCOUNTANT'::project_role
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN: Droits financiers insuffisants pour ce projet.';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_require_financial_write(uuid) FROM PUBLIC, anon, authenticated;

-- Renommage des implémentations existantes afin de préserver leur logique
-- transactionnelle et leurs verrouillages sans les exposer via PostgREST.
ALTER FUNCTION public.fn_add_operation_disbursement(uuid, uuid, date, numeric, text, uuid, text, uuid)
  RENAME TO fn_add_operation_disbursement_internal;
ALTER FUNCTION public.fn_create_disbursement_reversal(uuid, uuid, numeric, text, uuid)
  RENAME TO fn_create_disbursement_reversal_internal;
ALTER FUNCTION public.fn_reconcile_bank_transaction(uuid, uuid, jsonb, uuid)
  RENAME TO fn_reconcile_bank_transaction_internal;

REVOKE ALL ON FUNCTION public.fn_add_operation_disbursement_internal(uuid, uuid, date, numeric, text, uuid, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_create_disbursement_reversal_internal(uuid, uuid, numeric, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_reconcile_bank_transaction_internal(uuid, uuid, jsonb, uuid) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.fn_add_operation_disbursement(
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
  v_disbursement operation_disbursements;
BEGIN
  PERFORM public.fn_require_financial_write(p_project_id);

  SELECT public.fn_add_operation_disbursement_internal(
    p_project_id,
    p_operation_id,
    p_disbursement_date,
    p_amount,
    p_reference_piece,
    p_funding_source_id,
    p_notes,
    auth.uid()
  ) INTO v_disbursement;

  RETURN v_disbursement;
END;
$$;

CREATE FUNCTION public.fn_create_disbursement_reversal(
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
BEGIN
  PERFORM public.fn_require_financial_write(p_project_id);

  RETURN public.fn_create_disbursement_reversal_internal(
    p_project_id,
    p_payment_id,
    p_amount,
    p_reason,
    auth.uid()
  );
END;
$$;

CREATE FUNCTION public.fn_reconcile_bank_transaction(
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
BEGIN
  PERFORM public.fn_require_financial_write(p_project_id);

  RETURN public.fn_reconcile_bank_transaction_internal(
    p_project_id,
    p_bank_transaction_id,
    p_splits,
    auth.uid()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_add_operation_disbursement(uuid, uuid, date, numeric, text, uuid, text, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.fn_create_disbursement_reversal(uuid, uuid, numeric, text, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.fn_reconcile_bank_transaction(uuid, uuid, jsonb, uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.fn_add_operation_disbursement(uuid, uuid, date, numeric, text, uuid, text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_create_disbursement_reversal(uuid, uuid, numeric, text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_reconcile_bank_transaction(uuid, uuid, jsonb, uuid) TO authenticated, service_role;
