create extension if not exists "uuid-ossp";

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  is_org_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique,
  currency text not null default 'XOF',
  start_date date,
  end_date date,
  evm_control_date date not null default current_date,
  status text not null default 'actif' check (status in ('actif','clos','suspendu')),
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create type project_role as enum ('owner', 'chef_projet', 'comptable', 'bailleur_lecture', 'consultant');

create table project_members (
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role project_role not null,
  added_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create or replace function fn_user_role(p_project_id uuid)
returns project_role
language sql security definer stable as $$
  select role from project_members
  where project_id = p_project_id and user_id = auth.uid()
$$;

create table funding_sources (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  type text not null default 'bailleur' check (type in ('bailleur','contrepartie','autre')),
  amount_committed numeric(16,2) not null default 0,
  created_at timestamptz not null default now()
);

create type logframe_level as enum ('objectif_global', 'objectif_specifique', 'resultat', 'activite');

create table logframe_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  parent_id uuid references logframe_items(id) on delete cascade,
  level logframe_level not null,
  intervention_label text not null,
  indicator text,
  baseline text,
  target text,
  verification_source text,
  risks_assumptions text,
  created_at timestamptz not null default now()
);

create table ptba_activities (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  logframe_item_id uuid references logframe_items(id),
  code text not null,
  description text not null,
  responsible text,
  fiscal_year int not null,
  q1 boolean not null default false,
  q2 boolean not null default false,
  q3 boolean not null default false,
  q4 boolean not null default false,
  budget_planned numeric(16,2) not null default 0,
  created_at timestamptz not null default now()
);

create table budget_lines (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  code text not null,
  label text not null,
  unit text,
  quantity numeric(16,2),
  unit_cost numeric(16,2),
  initial_allocated_amount numeric(16,2) not null default 0,
  funding_source_id uuid references funding_sources(id),
  counterpart_amount numeric(16,2) not null default 0,
  created_at timestamptz not null default now()
);

create type operation_status as enum ('planifie','engage','decaisse','annule');

create table operations_journal (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  budget_line_id uuid not null references budget_lines(id),
  task_code text not null,
  phase_wbs text,
  status operation_status not null default 'planifie',
  planned_cost numeric(16,2) not null default 0,
  actual_cost numeric(16,2),
  reste_a_engager numeric(16,2) generated always as (case when status = 'planifie' then planned_cost else 0 end) stored,
  montant_engage numeric(16,2) generated always as (case when status = 'engage' then planned_cost else 0 end) stored,
  montant_decaisse numeric(16,2) generated always as (case when status = 'decaisse' then coalesce(actual_cost, planned_cost) else 0 end) stored,
  ecart_budgetaire numeric(16,2) generated always as (case when status = 'decaisse' then planned_cost - coalesce(actual_cost, 0) else 0 end) stored,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create view v_budget_consumption as
select
  bl.id as budget_line_id, bl.project_id, bl.code, bl.label, bl.initial_allocated_amount,
  coalesce(sum(oj.montant_engage), 0) as total_engage,
  coalesce(sum(oj.montant_decaisse), 0) as total_decaisse,
  bl.initial_allocated_amount - coalesce(sum(oj.montant_engage), 0) - coalesce(sum(oj.montant_decaisse), 0) as solde_disponible,
  case when bl.initial_allocated_amount = 0 then 0 else (coalesce(sum(oj.montant_engage),0) + coalesce(sum(oj.montant_decaisse),0)) / bl.initial_allocated_amount end as taux_consommation,
  case when bl.initial_allocated_amount = 0 then 'neutre'
       when (coalesce(sum(oj.montant_engage),0) + coalesce(sum(oj.montant_decaisse),0)) / bl.initial_allocated_amount >= 1 then 'rouge'
       when (coalesce(sum(oj.montant_engage),0) + coalesce(sum(oj.montant_decaisse),0)) / bl.initial_allocated_amount >= 0.8 then 'orange'
       else 'vert' end as niveau_alerte
from budget_lines bl
left join operations_journal oj on oj.budget_line_id = bl.id
group by bl.id, bl.project_id, bl.code, bl.label, bl.initial_allocated_amount;

create table wbs_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  code text not null,
  description text not null,
  responsible text,
  date_start date not null,
  date_end date not null,
  budget_allocated numeric(16,2) not null default 0,
  percent_complete numeric(5,2) not null default 0 check (percent_complete between 0 and 100),
  actual_cost numeric(16,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create view v_evm_tasks as
select t.*, p.evm_control_date,
  case
    when p.evm_control_date < t.date_start then 0
    when p.evm_control_date >= t.date_end then t.budget_allocated
    else t.budget_allocated * ((p.evm_control_date - t.date_start)::numeric / (t.date_end - t.date_start)::numeric)
  end as pv,
  t.budget_allocated * (t.percent_complete / 100.0) as ev
from wbs_tasks t
join projects p on p.id = t.project_id;

create view v_evm_indicators as
select *, ev - actual_cost as cv, ev - pv as sv,
  case when actual_cost = 0 then 1 else ev / actual_cost end as cpi,
  case when pv = 0 then 1 else ev / pv end as spi,
  case when actual_cost = 0 then budget_allocated else budget_allocated / (case when actual_cost = 0 then 1 else ev / actual_cost end) end as eac
from v_evm_tasks;

create view v_evm_project_summary as
select project_id, sum(budget_allocated) as bac_total, sum(pv) as pv_total, sum(ev) as ev_total, sum(actual_cost) as ac_total,
  case when sum(actual_cost) = 0 then 1 else sum(ev) / sum(actual_cost) end as cpi_global,
  case when sum(pv) = 0 then 1 else sum(ev) / sum(pv) end as spi_global,
  case when sum(actual_cost) = 0 then sum(budget_allocated) else sum(budget_allocated) / (case when sum(actual_cost)=0 then 1 else sum(ev)/sum(actual_cost) end) end as eac_global
from v_evm_tasks
group by project_id;

create table procurement_plan (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  description text not null,
  market_type text,
  method text,
  review_type text check (review_type in ('a_priori','a_posteriori')),
  planned_notice_date date,
  contract_signature_date date,
  estimated_amount numeric(16,2),
  status text not null default 'planifie',
  created_at timestamptz not null default now()
);

create table risks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  category text not null,
  description text not null,
  probability smallint not null check (probability between 1 and 3),
  impact smallint not null check (impact between 1 and 3),
  criticality smallint generated always as (probability * impact) stored,
  mitigation_strategy text,
  responsible text,
  status text not null default 'ouvert' check (status in ('ouvert','en_cours','clos')),
  created_at timestamptz not null default now()
);

create table attachments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  related_table text not null,
  related_id uuid not null,
  storage_path text not null,
  uploaded_by uuid references profiles(id),
  uploaded_at timestamptz not null default now()
);

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id),
  user_id uuid references profiles(id),
  action text not null,
  entity_table text not null,
  entity_id uuid not null,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

-- RLS Activation
alter table profiles enable row level security;
alter table projects enable row level security;
alter table project_members enable row level security;
alter table funding_sources enable row level security;
alter table logframe_items enable row level security;
alter table ptba_activities enable row level security;
alter table budget_lines enable row level security;
alter table operations_journal enable row level security;
alter table wbs_tasks enable row level security;
alter table procurement_plan enable row level security;
alter table risks enable row level security;
alter table attachments enable row level security;
alter table audit_log enable row level security;

-- Global Read Policy for all tables except audit_log
create policy "read_all_projects" on projects for select using (exists (select 1 from project_members where project_id = projects.id and user_id = auth.uid()));
create policy "read_all_members" on project_members for select using (exists (select 1 from project_members pm where pm.project_id = project_members.project_id and pm.user_id = auth.uid()));
create policy "read_all_funding" on funding_sources for select using (exists (select 1 from project_members where project_id = funding_sources.project_id and user_id = auth.uid()));
create policy "read_all_logframe" on logframe_items for select using (exists (select 1 from project_members where project_id = logframe_items.project_id and user_id = auth.uid()));
create policy "read_all_ptba" on ptba_activities for select using (exists (select 1 from project_members where project_id = ptba_activities.project_id and user_id = auth.uid()));
create policy "read_all_budget_lines" on budget_lines for select using (exists (select 1 from project_members where project_id = budget_lines.project_id and user_id = auth.uid()));
create policy "read_all_operations" on operations_journal for select using (exists (select 1 from project_members where project_id = operations_journal.project_id and user_id = auth.uid()));
create policy "read_all_wbs" on wbs_tasks for select using (exists (select 1 from project_members where project_id = wbs_tasks.project_id and user_id = auth.uid()));
create policy "read_all_procurement" on procurement_plan for select using (exists (select 1 from project_members where project_id = procurement_plan.project_id and user_id = auth.uid()));
create policy "read_all_risks" on risks for select using (exists (select 1 from project_members where project_id = risks.project_id and user_id = auth.uid()));
create policy "read_all_attachments" on attachments for select using (exists (select 1 from project_members where project_id = attachments.project_id and user_id = auth.uid()));
create policy "read_all_profiles" on profiles for select using (true);

-- WRITE POLICIES (using ALL but ensuring SELECT is already handled)
create policy "write_logframe_all" on logframe_items for all using (fn_user_role(project_id) in ('owner', 'chef_projet'));
create policy "write_ptba_all" on ptba_activities for all using (fn_user_role(project_id) in ('owner', 'chef_projet', 'consultant'));
create policy "write_budget_lines_all" on budget_lines for all using (fn_user_role(project_id) in ('owner', 'comptable'));
create policy "write_operations_all" on operations_journal for all using (fn_user_role(project_id) in ('owner', 'comptable'));
create policy "write_wbs_tasks_all" on wbs_tasks for all using (fn_user_role(project_id) in ('owner', 'chef_projet', 'consultant'));
create policy "write_procurement_all" on procurement_plan for all using (fn_user_role(project_id) in ('owner', 'chef_projet'));
create policy "write_risks_all" on risks for all using (fn_user_role(project_id) in ('owner', 'chef_projet', 'consultant'));
create policy "write_attachments_all" on attachments for all using (fn_user_role(project_id) in ('owner', 'chef_projet', 'comptable', 'consultant'));
create policy "write_projects_all" on projects for all using (fn_user_role(id) in ('owner'));
create policy "write_members_all" on project_members for all using (fn_user_role(project_id) in ('owner'));
create policy "write_funding_all" on funding_sources for all using (fn_user_role(project_id) in ('owner', 'comptable'));

-- Audit Log Read (owner/chef_projet only)
create policy "read_audit" on audit_log for select using (fn_user_role(project_id) in ('owner', 'chef_projet'));
-- Audit Log Insert ONLY
create policy "insert_audit" on audit_log for insert with check (true);

-- Fonctions de Trigger pour l'Audit
create or replace function trg_audit_log() returns trigger as $$
begin
  insert into audit_log (project_id, user_id, action, entity_table, entity_id, before_data, after_data)
  values (
    coalesce(NEW.project_id, OLD.project_id),
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    coalesce(NEW.id, OLD.id),
    case when TG_OP = 'DELETE' or TG_OP = 'UPDATE' then to_jsonb(OLD) else null end,
    case when TG_OP = 'INSERT' or TG_OP = 'UPDATE' then to_jsonb(NEW) else null end
  );
  if TG_OP = 'DELETE' then return OLD; else return NEW; end if;
end;
$$ language plpgsql security definer;

-- Triggers d'audit sur les tables
create trigger trg_audit_projects after insert or update or delete on projects for each row execute function trg_audit_log();
create trigger trg_audit_project_members after insert or update or delete on project_members for each row execute function trg_audit_log();
create trigger trg_audit_funding_sources after insert or update or delete on funding_sources for each row execute function trg_audit_log();
create trigger trg_audit_logframe_items after insert or update or delete on logframe_items for each row execute function trg_audit_log();
create trigger trg_audit_ptba_activities after insert or update or delete on ptba_activities for each row execute function trg_audit_log();
create trigger trg_audit_budget_lines after insert or update or delete on budget_lines for each row execute function trg_audit_log();
create trigger trg_audit_operations_journal after insert or update or delete on operations_journal for each row execute function trg_audit_log();
create trigger trg_audit_wbs_tasks after insert or update or delete on wbs_tasks for each row execute function trg_audit_log();
create trigger trg_audit_procurement_plan after insert or update or delete on procurement_plan for each row execute function trg_audit_log();
create trigger trg_audit_risks after insert or update or delete on risks for each row execute function trg_audit_log();
create trigger trg_audit_attachments after insert or update or delete on attachments for each row execute function trg_audit_log();

