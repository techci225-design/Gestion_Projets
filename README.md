# Smart Project Manager

Application web de pilotage de projets de développement financés par des bailleurs. Elle centralise la planification, le budget, le suivi EVM, les marchés, les risques, les indicateurs et les rapports.

## Fonctionnalités principales

- Cadre logique et suivi périodique des indicateurs.
- WBS unique pour les tâches et le planning/Gantt, avec PTBA lié.
- Budget, sources de financement, journal des opérations et traçabilité bancaire.
- EVM : baselines approuvées, snapshots, CPI, SPI et EAC.
- Plan de passation des marchés (PPM), relié aux tâches WBS, et matrice des risques.
- Import Excel, export Excel et rapport PDF.
- Authentification Supabase, invitations, audit et contrôle des accès par projet.
- PWA : installation, cache de lecture et indication du mode hors-ligne.

## Règles métier essentielles

- La devise canonique est `projects.currency` : `XOF`, `XAF`, `EUR`, `USD`, `GBP`, `CAD` ou `CHF`. Les formateurs monétaires reçoivent toujours le code ISO, jamais un symbole.
- `wbs_tasks` est l’unique source de vérité des tâches, du WBS et du Gantt.
- Les rôles projet autorisés sont `OWNER`, `PROJECT_MANAGER`, `ACCOUNTANT`, `CONSULTANT` et `FUNDER_READONLY`.
- Les données financières et les baselines EVM ne doivent pas être modifiées par des flux parallèles ou destructifs.

## Développement

Préparer les variables Supabase dans `.env.local`, puis lancer :

```powershell
npm install
npm run dev
```

Contrôles obligatoires après une modification :

```powershell
node_modules\.bin\tsc.cmd --noEmit
npm run lint
```

Les tests E2E sont documentés dans [e2e/README.md](e2e/README.md). Ils nécessitent Chromium ; les scénarios avec compte de test exigent des identifiants E2E dédiés, jamais un compte de production.

## Mise en production

Le déploiement est réalisé par Vercel après le `git push` de la branche de production. Avant chaque livraison, vérifier au minimum : connexion, permissions selon rôle, création/consultation du journal, export Excel/PDF, EVM et navigation mobile.

## Documentation de référence

Le document historique [docs/plan-implementation-saas-projets-bailleurs.md](docs/plan-implementation-saas-projets-bailleurs.md) décrit la vision initiale. Les règles actuelles de l’application et les migrations Supabase priment lorsqu’elles diffèrent de ce document.
