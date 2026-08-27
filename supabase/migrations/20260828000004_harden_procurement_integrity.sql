-- =========================================================
-- PPM : CONTRAINTES D'INTEGRITE NON DESTRUCTIVES
-- =========================================================
-- Les dates clefs doivent rester coherentes et un montant estime ne peut pas
-- etre negatif. Les statuts historiques restent volontairement inchanges.

ALTER TABLE public.procurement_plan
  ADD CONSTRAINT procurement_plan_notice_before_signature
  CHECK (
    planned_notice_date IS NULL
    OR contract_signature_date IS NULL
    OR planned_notice_date <= contract_signature_date
  );

ALTER TABLE public.procurement_plan
  ADD CONSTRAINT procurement_plan_estimated_amount_nonnegative
  CHECK (estimated_amount IS NULL OR estimated_amount >= 0);
