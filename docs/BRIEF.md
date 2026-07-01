# BRIEF — ProjetPilote
## Document de référence pour l'agent Antigravity

> Lis ce fichier en premier avant chaque tâche, sans exception. Il est la source de vérité absolue du projet. En cas de contradiction entre ce fichier et une décision que tu semblerais avoir prise dans un tour précédent, c'est ce fichier qui prime.

---

## 1. Ce que nous construisons

**ProjetPilote** est un SaaS web de gestion de projets financés par des bailleurs de fonds (Banque Mondiale, BID, ONG, fonds publics), destiné aux consultants et entrepreneurs africains francophones. Il transforme une matrice Excel de gouvernance financière en application web moderne, accessible sur navigateur et en PWA mobile.

- **Portée V1** : mono-organisation, projets multiples, accès multi-utilisateurs avec rôles.
- **Stack** : Next.js 14 (App Router, TypeScript), Supabase (Postgres + Auth + Storage + Realtime), Tailwind CSS, déployé sur Vercel.
- **Langue de l'interface** : français uniquement. Aucun libellé en anglais dans l'UI.

---

## 2. Documents à lire dans ce dossier

| Fichier | Contenu | Quand le lire |
|---|---|---|
| `BRIEF.md` (ce fichier) | Contexte, règles absolues, points de vigilance | Avant CHAQUE tâche |
| `plan-implementation-saas-projets-bailleurs.md` | Architecture complète, schéma SQL DDL (section 4), RLS (section 4.3), rôles et permissions (section 6), structure du repo (section 9) | Avant toute tâche qui touche la base de données, les Server Actions ou la structure de fichiers |
| `prompts-antigravity-construction-projetpilote.md` | Les 6 prompts de construction par phase (Phase 0 à Phase 5) + configuration MCP Stitch | Pour connaître l'ordre et le périmètre de chaque phase |
| `prompt-backend-complet-projetpilote.md` | Prompt backend autonome avec les 3 scripts de test de non-régression | Si tu construis le backend seul avant l'UI |

---

## 3. Règles métier absolues — ne jamais déroger

### 3.1 Devise
- **Franc CFA uniquement** partout dans l'application. Code ISO : `XOF`.
- Format exact dans l'UI : espace comme séparateur de milliers, zéro décimale, suffixe "FCFA" sur la même ligne que le montant. **Exemples :** `15 000 FCFA` · `2 500 000 FCFA` · `-150 000 FCFA`.
- **Interdit** : `$`, `€`, virgule comme séparateur, décimales (`.00`), FCFA sur une ligne séparée du montant.
- L'utilitaire de formatage se trouve dans `lib/utils/format-currency.ts` — utilise-le partout, ne formate jamais un montant à la main dans un composant.

### 3.2 Calculs automatiques — jamais exposés en écriture
Les colonnes suivantes sont calculées automatiquement (colonnes générées SQL ou vues). Elles ne doivent **jamais** apparaître dans un formulaire de saisie ni être modifiables via une Server Action :

| Champ | Règle de calcul |
|---|---|
| `reste_a_engager` | = `planned_cost` si statut = `planifie`, sinon 0 |
| `montant_engage` | = `planned_cost` si statut = `engage`, sinon 0 |
| `montant_decaisse` | = `actual_cost` (ou `planned_cost` si null) si statut = `decaisse`, sinon 0 |
| `ecart_budgetaire` | = `planned_cost − actual_cost` si statut = `decaisse`, sinon 0 |
| `pv` (EVM) | = BAC × prorata temporis à la date de contrôle (`evm_control_date`) |
| `ev` (EVM) | = `budget_allocated × percent_complete / 100` |
| `cv`, `sv`, `cpi`, `spi`, `eac` | Calculés depuis `v_evm_indicators` |
| `criticality` (risques) | = `probability × impact` |
| `taux_consommation` | = (engagé + décaissé) / budget initial |

### 3.3 Statuts du Journal des opérations
Les quatre seuls statuts valides sont : `planifie`, `engage`, `decaisse`, `annulé`. Ils sont saisis manuellement via un menu déroulant. Tout le reste est calculé. La transition de statut est l'unique action utilisateur qui déclenche les recalculs.

### 3.4 Rôles et permissions (résumé)
Voir le tableau complet en section 6 du plan. Points non négociables :
- `bailleur_lecture` : **lecture seule sur tous les modules sans exception**. Aucune policy INSERT/UPDATE/DELETE ne doit le mentionner.
- `audit_log` : **aucun rôle ne peut modifier ni supprimer** une ligne d'audit, y compris `owner`. La table est en insert-only par conception.
- Chaque Server Action doit (dans une seule transaction) : vérifier le rôle → écrire → insérer dans `audit_log`. Ces trois étapes sont indissociables.

### 3.5 Bug SQL corrigé dans la vue EVM
Dans `v_evm_tasks`, le calcul de PV utilise une division d'entiers (résultat de `date - date` en Postgres = nombre de jours, pas un intervalle). La formule correcte à utiliser est :
```sql
((p.evm_control_date - t.date_start)::numeric / (t.date_end - t.date_start)::numeric)
```
Ne jamais utiliser `extract(epoch from (date - date))` — c'est invalide en Postgres car le résultat d'une soustraction de deux `date` est un `integer`, pas un `interval`.

---

## 4. Règles de design — ce que l'agent doit respecter

### 4.1 Palette de couleurs (tokens Tailwind)
| Rôle | Couleur | Hex | Usage |
|---|---|---|---|
| Primaire | Bleu marine | `#1E3A5F` | Sidebar, boutons principaux, headers |
| Positif | Vert émeraude | `#16A34A` | CPI/SPI ≥ 1, statut Décaissé, badge Actif |
| Vigilance | Orange | `#F59E0B` | CPI/SPI entre 0,90 et 0,99, alerte budget >80%, échéance <15j |
| Alerte | Rouge | `#DC2626` | CPI/SPI < 0,90, budget >100%, échéance dépassée, écart négatif, Variance négative |
| Neutre | Blanc + gris clair | — | Fonds de cartes, tableaux |

Orange et rouge sont **exclusivement réservés aux alertes**. Ne jamais les utiliser comme couleurs décoratives.

### 4.2 Typographie et espacement
- Police : Inter (Google Fonts, déjà disponible dans Next.js via `next/font`).
- Coins arrondis : `rounded-lg` (8px) sur les cartes, modals, boutons.
- Ombres : `shadow-sm` discrètes, pas de bordures dures sur les cartes.

### 4.3 Navigation
- **Web** : barre latérale fixe à gauche. Logo en haut. Sous-menu du projet actif en dessous des liens principaux. Avatar + nom utilisateur en bas.
- **Mobile (PWA)** : barre d'onglets fixe en bas avec 5 entrées : Accueil / Budget / EVM / Risques / Plus. Pas de sidebar.

### 4.4 Modules et noms exacts des routes
| Module | Route | Libellé dans l'UI |
|---|---|---|
| Connexion | `/login` | — |
| Liste des projets | `/projects` | Mes projets |
| Tableau de bord | `/projects/[id]` | Tableau de bord EVM |
| Cadre Logique | `/projects/[id]/cadre-logique` | Cadre Logique |
| PTBA | `/projects/[id]/ptba` | PTBA |
| Nomenclature budget | `/projects/[id]/budget` | Budget |
| Journal des opérations | `/projects/[id]/budget/journal` | Journal des opérations |
| Suivi EVM | `/projects/[id]/evm` | EVM |
| Marchés | `/projects/[id]/marches` | Passation des Marchés |
| Risques | `/projects/[id]/risques` | Risques |
| Membres | `/projects/[id]/membres` | Membres |
| Import Excel | `/projects/[id]/import-excel` | Assistant d'import |

### 4.5 Badges de statut du Journal (couleurs exactes)
| Statut | Badge Tailwind |
|---|---|
| Planifié | `bg-gray-100 text-gray-600` |
| Engagé | `bg-blue-100 text-blue-700` |
| Décaissé | `bg-green-100 text-green-700` |
| Annulé | `bg-red-100 text-red-500 line-through` |

### 4.6 Badges de rôle dans Membres
| Rôle | Couleur |
|---|---|
| Propriétaire | `bg-blue-900 text-white` |
| Chef de projet | `bg-blue-100 text-blue-800` |
| Comptable | `bg-violet-100 text-violet-800` |
| Bailleur (lecture seule) | `bg-gray-100 text-gray-600` |
| Consultant | `bg-green-100 text-green-700` |

### 4.7 Seuils d'alerte CPI/SPI (standards Banque Mondiale / BID)
| Valeur | Couleur | Libellé |
|---|---|---|
| ≥ 1 | Vert `#16A34A` | Sous budget / Dans les délais |
| 0,90 – 0,99 | Orange `#F59E0B` | Zone de vigilance |
| < 0,90 | Rouge `#DC2626` | Alerte critique |

---

## 5. Points de vigilance pour l'agent

1. **Jamais de logique de calcul côté client.** Tous les chiffres affichés dans l'UI proviennent des vues SQL ou des colonnes générées. Le frontend se contente d'afficher ce que la base de données renvoie.

2. **Jamais de localStorage ni de sessionStorage** dans les composants React — non supportés dans cet environnement. Utilise `useState`/`useReducer` pour l'état local.

3. **Server Actions pour toutes les mutations** — pas de Route Handler pour les opérations CRUD. Les Route Handlers sont réservés aux exports (PDF, Excel) et à l'import Excel (parsing de fichier binaire).

4. **`"use client"`** uniquement pour les composants réellement interactifs (graphiques Recharts, formulaires avec état local, drawer/modal). Tous les autres composants restent Server Components.

5. **Supabase Realtime** sur `operations_journal` et `wbs_tasks` pour mettre à jour le tableau de bord sans rechargement manuel.

6. **Formatage des montants** : toujours passer par `lib/utils/format-currency.ts`. Ne jamais écrire `${amount.toLocaleString()} FCFA` directement dans un composant.

7. **Tests de non-régression** : les trois scripts dans `scripts/` (journal, EVM, RLS) doivent rester verts après chaque phase. Relance-les si tu modifies le schéma ou les Server Actions.

8. **Commit Git** après chaque écran ou module terminé et vérifié — pas seulement en fin de phase.

---

## 6. Valeurs de test EVM de référence (golden values)

Pour vérifier que le moteur EVM produit les bons résultats, utilise ces valeurs exactes :

- `evm_control_date` = `2026-04-01`
- `date_start` = `2026-01-01`, `date_end` = `2026-06-30`
- `budget_allocated` = `1 000 000`, `percent_complete` = `40`, `actual_cost` = `450 000`
- Jours écoulés sur la période : 90 jours sur 180 → prorata = 50 %

| Indicateur | Valeur attendue |
|---|---|
| PV | 500 000 |
| EV | 400 000 |
| AC | 450 000 |
| CV (EV − AC) | −50 000 |
| SV (EV − PV) | −100 000 |
| CPI (EV/AC) | ≈ 0,889 |
| SPI (EV/PV) | 0,800 |
| EAC (BAC/CPI) | ≈ 1 125 000 |

Tolérance acceptable : ±1 FCFA sur les montants, ±0,001 sur les indices.
