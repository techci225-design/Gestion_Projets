-- =========================================================
-- HISTORIQUE DES ARRÊTÉS EVM
-- =========================================================
create table evm_snapshots (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  control_date date not null,
  bac_total numeric(16,2),
  pv_total numeric(16,2),
  ev_total numeric(16,2),
  ac_total numeric(16,2),
  cpi_global numeric(6,4),
  spi_global numeric(6,4),
  eac_global numeric(16,2),
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  unique (project_id, control_date)
);

-- =========================================================
-- NOTIFICATIONS
-- =========================================================
create type notification_type as enum (
  'budget_seuil_80', 'budget_seuil_100',
  'marche_echeance_proche', 'marche_echeance_depassee',
  'risque_critique',
  'cpi_alerte', 'spi_alerte'
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  type notification_type not null,
  title text not null,
  body text not null,
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- Index pour les non-lues par utilisateur
create index idx_notifications_user_unread
  on notifications(user_id, is_read)
  where is_read = false;

-- =========================================================
-- SUIVI PAR SOURCE DE FINANCEMENT (multi-bailleurs)
-- =========================================================
-- Déjà dans funding_sources en V1, on ajoute le lien
-- entre chaque opération du journal et sa source de financement
alter table operations_journal
  add column if not exists funding_source_id uuid references funding_sources(id);

-- Vue de traçabilité par bailleur
create view v_funding_tracking as
select
  fs.id as funding_source_id,
  fs.project_id,
  fs.name as bailleur_name,
  fs.amount_committed,
  coalesce(sum(oj.montant_engage), 0) as total_engage,
  coalesce(sum(oj.montant_decaisse), 0) as total_decaisse,
  fs.amount_committed
    - coalesce(sum(oj.montant_engage), 0)
    - coalesce(sum(oj.montant_decaisse), 0) as solde_restant,
  case when fs.amount_committed = 0 then 0
    else (coalesce(sum(oj.montant_engage),0) + coalesce(sum(oj.montant_decaisse),0))
         / fs.amount_committed
  end as taux_utilisation
from funding_sources fs
left join operations_journal oj
  on oj.budget_line_id in (
    select id from budget_lines where funding_source_id = fs.id
  )
group by fs.id, fs.project_id, fs.name, fs.amount_committed;

-- RLS sur les nouvelles tables
alter table evm_snapshots enable row level security;
alter table notifications enable row level security;

create policy "lecture_membres_snapshots"
  on evm_snapshots for select
  using (exists (
    select 1 from project_members
    where project_id = evm_snapshots.project_id and user_id = auth.uid()
  ));

create policy "lecture_notifications_proprio"
  on notifications for select
  using (user_id = auth.uid());

create policy "marquer_lue"
  on notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
