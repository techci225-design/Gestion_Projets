# Prompts Antigravity — Construction du Projet « ProjetPilote »

**Connexion Stitch ↔ Antigravity** : si vous reliez votre projet Stitch à Antigravity via MCP (voir la section dédiée ci-dessous), l'agent peut récupérer directement la palette, la typographie et le code de vos écrans réels au lieu de les redéduire d'une description textuelle — c'est l'approche recommandée, et les prompts ci-dessous sont écrits pour en tenir compte automatiquement.

## Avant de commencer — comment Antigravity fonctionne pour ce projet

Antigravity fonctionne différemment de Stitch : ce n'est pas un outil de chat qui génère une image de maquette, c'est un **agent de développement qui travaille directement dans un dossier de code** sur votre machine — il lit les fichiers existants, écrit du code, exécute des commandes dans un terminal, et peut ouvrir un navigateur intégré pour tester l'application qu'il construit (capture d'écran à l'appui). Conséquence pratique : plutôt que de tout réécrire dans chaque prompt comme pour Stitch, on donne à l'agent un accès direct aux documents déjà produits en les plaçant dans le dossier du projet — il les lit lui-même.

**Prérequis avant de coller le Prompt 0 :**

1. Créez un projet sur [supabase.com](https://supabase.com) et notez l'URL du projet ainsi que les clés `anon` et `service_role`.
2. Créez un dossier vide (ex. `projetpilote`), initialisez-y un dépôt Git (`git init`), et créez un fichier `.env.local` avec vos clés Supabase (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
3. Créez un sous-dossier `docs/` et placez-y les deux documents déjà générés : le plan d'implémentation (`plan-implementation-saas-projets-bailleurs.md`) et le fichier de prompts Stitch (`prompts-stitch-maquette-projetpilote.md`). C'est le brief complet que l'agent va lire avant chaque tâche.
4. Ouvrez ce dossier comme **Projet** dans Antigravity.
5. Réglages recommandés : mode **Agent-assisted** (vous gardez la main sur les actions sensibles, les tâches de routine sont automatisées), et **Plan Mode** activé pour les prompts ci-dessous — chacun couvre une phase entière de la feuille de route, donc laissez l'agent proposer un plan détaillé avant qu'il ne touche au code, plutôt que de tout exécuter en mode rapide.
6. Faites un premier commit Git (juste `.env.local` + `docs/`) avant de coller le Prompt 0 — c'est votre point de retour fiable. Demandez ensuite à l'agent, dans chaque prompt, de committer une fois chaque écran ou module terminé : si une phase part dans une mauvaise direction, vous pourrez revenir en arrière sans tout reperdre.
7. À la fin de chaque phase, demandez explicitement à l'agent d'ouvrir l'application dans son navigateur intégré et de comparer visuellement chaque écran construit à l'écran correspondant de votre projet Stitch.

## 🔌 Connecter Stitch à Antigravity via MCP (recommandé)

Plutôt que de ne travailler qu'à partir de la description textuelle des écrans, vous pouvez connecter directement votre projet Stitch à Antigravity via MCP (Model Context Protocol) : l'agent va alors chercher lui-même, dans votre vrai projet Stitch, la palette de couleurs exacte, la typographie et le HTML/CSS de chaque écran déjà généré — au lieu de les redéduire d'un texte. C'est strictement plus fidèle, donc c'est l'approche à privilégier maintenant que la maquette existe.

**Installation (à faire une fois) :**

1. Sur [Stitch](https://stitch.withgoogle.com), cliquez sur votre photo de profil en haut à droite → **Stitch settings** → section **API key** → bouton **Create key**. Copiez la clé générée et conservez-la en lieu sûr.
2. Dans Antigravity, ouvrez l'Agent Manager (raccourci **Cmd+E** sur Mac, **Ctrl+E** sur Windows/Linux) ou cliquez sur le menu **"..."** en haut du panneau Agent → **MCP Servers** (parfois affiché **Manage MCP Servers**). Recherchez **"Stitch"** dans le store et cliquez sur **Install**.
3. Quand on vous le demande, collez votre clé API Stitch dans le champ de configuration.
4. Vérifiez la connexion en tapant dans le chat de l'agent : *« List my Stitch projects »* — votre projet ProjetPilote doit apparaître dans la réponse.

⚠️ Si "Stitch" n'apparaît pas dans le store MCP intégré (déploiement progressif selon les versions), configurez le serveur manuellement via **"View Raw Config"** dans MCP Servers, en ajoutant :
```json
{
  "mcpServers": {
    "stitch": {
      "serverUrl": "https://stitch.googleapis.com/mcp",
      "headers": { "X-Goog-Api-Key": "VOTRE_CLE_API" }
    }
  }
}
```
Note : selon la version d'Antigravity, le champ attendu peut être `serverUrl` ou `url` — si la connexion échoue silencieusement, essayez l'autre orthographe.

**Si la clé API ne fonctionne toujours pas**, une alternative communautaire bien documentée (`@_davideast/stitch-mcp`) s'authentifie via votre compte Google Cloud plutôt que par clé API :
```bash
npx @_davideast/stitch-mcp init
```
Ce script lance un assistant qui configure l'authentification `gcloud` et ajoute lui-même le serveur à votre configuration MCP — utile si la clé API pose problème ou si vous préférez l'authentification OAuth.

**Pourquoi pas Figma ?** Vous aviez prévu d'exporter la maquette vers Figma — ce n'est plus nécessaire : la connexion directe à Stitch ci-dessus est plus simple et évite cette étape. Pour info si vous y tenez quand même : le serveur MCP **officiel** de Figma ne supporte pas encore Antigravity comme client (confirmé par l'équipe Figma sur son forum) ; seuls des serveurs MCP Figma communautaires fonctionnent aujourd'hui avec Antigravity, avec une fidélité plus inégale que la connexion directe à Stitch.

## Comment utiliser ces prompts

Les 6 prompts ci-dessous correspondent exactement aux 6 phases de la feuille de route du plan d'implémentation (section 11 du document de plan). Collez-les un par un, **dans l'ordre**, dans le même projet Antigravity — ne passez à la phase suivante qu'une fois la précédente vérifiée et committée. Pour chaque écran mentionné, l'agent doit d'abord essayer de le récupérer via le serveur MCP Stitch ; ce n'est qu'à défaut de connexion MCP qu'il se rabat sur la description du fichier `prompts-stitch-maquette-projetpilote.md` référencée entre parenthèses dans chaque prompt.

---

## Prompt 0 — Phase 0 : Initialisation, design réel via MCP, schéma SQL & authentification

```
Tu es l'agent de développement principal du projet "ProjetPilote", un SaaS de gestion de projets de développement financés par des bailleurs de fonds (V1 mono-organisation, PWA mobile).

Avant toute action :
1. Utilise le serveur MCP Stitch pour récupérer mon projet Stitch (liste mes projets Stitch si besoin pour retrouver le bon nom), puis extrais la palette de couleurs exacte, la typographie et les règles de layout. Génère un fichier DESIGN.md à la racine du projet avec ces informations précises (vrais codes couleur, pas d'approximation).
2. Lis intégralement les deux fichiers du dossier docs/ : plan-implementation-saas-projets-bailleurs.md (architecture, schéma SQL complet en section 4, structure du repo en section 9) et prompts-stitch-maquette-projetpilote.md (intention et contenu attendu de chaque écran, en complément du design réel extrait via MCP). DESIGN.md est ta source de vérité visuelle prioritaire ; ces deux documents sont ta source de vérité fonctionnelle et technique.

Tâche (mode Plan) :
3. Initialise un projet Next.js 14 (App Router, TypeScript, ESLint) et configure Tailwind CSS avec les tokens de DESIGN.md.
4. Installe et configure @supabase/supabase-js et @supabase/ssr avec lib/supabase/client.ts, lib/supabase/server.ts et middleware.ts pour la protection des routes, en utilisant les variables de .env.local.
5. Crée l'arborescence de dossiers complète décrite dans la section 9 du plan (app/, lib/, components/, supabase/migrations/, public/).
6. Génère les fichiers de migration SQL dans supabase/migrations/ à partir du DDL complet de la section 4 du plan (toutes les tables, vues, et policies RLS de la section 4.3). Applique ensuite ces migrations au projet Supabase déjà créé via le CLI Supabase (supabase link puis supabase db push) ; si le CLI n'est pas configuré sur cette machine, guide-moi étape par étape pour le faire.
7. Récupère via le serveur MCP Stitch le HTML/CSS de l'écran de connexion de mon projet Stitch et utilise-le comme base directe pour construire l'écran de Connexion en React/Tailwind, branché sur Supabase Auth (email/mot de passe). Si la récupération MCP échoue, reproduis le Prompt 0 du fichier prompts-stitch-maquette-projetpilote.md (logo, carte blanche sur fond bleu marine, formulaire email/mot de passe).

Ouvre le résultat dans ton navigateur intégré pour vérifier l'écran de connexion par rapport à l'original Stitch, corrige les écarts visuels, puis commit avec un message clair.
```

---

## Prompt 1 — Phase 1 : Cadre Logique, PTBA, Budget & Journal des opérations (RBAC)

```
En t'appuyant sur le schéma déjà migré en Phase 0, sur DESIGN.md et sur les documents de docs/, construis le cœur métier du MVP, en mode Plan.

1. Implémente le RBAC : Server Actions et vérifications de rôle (owner, chef_projet, comptable, bailleur_lecture, consultant) selon le tableau de permissions de la section 6 du plan. Chaque mutation doit vérifier le rôle côté serveur ET s'appuyer sur les policies RLS déjà en place — jamais l'un sans l'autre.
2. Crée lib/utils/format-currency.ts : tous les montants de l'application sont en Francs CFA, espace comme séparateur de milliers, aucune décimale, suffixe "FCFA" toujours visible (ex: 15 000 000 FCFA). Réutilise cet utilitaire partout où un montant est affiché, dans cette tâche et dans toutes les suivantes.
3. Construis l'écran Cadre Logique (app/(dashboard)/projects/[projectId]/cadre-logique/) : récupère-le via le serveur MCP Stitch si connecté, sinon respecte la structure en accordéon à 4 niveaux du Prompt 3 du fichier Stitch.
4. Construis l'écran PTBA (.../ptba/) avec les colonnes Q1 à Q4 et la colonne Budget Prévu en FCFA : récupère-le via le serveur MCP Stitch si connecté, sinon réfère-toi au Prompt 4 du fichier Stitch.
5. Construis la nomenclature budgétaire et le Journal des opérations (.../budget/ et .../budget/journal/), avec le formulaire d'ajout en panneau latéral : récupère-le via le serveur MCP Stitch si connecté, sinon réfère-toi au Prompt 6 du fichier Stitch. Les colonnes Reste à Engager, Montant Engagé, Montant Décaissé et Écart ne doivent jamais être saisissables manuellement — elles viennent uniquement des colonnes générées de la migration SQL.
6. Construis l'écran Membres (.../membres/) : récupère-le via le serveur MCP Stitch si connecté, sinon réfère-toi au Prompt 10 du fichier Stitch, pour inviter des utilisateurs et leur assigner un rôle.

Vérifie chaque écran avec le navigateur intégré en le comparant à l'original Stitch, corrige les écarts, et commit à la fin de chaque écran terminé (pas seulement à la fin de la tâche complète).
```

---

## Prompt 2 — Phase 2 : Pilotage financier (consommation budgétaire, alertes, exports)

```
Implémente le pilotage financier du projet, en mode Plan.

1. Construis l'écran Budget — Consommation par ligne budgétaire (.../budget/) à partir de la vue SQL v_budget_consumption déjà migrée : récupère-le via le serveur MCP Stitch si connecté, sinon réfère-toi au Prompt 5 du fichier Stitch (regroupement par catégorie, mini barres de progression intégrées, seuils vert/orange/rouge à 80%/100%). Montants en FCFA via l'utilitaire déjà créé.
2. Crée un composant réutilisable <AlertBadge /> qui calcule la couleur (vert/orange/rouge) à partir d'un taux ou d'un indice fourni en props, et utilise-le partout où c'est pertinent dans l'application existante.
3. Implémente l'export PDF (app/api/export/pdf/route.ts) et l'export Excel (app/api/export/excel/route.ts) du tableau de consommation budgétaire, avec exceljs pour l'Excel.

Vérifie chaque écran avec le navigateur intégré en le comparant à l'original Stitch, puis commit.
```

---

## Prompt 3 — Phase 3 : Moteur EVM & Tableau de bord stratégique

```
Implémente le moteur de Valeur Acquise (EVM) et le tableau de bord stratégique, en mode Plan.

1. Construis l'écran de saisie des tâches EVM et l'écran "Suivi de la Valeur Acquise" (.../evm/) : récupère-le via le serveur MCP Stitch si connecté, sinon réfère-toi au Prompt 7 du fichier Stitch. Sélecteur de "date de contrôle" relié à projects.evm_control_date, tableau des tâches avec PV/EV/CV/SV/CPI/SPI calculés depuis les vues v_evm_tasks et v_evm_indicators déjà migrées.
2. Sur le tableau de bord du projet (app/(dashboard)/projects/[projectId]/page.tsx) : récupère-le via le serveur MCP Stitch si connecté, sinon réfère-toi au Prompt 2 du fichier Stitch. Trois cartes statistiques (Budget Total, EAC, Variance) en FCFA, jauges CPI/SPI globales (composant <GaugeCPISPI />) avec les seuils 0,90/0,99/1, courbe en S (PV/AC/EV cumulés) avec recharts, et l'encart "Top 5 des écarts de coûts" basé sur v_evm_indicators.cv trié par ordre croissant.

Vérifie chaque écran avec le navigateur intégré, puis commit.
```

---

## Prompt 4 — Phase 4 : Marchés & Risques

```
Implémente les modules Marchés et Risques, en mode Plan.

1. Construis l'écran Plan de Passation des Marchés (.../marches/) : récupère-le via le serveur MCP Stitch si connecté, sinon réfère-toi au Prompt 8 du fichier Stitch. Alertes d'échéance (orange si <15 jours, rouge si dépassée) calculées côté serveur à partir de procurement_plan.planned_notice_date et contract_signature_date. Montant estimé en FCFA.
2. Construis l'écran Matrice des Risques (.../risques/) : récupère-le via le serveur MCP Stitch si connecté, sinon réfère-toi au Prompt 9 du fichier Stitch. Heatmap 3x3 Probabilité x Impact et tableau trié par criticité décroissante (colonne générée risks.criticality).

Vérifie chaque écran avec le navigateur intégré, puis commit.
```

---

## Prompt 5 — Phase 5 : Audit, Import Excel & PWA

```
Termine le MVP avec les fonctionnalités de gouvernance et la PWA, en mode Plan.

1. Implémente le journal d'audit immuable (audit_log) : chaque Server Action de mutation déjà créée doit désormais insérer une ligne avant/après dans la même transaction Postgres que la mutation elle-même, comme décrit en section 6 du plan. Vérifie qu'aucune route ou policy d'update/delete n'existe sur cette table.
2. Construis l'Assistant d'import Excel (.../import-excel/) : récupère-le via le serveur MCP Stitch si connecté, sinon réfère-toi au Prompt 11 du fichier Stitch. Upload du fichier .xlsx, parsing serveur avec exceljs, écran de mapping des colonnes vers les champs de l'application, puis import transactionnel avec rapport de lignes importées/ignorées/en erreur.
3. Ajoute le manifest PWA (public/manifest.json), un service worker qui met en cache les pages de lecture (dashboard, listes) pour la consultation hors-ligne, et la version mobile du tableau de bord : récupère-la via le serveur MCP Stitch si connecté, sinon réfère-toi au Prompt 12 du fichier Stitch (navigation par barre d'onglets en bas, mode Mobile dans Stitch).

Vérifie chaque écran avec le navigateur intégré, y compris en réduisant la fenêtre pour simuler le mobile, puis commit.
```

---

## Après la construction

- **Vérification des rôles** : créez un utilisateur de test par rôle (owner, chef_projet, comptable, bailleur_lecture, consultant) et vérifiez manuellement que chacun ne voit/modifie que ce qui est autorisé — ne faites confiance ni à l'UI ni à l'agent sur ce point, testez les policies RLS directement.
- **Déploiement Vercel** : connectez le dépôt Git à un projet Vercel, copiez les mêmes variables que `.env.local` dans les Environment Variables de Vercel, puis déployez.
- **Source de vérité** : si le code généré par Antigravity dérive du schéma ou des règles de gestion décrites dans le plan, c'est le document `plan-implementation-saas-projets-bailleurs.md` qui fait foi — demandez à l'agent de s'y aligner plutôt que l'inverse.
- **Fidélité visuelle** : si DESIGN.md a été généré via MCP, gardez-le comme référence à jour. Si vous modifiez ou régénérez un écran dans Stitch plus tard, redemandez simplement à l'agent de rafraîchir DESIGN.md et l'écran concerné en conséquence.
- **Itération** : pour des ajustements ponctuels après la Phase 5 (corriger un bug, ajuster un libellé), de simples prompts courts en **Fast Mode** suffisent — réservez le Plan Mode aux changements qui touchent plusieurs fichiers ou la base de données.
