-- Synthèse globale projet (équivalent onglet Dashboard)
CREATE OR REPLACE VIEW v_evm_project_summary AS
SELECT
  project_id,
  sum(budget_allocated) as bac_total,
  sum(pv) as pv_total,
  sum(ev) as ev_total,
  sum(actual_cost) as ac_total,
  CASE WHEN sum(actual_cost) = 0 THEN 1.0 ELSE sum(ev) / NULLIF(sum(actual_cost), 0) END as cpi_global,
  CASE WHEN sum(pv) = 0 THEN 1.0 ELSE sum(ev) / NULLIF(sum(pv), 0) END as spi_global,
  CASE WHEN sum(actual_cost) = 0 THEN sum(budget_allocated)
       ELSE sum(budget_allocated) / NULLIF((CASE WHEN sum(actual_cost)=0 THEN 1.0 ELSE sum(ev)/NULLIF(sum(actual_cost), 0) END), 0)
  END as eac_global
FROM v_evm_tasks
GROUP BY project_id;

CREATE OR REPLACE VIEW v_evm_indicators AS
SELECT
  *,
  ev - actual_cost as cv,
  ev - pv as sv,
  CASE WHEN actual_cost = 0 THEN 1.0 ELSE ev / NULLIF(actual_cost, 0) END as cpi,
  CASE WHEN pv = 0 THEN 1.0 ELSE ev / NULLIF(pv, 0) END as spi,
  CASE WHEN actual_cost = 0 THEN budget_allocated
       ELSE budget_allocated / NULLIF((CASE WHEN actual_cost = 0 THEN 1.0 ELSE ev / NULLIF(actual_cost, 0) END), 0)
  END as eac
FROM v_evm_tasks;
