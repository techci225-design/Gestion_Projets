-- Matrice de consommation par ligne budgétaire (équivalent SOMME.SI.ENS)
create or replace view v_budget_consumption as
select
  bl.id as budget_line_id,
  bl.project_id,
  bl.code,
  bl.label,
  bl.initial_allocated_amount,
  coalesce(sum(oj.montant_engage), 0) as total_engage,
  coalesce(sum(oj.montant_decaisse), 0) as total_decaisse,
  bl.initial_allocated_amount
    - coalesce(sum(oj.montant_engage), 0)
    - coalesce(sum(oj.montant_decaisse), 0) as solde_disponible,
  case when bl.initial_allocated_amount = 0 then 0
    else (coalesce(sum(oj.montant_engage),0) + coalesce(sum(oj.montant_decaisse),0))
         / bl.initial_allocated_amount
  end as taux_consommation,
  case
    when bl.initial_allocated_amount = 0 then 'neutre'
    when (coalesce(sum(oj.montant_engage),0) + coalesce(sum(oj.montant_decaisse),0))
         / bl.initial_allocated_amount >= 1 then 'rouge'
    when (coalesce(sum(oj.montant_engage),0) + coalesce(sum(oj.montant_decaisse),0))
         / bl.initial_allocated_amount >= 0.8 then 'orange'
    else 'vert'
  end as niveau_alerte
from budget_lines bl
left join operations_journal oj on oj.budget_line_id = bl.id
group by bl.id, bl.project_id, bl.code, bl.label, bl.initial_allocated_amount;


-- Vue EVM : recalculée dynamiquement selon projects.evm_control_date (équivalent cellule P1)
create or replace view v_evm_tasks as
select
  t.*,
  p.evm_control_date,
  -- Valeur Planifiée (PV) au prorata temporis
  case
    when p.evm_control_date < t.date_start then 0
    when p.evm_control_date >= t.date_end then t.budget_allocated
    else t.budget_allocated
         * ((p.evm_control_date - t.date_start)::numeric
            / (t.date_end - t.date_start)::numeric)
  end as pv,
  -- Valeur Acquise (EV)
  t.budget_allocated * (t.percent_complete / 100.0) as ev
from wbs_tasks t
join projects p on p.id = t.project_id;


create or replace view v_evm_indicators as
select
  *,
  ev - actual_cost as cv,
  ev - pv as sv,
  case when actual_cost = 0 then 1 else ev / actual_cost end as cpi,
  case when pv = 0 then 1 else ev / pv end as spi,
  case when actual_cost = 0 then budget_allocated
       else budget_allocated / (case when actual_cost = 0 then 1 else ev / actual_cost end)
  end as eac
from v_evm_tasks;


-- Synthèse globale projet (équivalent onglet Dashboard)
create or replace view v_evm_project_summary as
select
  project_id,
  sum(budget_allocated) as bac_total,
  sum(pv) as pv_total,
  sum(ev) as ev_total,
  sum(actual_cost) as ac_total,
  case when sum(actual_cost) = 0 then 1 else sum(ev) / sum(actual_cost) end as cpi_global,
  case when sum(pv) = 0 then 1 else sum(ev) / sum(pv) end as spi_global,
  case when sum(actual_cost) = 0 then sum(budget_allocated)
       else sum(budget_allocated)
            / (case when sum(actual_cost)=0 then 1 else sum(ev)/sum(actual_cost) end)
  end as eac_global
from v_evm_tasks
group by project_id;
