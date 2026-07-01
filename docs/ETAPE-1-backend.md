# ÉTAPE 1 / 7 — Backend complet

## Ce que cette étape construit
- Schéma SQL complet (toutes les tables, colonnes générées, vues EVM, politiques RLS)
- RBAC + Server Actions pour tous les modules
- 3 scripts de test automatisés (Journal, EVM, RLS/rôles)
- Routes d'export PDF/Excel + parsing import Excel

## ✅ Avant de lancer
- Dossier `docs/` présent avec les 4 fichiers (BRIEF.md + les 3 autres)
- `.env.local` avec `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `.env.local` dans `.gitignore`
- Mode **Plan activé** dans Antigravity

## 📋 Prompt à coller dans Antigravity

```
Tu es l'agent backend principal du projet "ProjetPilote". Avant toute action, lis intégralement docs/BRIEF.md puis docs/plan-implementation-saas-projets-bailleurs.md — ce sont tes seules sources de vérité pour le schéma, les règles de gestion et les rôles. Ta mission : construire l'intégralité du backend, sans aucune interface graphique, et le prouver par des tests automatisés.

En mode Plan, réalise les étapes suivantes dans l'ordre, en committant après chaque étape validée par son test :

1. SOCLE
Initialise un projet Next.js 14 (App Router, TypeScript, ESLint). Installe @supabase/supabase-js et @supabase/ssr. Crée lib/supabase/client.ts, lib/supabase/server.ts, et lib/supabase/admin.ts (client service_role, uniquement pour les scripts de test — jamais importé côté client). Crée l'arborescence complète décrite en section 9 du plan.

2. SCHÉMA SQL COMPLET
Génère dans supabase/migrations/ le DDL complet de la section 4.2 du plan (toutes les tables, colonnes générées, vues v_budget_consumption, v_evm_tasks, v_evm_indicators, v_evm_project_summary). Applique les policies RLS de la section 4.3 sur TOUTES les tables : budget_lines, ptba_activities, logframe_items, wbs_tasks, procurement_plan, risks, attachments, operations_journal, audit_log. Règle : lecture pour tout membre du projet, écriture selon le tableau de permissions section 6, bailleur_lecture en lecture seule absolue, audit_log en insert-only (aucune policy UPDATE/DELETE pour personne, y compris owner). Applique les migrations via supabase link puis supabase db push.

CORRECTION OBLIGATOIRE dans v_evm_tasks — utilise cette formule exacte pour PV (la version avec extract(epoch) est invalide en PostgreSQL car date - date retourne un integer, pas un interval) :
  case
    when p.evm_control_date < t.date_start then 0
    when p.evm_control_date >= t.date_end then t.budget_allocated
    else t.budget_allocated
         * ((p.evm_control_date - t.date_start)::numeric
            / (t.date_end - t.date_start)::numeric)
  end as pv

3. TEST NON-RÉGRESSION — JOURNAL DES OPÉRATIONS
Écris scripts/test-operations-journal.ts. Insère ces 3 lignes et vérifie les colonnes générées :
- planned_cost=15000, actual_cost=15500, status='decaisse' → montant_decaisse=15500, ecart_budgetaire=-500
- planned_cost=5000, status='engage' → montant_engage=5000, montant_decaisse=0, ecart_budgetaire=0
- planned_cost=10000, status='planifie' → reste_a_engager=10000, montant_engage=0, montant_decaisse=0
Stoppe tout si un seul résultat diverge.

4. TEST NON-RÉGRESSION — MOTEUR EVM
Écris scripts/test-evm.ts. Crée un projet avec evm_control_date='2026-04-01', une tâche avec budget_allocated=1000000, date_start='2026-01-01', date_end='2026-06-30', percent_complete=40, actual_cost=450000. Vérifie via v_evm_indicators : pv=500000, ev=400000, cv=-50000, sv=-100000, cpi≈0.889, spi=0.8, eac≈1125000 (tolérance ±1 sur montants, ±0.001 sur indices).

5. RBAC ET SERVER ACTIONS
Pour chaque module, crée lib/actions/[module].actions.ts : logframe.actions.ts, ptba.actions.ts, budget.actions.ts, evm.actions.ts, procurement.actions.ts, risks.actions.ts, import.actions.ts, members.actions.ts. Schémas Zod sur chaque entrée. Chaque mutation doit dans une seule transaction Postgres : (a) vérifier fn_user_role() selon section 6, (b) écrire, (c) insérer avant/après dans audit_log. Ces 3 étapes sont indissociables.

6. TEST NON-RÉGRESSION — RLS ET RBAC
Écris scripts/test-rls.ts. Via lib/supabase/admin.ts : crée 5 utilisateurs de test (un par rôle), rattache-les à un projet de test, simule une session anon par rôle et teste lecture + écriture sur operations_journal et audit_log. Vérifie : bailleur_lecture ne peut jamais écrire, personne ne peut modifier audit_log, comptable écrit sur budget mais pas sur cadre logique. Affiche un rapport pass/fail clair. Supprime les utilisateurs de test à la fin.

7. EXPORTS ET IMPORT
- app/api/export/pdf/route.ts : export PDF de v_budget_consumption et v_evm_project_summary
- app/api/export/excel/route.ts : export Excel avec exceljs
- lib/utils/format-currency.ts : tous les montants en FCFA, espace comme séparateur de milliers, zéro décimale, suffixe "FCFA" sur la même ligne (ex: 15 000 FCFA). Utilisé dans tous les exports.
- lib/actions/import.actions.ts : parsing serveur .xlsx avec exceljs, détection des sections par en-tête, retourne mapping colonnes→champs, import transactionnel avec rapport lignes importées/ignorées/erreur.

Termine par un résumé : migrations appliquées, résultat des 3 scripts de test (pass/fail explicite par cas), écarts éventuels entre ce prompt et ce qui a été implémenté.
```

## ✅ Après l'exécution — vérifier avant d'aller à l'étape 2

- Les 3 scripts de test sont **tous verts** (pass)
- Les migrations sont appliquées dans Supabase (vérifiez dans le dashboard Supabase → Table Editor)
- Un commit Git existe avec un message clair
- `lib/utils/format-currency.ts` existe

## ➡️ Étape suivante
Une fois tout vert, revenez dire **"étape suivante"**.
