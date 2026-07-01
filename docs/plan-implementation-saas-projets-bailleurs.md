# Plan d'Implémentation Complet
## SaaS de Gestion de Projets de Développement (Bailleurs de Fonds)
**Nom de travail du produit : « ProjetPilote »** *(à renommer librement)*

| | |
|---|---|
| **Stack** | Next.js 14 (App Router) · Supabase (Postgres / Auth / Storage / Realtime) · Tailwind CSS |
| **Déploiement** | Vercel (app) + Supabase Cloud (backend) |
| **Portée V1** | Mono-organisation, projets multiples, accès web + PWA mobile |
| **Source métier** | Matrice Excel fournie (Logframe, PTBA, Budget, PPM, Risques) + méthodologie EVM (Journal des opérations, Moteur_EVM, Dashboard) |

---

## 1. Vision & positionnement

### 1.1 Problème à résoudre
Les consultants et entrepreneurs africains qui gèrent des projets financés par des bailleurs (Banque Mondiale, BID, ONG, fonds publics) pilotent aujourd'hui leur gouvernance financière et opérationnelle sur des matrices Excel artisanales. Ces fichiers sont puissants mais fragiles : une formule effacée, un statut mal saisi ou un fichier perdu peut compromettre la traçabilité exigée par les bailleurs. Le SaaS reprend **exactement la logique de gouvernance** qui a fait ses preuves dans la matrice Excel, mais la sécurise, la centralise et la rend accessible en temps réel à toute l'équipe.

### 1.2 Utilisateurs cibles (V1, mono-organisation)
- **Propriétaire / Admin** — le consultant ou le dirigeant qui paramètre les projets et les accès.
- **Chef de projet** — saisit l'avancement, les activités PTBA, les marchés.
- **Comptable / Finance** — saisit les statuts financiers (engagé/décaissé), gère les sources de financement.
- **Bailleur (lecture seule)** — consulte le tableau de bord et les rapports, sans droit de modification (équivalent numérique de la feuille Excel « protégée »).
- **Consultant externe** — accès restreint à certains modules (ex. risques, marchés).

### 1.3 Proposition de valeur par rapport à Excel
| Limite Excel | Réponse du SaaS |
|---|---|
| Formules qui peuvent être écrasées par erreur | Calculs effectués côté base de données (vues SQL / colonnes calculées), jamais modifiables manuellement |
| Pas de traçabilité de qui a changé quoi | Journal d'audit immuable (`audit_log`) |
| Un seul fichier, un seul éditeur à la fois | Accès simultané multi-utilisateurs avec rôles |
| Pas d'alerte automatique | Notifications sur seuils budgétaires et échéances de marchés |
| Pas d'accès mobile réel | PWA installable, consultation hors-ligne |
| Mots de passe de protection de feuille (faible sécurité) | Row Level Security (RLS) Postgres, par rôle et par projet |

---

## 2. Périmètre fonctionnel détaillé (V1)

Chaque module ci-dessous reprend une section de votre matrice Excel / du document méthodologique, avec ses règles de gestion automatisées.

### 2.1 Cadre Logique (Logframe)
- Hiérarchie : Objectif Global → Objectifs Spécifiques → Résultats → Activités.
- Pour chaque niveau : indicateur (IOV), ligne de base, cible, source de vérification, hypothèses/risques.
- Lien optionnel entre une Activité du Logframe et les activités du PTBA (traçabilité stratégie → opérationnel).

### 2.2 PTBA (Plan de Travail et Budget Annuel)
- Activités codifiées (WBS), responsable, répartition par trimestre (Q1–Q4), budget prévu.
- Vue calendaire/Gantt simplifiée par année fiscale.
- Une activité PTBA peut générer automatiquement une ligne budgétaire correspondante.

### 2.3 Budget & Journal des Opérations *(le cœur du moteur financier)*
Reprend fidèlement la logique du document méthodologique :
- **Nomenclature budgétaire** : lignes budgétaires (1.1 Consultants, 1.2 Équipements...) avec montant initial alloué et source de financement.
- **Sources de financement** : un ou plusieurs bailleurs par ligne (contrepartie État incluse), pour la traçabilité par origine.
- **Journal des opérations** : chaque tâche/dépense a un statut strict (`Planifié`, `Engagé`, `Décaissé`, `Annulé`) saisi manuellement — **tout le reste est calculé automatiquement**, exactement comme dans vos formules `=SI(Statut="...";...)` :
  - *Reste à Engager* = coût prévu si statut = Planifié, sinon 0
  - *Montant Engagé* = coût prévu si statut = Engagé, sinon 0
  - *Montant Décaissé* = coût réel (ou prévu par défaut) si statut = Décaissé, sinon 0
  - *Écart Budgétaire* = Prévu − Réel, uniquement si statut = Décaissé
- **Matrice de consommation** (vue consolidée par ligne budgétaire) : budget initial, cumul engagé, cumul décaissé, solde disponible, taux de consommation.
- **Alertes visuelles** : orange si consommation > 80 %, rouge si > 100 % (seuils paramétrables).

### 2.4 Moteur de Valeur Acquise (EVM)
Reprend la logique `Saisie_POA → Moteur_EVM → Dashboard` du document :
- Saisie des tâches : code, description, responsable, dates prévues, **Budget Alloué (BAC)**, **% d'avancement réel**, **Coût Réel (AC)**.
- Une **date de contrôle** par projet (équivalent de la cellule `P1`) pilote dynamiquement le calcul de la Valeur Planifiée.
- Calculs automatiques (au prorata temporis) :
  - **PV** (Valeur Planifiée), **EV** (Valeur Acquise) = BAC × % avancement, **CV** = EV − AC, **SV** = EV − PV
  - **CPI** = EV/AC, **SPI** = EV/PV, **EAC** = BAC/CPI
- Seuils d'alerte alignés sur les standards bailleurs (Banque Mondiale/BID) : Vert ≥ 1, Orange [0,90–0,99], Rouge < 0,90.

### 2.5 Plan de Passation des Marchés (PPM)
- Description du marché, type, méthode (AOI, SFQC...), type de revue (a priori/a posteriori), dates clés, montant estimé.
- Alertes automatiques sur les échéances proches (avis à publier, contrat à signer).

### 2.6 Matrice des Risques
- Catégorie, description, Probabilité (1–3), Impact (1–3), **Criticité = P × I** (calculée), stratégie d'atténuation, responsable.
- Heatmap visuelle 3×3 et tri automatique par criticité décroissante.

### 2.7 Tableau de Bord Stratégique
- Bloc santé globale : Budget Total, EAC global, variance à l'achèvement.
- Jauges CPI/SPI globales avec code couleur.
- Courbe en « S » : PV, AC, EV cumulés dans le temps.
- Top 5 des activités à plus fort écart de coût négatif (foyers de surconsommation).
- Burn rate (rythme de décaissement) pour anticiper les appels de fonds.

### 2.8 Rôles, Permissions & Journal d'Audit
- Remplace la protection de feuille Excel par une sécurité réelle au niveau base de données.
- Chaque action de création/modification/suppression est journalisée (qui, quand, avant/après) — table en lecture seule, non modifiable même par un admin.

### 2.9 Import Excel & Exports
- Assistant d'import qui lit un fichier `.xlsx` existant (structure proche de celle que vous avez fournie), prévisualise le mapping vers les modules, puis crée les enregistrements.
- Exports : Excel (feuille de calcul figée, pour archivage) et PDF (rapport de présentation pour les bailleurs).

---

## 3. Architecture technique

### 3.1 Schéma global

```
┌─────────────────────────────┐        ┌──────────────────────────┐
│        Navigateur /          │        │      Vercel (Edge)        │
│   PWA installée (mobile)     │◄──────►│  Next.js 14 App Router    │
│                              │  HTTPS │  - Server Components      │
└─────────────────────────────┘        │  - Server Actions         │
                                        │  - Route Handlers (exports)│
                                        └────────────┬──────────────┘
                                                      │ supabase-js
                                                      ▼
                                  ┌───────────────────────────────────┐
                                  │            Supabase                │
                                  │  - Postgres (schéma métier + RLS)  │
                                  │  - Auth (email/password, magic link)│
                                  │  - Storage (pièces jointes)         │
                                  │  - Realtime (mise à jour live)      │
                                  │  - Edge Functions (cron EVM, alertes)│
                                  └───────────────────────────────────┘
```

### 3.2 Pourquoi ce choix
- **Next.js App Router + Server Actions** : permet de garder toute la logique de mutation côté serveur (comme les formules Excel sont « cachées » à l'utilisateur), sans exposer d'API REST superflue.
- **Supabase Postgres** : les calculs (Reste à Engager, EVM...) sont implémentés comme **colonnes générées** ou **vues SQL**, donc *impossibles à corrompre* par une saisie manuelle — c'est la vraie résolution du problème que la protection de feuille Excel tentait de résoudre artisanalement.
- **Row Level Security** : chaque rôle voit/modifie uniquement ce qui lui est autorisé, appliqué au niveau base de données (pas seulement dans l'UI — donc impossible à contourner via l'API).
- **Realtime** : quand le comptable change un statut à « Décaissé », le tableau de bord d'un autre utilisateur connecté se met à jour instantanément, sans rafraîchissement.

### 3.3 Tenancy (mono-organisation, évolutif)
Pour la V1, **une seule organisation** utilise l'application, mais celle-ci peut gérer **plusieurs projets**. Le modèle de données isole déjà les données par `project_id`, ce qui rend la bascule future vers un vrai multi-tenant (plusieurs organisations clientes) peu coûteuse : il suffira d'ajouter une colonne `organization_id` sur `projects` et d'adapter les politiques RLS — toute la couche métier reste inchangée.

---

## 4. Modèle de données (schéma SQL complet)

### 4.1 Vue d'ensemble des tables

| Table | Rôle |
|---|---|
| `profiles` | Utilisateurs (miroir de `auth.users`) |
| `projects` | Projets de développement |
| `project_members` | Rôle de chaque utilisateur sur chaque projet |
| `funding_sources` | Bailleurs / sources de financement |
| `logframe_items` | Cadre logique (hiérarchique) |
| `ptba_activities` | Plan de Travail et Budget Annuel |
| `budget_lines` | Nomenclature budgétaire |
| `operations_journal` | Journal des opérations (statuts + calculs auto) |
| `wbs_tasks` | Tâches pour le moteur EVM (Saisie_POA) |
| `procurement_plan` | Plan de Passation des Marchés |
| `risks` | Matrice des risques |
| `attachments` | Pièces jointes (factures, contrats, PV) |
| `audit_log` | Journal d'audit immuable |

### 4.2 DDL complet

```sql
-- =========================================================
-- EXTENSIONS
-- =========================================================
create extension if not exists "uuid-ossp";

-- =========================================================
-- PROFILS UTILISATEURS
-- =========================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  is_org_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- =========================================================
-- PROJETS
-- =========================================================
create table projects (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  code text unique,
  currency text not null default 'XOF',
  start_date date,
  end_date date,
  evm_control_date date not null default current_date, -- équivalent cellule P1
  status text not null default 'actif' check (status in ('actif','clos','suspendu')),
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- =========================================================
-- MEMBRES DU PROJET (RÔLES)
-- =========================================================
create type project_role as enum (
  'owner', 'chef_projet', 'comptable', 'bailleur_lecture', 'consultant'
);

create table project_members (
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role project_role not null,
  added_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

-- Fonction utilitaire pour les policies RLS
create or replace function fn_user_role(p_project_id uuid)
returns project_role
language sql security definer stable as $$
  select role from project_members
  where project_id = p_project_id and user_id = auth.uid()
$$;

-- =========================================================
-- SOURCES DE FINANCEMENT (BAILLEURS)
-- =========================================================
create table funding_sources (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,                 -- ex: "Banque Mondiale", "Contrepartie État"
  type text not null default 'bailleur' check (type in ('bailleur','contrepartie','autre')),
  amount_committed numeric(16,2) not null default 0,
  created_at timestamptz not null default now()
);

-- =========================================================
-- CADRE LOGIQUE
-- =========================================================
create type logframe_level as enum (
  'objectif_global', 'objectif_specifique', 'resultat', 'activite'
);

create table logframe_items (
  id uuid primary key default uuid_generate_v4(),
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

-- =========================================================
-- PTBA
-- =========================================================
create table ptba_activities (
  id uuid primary key default uuid_generate_v4(),
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

-- =========================================================
-- NOMENCLATURE BUDGÉTAIRE
-- =========================================================
create table budget_lines (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  code text not null,                  -- ex: "1.1 Consultants"
  label text not null,
  unit text,
  quantity numeric(16,2),
  unit_cost numeric(16,2),
  initial_allocated_amount numeric(16,2) not null default 0,
  funding_source_id uuid references funding_sources(id),
  counterpart_amount numeric(16,2) not null default 0,
  created_at timestamptz not null default now()
);

-- =========================================================
-- JOURNAL DES OPÉRATIONS (financier)
-- Logique exacte des formules =SI(Statut;...) de la matrice Excel
-- =========================================================
create type operation_status as enum ('planifie','engage','decaisse','annule');

create table operations_journal (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  budget_line_id uuid not null references budget_lines(id),
  task_code text not null,
  phase_wbs text,
  status operation_status not null default 'planifie',
  planned_cost numeric(16,2) not null default 0,   -- Coût Prévu (CP)
  actual_cost numeric(16,2),                       -- Coût Réel (CR), saisi à la facture finale

  -- Colonnes calculées : jamais modifiables manuellement, recalculées automatiquement
  reste_a_engager numeric(16,2) generated always as (
    case when status = 'planifie' then planned_cost else 0 end
  ) stored,
  montant_engage numeric(16,2) generated always as (
    case when status = 'engage' then planned_cost else 0 end
  ) stored,
  montant_decaisse numeric(16,2) generated always as (
    case when status = 'decaisse' then coalesce(actual_cost, planned_cost) else 0 end
  ) stored,
  ecart_budgetaire numeric(16,2) generated always as (
    case when status = 'decaisse' then planned_cost - coalesce(actual_cost, 0) else 0 end
  ) stored,

  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Matrice de consommation par ligne budgétaire (équivalent SOMME.SI.ENS)
create view v_budget_consumption as
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

-- =========================================================
-- TÂCHES EVM (Saisie_POA)
-- =========================================================
create table wbs_tasks (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  code text not null,
  description text not null,
  responsible text,
  date_start date not null,
  date_end date not null,
  budget_allocated numeric(16,2) not null default 0,   -- BAC
  percent_complete numeric(5,2) not null default 0 check (percent_complete between 0 and 100),
  actual_cost numeric(16,2) not null default 0,        -- AC
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Vue EVM : recalculée dynamiquement selon projects.evm_control_date (équivalent cellule P1)
create view v_evm_tasks as
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

create view v_evm_indicators as
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
create view v_evm_project_summary as
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

-- =========================================================
-- PLAN DE PASSATION DES MARCHÉS
-- =========================================================
create table procurement_plan (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  description text not null,
  market_type text,                 -- Travaux, Fournitures, Services...
  method text,                      -- AOI, AON, SFQC...
  review_type text check (review_type in ('a_priori','a_posteriori')),
  planned_notice_date date,
  contract_signature_date date,
  estimated_amount numeric(16,2),
  status text not null default 'planifie',
  created_at timestamptz not null default now()
);

-- =========================================================
-- MATRICE DES RISQUES
-- =========================================================
create table risks (
  id uuid primary key default uuid_generate_v4(),
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

-- =========================================================
-- PIÈCES JOINTES
-- =========================================================
create table attachments (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  related_table text not null,      -- ex: 'operations_journal'
  related_id uuid not null,
  storage_path text not null,       -- chemin Supabase Storage
  uploaded_by uuid references profiles(id),
  uploaded_at timestamptz not null default now()
);

-- =========================================================
-- JOURNAL D'AUDIT (immuable)
-- =========================================================
create table audit_log (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id),
  user_id uuid references profiles(id),
  action text not null,             -- 'create' | 'update' | 'delete'
  entity_table text not null,
  entity_id uuid not null,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);
```

### 4.3 Row Level Security (extraits représentatifs)

```sql
alter table operations_journal enable row level security;

-- Lecture : tout membre du projet
create policy "lecture_membres"
  on operations_journal for select
  using (exists (
    select 1 from project_members
    where project_id = operations_journal.project_id and user_id = auth.uid()
  ));

-- Écriture : uniquement owner, chef_projet, comptable
create policy "ecriture_roles_autorises"
  on operations_journal for insert with check (
    fn_user_role(project_id) in ('owner','chef_projet','comptable')
  );

create policy "modification_roles_autorises"
  on operations_journal for update using (
    fn_user_role(project_id) in ('owner','chef_projet','comptable')
  );

-- Le rôle bailleur_lecture n'a accès qu'en SELECT, jamais en write (aucune policy insert/update ne le mentionne)

-- Journal d'audit : lecture pour owner/chef_projet uniquement, AUCUNE policy update/delete pour personne
alter table audit_log enable row level security;
create policy "audit_lecture_direction"
  on audit_log for select using (
    fn_user_role(project_id) in ('owner','chef_projet')
  );
create policy "audit_insertion_systeme"
  on audit_log for insert with check (true); -- inséré uniquement via triggers/Server Actions
-- Pas de policy UPDATE / DELETE : la table est verrouillée par conception (RLS "deny by default")
```

Le même schéma (rôle autorisé en lecture seule pour `bailleur_lecture`, écriture pour `owner/chef_projet/comptable` selon le module) est répliqué sur `budget_lines`, `ptba_activities`, `wbs_tasks`, `procurement_plan`, `risks`.

---

## 5. Moteur de calcul automatisé — récapitulatif

| Indicateur Excel | Implémentation SaaS |
|---|---|
| `=SI(Statut="À faire";...)` (Reste à Engager, Engagé, Décaissé, Écart) | Colonnes **générées** (`generated always as`) sur `operations_journal` — calcul garanti à l'écriture, non modifiable |
| `SOMME.SI.ENS` (consolidation par ligne budgétaire) | Vue `v_budget_consumption` |
| PV/EV/CV/SV/CPI/SPI/EAC (Moteur_EVM) | Vues `v_evm_tasks` / `v_evm_indicators` / `v_evm_project_summary`, paramétrées par `projects.evm_control_date` |
| Mise en forme conditionnelle (seuils 0,80 / 0,90 / 0,99 / 1) | Calcul du `niveau_alerte` directement dans la vue SQL + composant `<AlertBadge />` côté UI |
| Cellule `P1` (date de contrôle) | Colonne `projects.evm_control_date`, modifiable uniquement par owner/chef_projet, avec historique optionnel dans une table `evm_control_history` si vous voulez comparer plusieurs arrêtés dans le temps |

**Recalcul en temps réel** : grâce aux vues SQL, il n'y a jamais de valeur « en cache » à rafraîchir manuellement — chaque lecture recalcule à la volée. Pour le tableau de bord, Supabase Realtime notifie le client à chaque `INSERT`/`UPDATE` sur `operations_journal` et `wbs_tasks`, ce qui déclenche une re-validation Next.js (`revalidatePath` côté Server Action, ou abonnement Realtime côté client pour les vues les plus consultées).

---

## 6. Sécurité, rôles & permissions

| Rôle | Cadre Logique | PTBA | Budget/Journal | EVM | Marchés | Risques | Dashboard | Membres |
|---|---|---|---|---|---|---|---|---|
| **Owner** | RW | RW | RW | RW | RW | RW | R | RW |
| **Chef de projet** | RW | RW | R | RW | RW | RW | R | – |
| **Comptable** | – | R | RW | R | – | – | R | – |
| **Bailleur (lecture)** | R | R | R | R | R | R | R | – |
| **Consultant** | R | RW (limité aux activités assignées) | – | RW (limité) | R | RW | R | – |

- Toute mutation passe par une **Server Action** qui (1) vérifie le rôle, (2) effectue l'écriture, (3) insère une ligne dans `audit_log` — dans une seule transaction Postgres pour garantir la cohérence.
- Les exports PDF destinés aux bailleurs peuvent être horodatés et signés (hash du contenu) pour éviter toute contestation sur la version consultée.

---

## 7. Stratégie Mobile (PWA)

Avec Next.js 14, la voie la plus directe pour couvrir « web + mobile » avec une seule base de code :

1. **`public/manifest.json`** : nom, icônes, couleur de thème, `display: standalone` pour une installation type app native.
2. **Service Worker** (via `next-pwa` ou implémentation manuelle dans `app/`) :
   - Cache des pages de **lecture** (dashboard, listes) pour consultation hors-ligne.
   - **Pas d'écriture hors-ligne en V1** sur les données financières (trop risqué pour la traçabilité bailleur) — un bandeau « Hors-ligne, lecture seule » s'affiche si la connexion est perdue.
3. **Responsive-first** : Tailwind avec breakpoints mobiles par défaut ; les tableaux denses (Journal des opérations) basculent en vue « cartes » sur petit écran.
4. **Notifications push** (V1.1, optionnel) via Web Push API pour les alertes de seuils budgétaires ou d'échéances de marchés.

*Si un vrai besoin d'app native (accès caméra pour scanner les factures, mode hors-ligne avec écriture, présence sur les stores) émerge, une migration vers React Native/Expo réutilisant la même couche Supabase est prévue en V2 — sans rien jeter de l'architecture actuelle.*

---

## 8. Migration depuis Excel

1. **Upload** du fichier `.xlsx` existant dans un assistant dédié (`/projects/[id]/import-excel`).
2. **Parsing serveur** (Route Handler Next.js) avec `exceljs` : détection des sections par leurs en-têtes (« ONGLET 1 : CADRE LOGIQUE », « ONGLET 2 : PTBA »...), à la manière de ce qui a été identifié dans votre fichier modèle.
3. **Aperçu de mapping** : l'utilisateur voit, ligne par ligne, comment chaque colonne Excel sera répartie dans les tables (`logframe_items`, `ptba_activities`, `budget_lines`, `procurement_plan`, `risks`).
4. **Validation et import** : création des enregistrements en une transaction, avec un rapport d'import (lignes importées / ignorées / en erreur).
5. Le fichier original reste téléchargeable en pièce jointe du projet (`attachments`) pour archivage historique.

---

## 9. Structure du repository Next.js

```
projetpilote/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx                      # vue globale multi-projets
│   │   └── projects/
│   │       ├── page.tsx                  # liste des projets
│   │       └── [projectId]/
│   │           ├── layout.tsx            # nav latérale du projet
│   │           ├── page.tsx              # tableau de bord du projet
│   │           ├── cadre-logique/page.tsx
│   │           ├── ptba/page.tsx
│   │           ├── budget/
│   │           │   ├── page.tsx          # nomenclature budgétaire
│   │           │   └── journal/page.tsx  # journal des opérations
│   │           ├── evm/page.tsx
│   │           ├── marches/page.tsx
│   │           ├── risques/page.tsx
│   │           ├── membres/page.tsx
│   │           └── import-excel/page.tsx
│   └── api/
│       └── export/
│           ├── pdf/route.ts
│           └── excel/route.ts
├── lib/
│   ├── supabase/
│   │   ├── client.ts                     # client navigateur
│   │   ├── server.ts                     # client Server Components/Actions
│   │   └── middleware.ts
│   ├── actions/
│   │   ├── budget.actions.ts
│   │   ├── ptba.actions.ts
│   │   ├── evm.actions.ts
│   │   ├── procurement.actions.ts
│   │   ├── risks.actions.ts
│   │   └── import.actions.ts
│   ├── validators/                       # schémas Zod
│   └── utils/
│       ├── format-currency.ts
│       ├── alert-level.ts                # logique vert/orange/rouge partagée
│       └── dates.ts
├── components/
│   ├── ui/                               # design system (shadcn/ui + Tailwind)
│   ├── dashboard/
│   │   ├── s-curve-chart.tsx             # courbe PV/AC/EV (recharts)
│   │   ├── gauge-cpi-spi.tsx
│   │   ├── risk-heatmap.tsx
│   │   └── budget-consumption-table.tsx
│   └── forms/
├── supabase/
│   ├── migrations/                       # fichiers SQL numérotés (le DDL de la section 4)
│   └── seed.sql
├── public/
│   ├── manifest.json
│   └── icons/
└── middleware.ts                          # protection des routes par auth Supabase
```

**Conventions de code** : Server Components par défaut ; `"use client"` réservé aux composants interactifs (graphiques, formulaires) ; toutes les mutations passent par des Server Actions validées avec Zod ; aucune logique de calcul dupliquée côté client — le serveur/la base de données restent la seule source de vérité, exactement comme une feuille Excel protégée où seules les cellules de saisie sont déverrouillées.

---

## 10. Tableau de bord & reporting

- **Courbe en S** (`recharts`) : PV, AC, EV cumulés dans le temps, alimentée par `v_evm_tasks`.
- **Jauges CPI/SPI** : composant `<GaugeCPISPI>` avec code couleur dynamique selon les seuils 0,90/0,99/1.
- **Heatmap des risques** : grille 3×3 Probabilité × Impact, points colorés par criticité.
- **Top 5 écarts négatifs** : requête triée sur `v_evm_indicators.cv` ascendant.
- **Export PDF** : génération via `@react-pdf/renderer` ou rendu HTML→PDF (Puppeteer en Edge Function), avec en-tête institutionnel et date d'arrêté des comptes.
- **Export Excel** : régénération d'un classeur figé (valeurs, pas de formules) via `exceljs`, pour les bailleurs qui exigent un livrable Excel classique.

---

## 11. Feuille de route par phases

| Phase | Contenu | Durée indicative |
|---|---|---|
| **Phase 0 — Fondations** | Setup repo, projet Supabase, schéma SQL + RLS de base, Auth, design system Tailwind/shadcn | 1–2 semaines |
| **Phase 1 — MVP cœur métier** | Cadre Logique, PTBA, Budget + Journal des opérations (avec colonnes calculées), rôles owner/chef_projet/comptable/bailleur_lecture | 3–4 semaines |
| **Phase 2 — Pilotage financier** | Vue consommation budgétaire, alertes seuils, export Excel/PDF basique | 2 semaines |
| **Phase 3 — Moteur EVM** | `wbs_tasks`, vues EVM, courbe en S, jauges CPI/SPI, EAC | 2–3 semaines |
| **Phase 4 — Marchés & Risques** | PPM avec alertes d'échéance, matrice des risques + heatmap | 2 semaines |
| **Phase 5 — Audit, Import Excel & PWA** | `audit_log` immuable, assistant d'import Excel, manifest PWA + cache lecture hors-ligne | 2–3 semaines |
| **Phase 6 (V2, optionnelle)** | Bascule multi-organisation, app native, notifications push, intégrations mobile money/comptabilité | À planifier selon traction |

---

## 12. Risques projet & mitigations

| Risque | Mitigation |
|---|---|
| Résistance au changement (habitude Excel) | Assistant d'import + interface qui reproduit la structure familière (mêmes intitulés de colonnes) |
| Complexité de l'EVM pour des utilisateurs non formés | Glossaire intégré + info-bulles sur chaque indicateur (PV, EV, CPI...) |
| Dépendance à la connectivité (zones à faible réseau) | PWA avec cache de lecture ; écriture en ligne uniquement en V1 pour préserver l'intégrité financière |
| Dépendance à Supabase | Postgres standard sous le capot ; migration vers une autre instance Postgres reste possible sans réécrire le modèle de données |
| Dérive de périmètre (« feature creep ») | Phases strictement scopées (section 11), arbitrage par rapport au MVP avant tout ajout |

---

## 13. Annexes

### 13.1 Glossaire EVM
- **PV** (Planned Value / Valeur Planifiée) : ce qui aurait dû être dépensé à la date de contrôle.
- **EV** (Earned Value / Valeur Acquise) : valeur du travail réellement accompli (Budget × % avancement).
- **AC** (Actual Cost / Coût Réel) : dépense effective constatée.
- **CV / SV** : écarts de coût / de délai.
- **CPI / SPI** : indices de performance coût / délai (≥ 1 = performance optimale).
- **EAC** (Estimate at Completion) : coût final projeté du projet.

### 13.2 Référence formules Excel → équivalent applicatif

| Formule Excel d'origine | Équivalent SaaS |
|---|---|
| `=SI(C2="À faire";D2;0)` | Colonne générée `reste_a_engager` |
| `=SI(C2="En cours";D2;0)` | Colonne générée `montant_engage` |
| `=SI(C2="Terminé";E2;0)` | Colonne générée `montant_decaisse` |
| `=SOMME.SI.ENS(...)` | Vue `v_budget_consumption` |
| Formules `Moteur_EVM` (PV, EV, CPI, SPI, EAC) | Vues `v_evm_tasks` / `v_evm_indicators` / `v_evm_project_summary` |
| Mise en forme conditionnelle (seuils) | Champ `niveau_alerte` calculé en SQL + composant `<AlertBadge>` |
| Protection de feuille / cellules masquées | Row Level Security + Server Actions (calculs jamais exposés en écriture) |

---

*Document évolutif — à affiner au fur et à mesure des retours utilisateurs une fois le MVP en main des premiers chefs de projet.*
