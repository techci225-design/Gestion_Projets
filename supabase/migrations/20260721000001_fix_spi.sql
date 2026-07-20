CREATE OR REPLACE VIEW v_evm_project_summary AS
SELECT
  project_id,
  SUM(budget_allocated) AS bac_total,
  SUM(pv)              AS pv_total,
  SUM(ev)              AS ev_total,
  SUM(actual_cost)     AS ac_total,
  CASE WHEN SUM(actual_cost) = 0 THEN 1.0
       ELSE ROUND((SUM(ev) / NULLIF(SUM(actual_cost), 0))::numeric, 4)
  END AS cpi_global,
  CASE WHEN SUM(pv) = 0 THEN 1.0
       ELSE ROUND((SUM(ev) / NULLIF(SUM(pv), 0))::numeric, 4)
  END AS spi_global,
  CASE WHEN SUM(actual_cost) = 0 THEN SUM(budget_allocated)
       ELSE ROUND((SUM(budget_allocated)
            / NULLIF(SUM(ev) / NULLIF(SUM(actual_cost),0), 0))::numeric, 2)
  END AS eac_global
FROM v_evm_tasks
GROUP BY project_id;

CREATE OR REPLACE VIEW v_evm_indicators AS
SELECT
  *,
  ev - actual_cost AS cv,
  ev - pv AS sv,
  CASE WHEN actual_cost = 0 THEN 1.0 ELSE ROUND((ev / NULLIF(actual_cost, 0))::numeric, 4) END AS cpi,
  CASE WHEN pv = 0 THEN 1.0 ELSE ROUND((ev / NULLIF(pv, 0))::numeric, 4) END AS spi,
  CASE WHEN actual_cost = 0 THEN budget_allocated
       ELSE ROUND((budget_allocated / NULLIF((ev / NULLIF(actual_cost, 0)), 0))::numeric, 2)
  END AS eac
FROM v_evm_tasks;
