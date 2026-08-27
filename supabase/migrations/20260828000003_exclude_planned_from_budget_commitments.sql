-- =========================================================
-- BUDGET : PLANIFIE N'EST PAS UN ENGAGEMENT JURIDIQUE
-- =========================================================
-- Les operations planifiees restent des previsions. Elles ne doivent pas
-- reduire le solde disponible ni augmenter total_engage dans la vue budget.
-- Les paiements et contre-passations restent calcules en net.

CREATE OR REPLACE VIEW public.v_budget_consumption AS
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
  (
    bl.initial_allocated_amount
    - COALESCE(bc.total_engage, 0::numeric)
    - COALESCE(bc.total_decaisse, 0::numeric)
  ) AS solde_disponible
FROM budget_lines bl
LEFT JOIN bl_consumption bc ON bc.budget_line_id = bl.id;
