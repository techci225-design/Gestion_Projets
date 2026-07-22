# Guide d'Utilisation - ProjetPilote

Bienvenue sur **ProjetPilote**, votre plateforme intelligente de gestion et de suivi de projets de développement (standards Bailleurs de fonds : Banque Mondiale, BID, etc.). Ce guide vous accompagne pas-à-pas dans l'utilisation de l'application.

---

## 1. Démarrage et Espaces de Travail (Organisations)

### 1.1 Connexion et Inscription
Lors de votre première connexion, un "Espace personnel" est automatiquement créé pour vous. 

### 1.2 Gérer les Membres et Rôles
Vous pouvez inviter vos collaborateurs et clients dans votre espace de travail :
- Allez dans **Paramètres de l'organisation** > **Membres**.
- Cliquez sur **Inviter un membre** et renseignez son email.
- **Rôles disponibles** :
  - `Propriétaire (Owner)` : Contrôle total (Création, suppression, facturation).
  - `Chef de Projet` : Gestion opérationnelle, validation EVM, tâches.
  - `Comptable` : Accès spécifique au budget et à la saisie du journal.
  - `Consultant` : Droits restreints aux tâches qui lui sont assignées.
  - `Bailleur (Lecture seule)` : Visionnage des tableaux de bord et rapports uniquement.

---

## 2. Créer et Configurer un Projet

Pour démarrer un nouveau projet :
1. Depuis le tableau de bord, cliquez sur **Nouveau Projet**.
2. **L'Assistant (Wizard)** vous guide en 4 étapes :
   - **Étape 1 : Informations générales** (Nom, objectifs, dates, devise locale, budget total).
   - **Étape 2 : Cadre Logique** (Saisissez l'objectif global, les objectifs spécifiques, les résultats attendus et les activités).
   - **Étape 3 : Budget & Financement** (Ajoutez vos bailleurs, contreparties locales, et définissez les grandes lignes budgétaires).
   - **Étape 4 : Validation** (Vérifiez le résumé et validez la création).

---

## 3. Le Journal Budgétaire (Saisie Assistée par IA)

La saisie des dépenses et engagements se fait dans l'onglet **Budget > Journal**.

### 3.1 Nouvelle Opération
Cliquez sur **Nouvelle Opération**. Renseignez le code, la phase, le statut (Planifié, Engagé, Décaissé) et le coût prévu.

### 3.2 L'Assistant IA (✨ Suggestion IA)
Pour gagner du temps, après avoir saisi la description de votre tâche (ex: "Formation des agents de terrain"), cliquez sur le bouton **✨ Suggestion IA**. L'intelligence artificielle analysera votre description et sélectionnera automatiquement la ligne budgétaire la plus appropriée.

### 3.3 Sécurité et Alertes d'Anomalies
L'application surveille activement vos saisies pour éviter les dépassements incontrôlés :
- **Alerte Orange (> 20%)** : Si votre coût réel dépasse de 20% le coût prévu, une alerte vous demandera de confirmer votre saisie.
- **Alerte Rouge Critique (> 100%)** : Si le coût réel est plus du double du coût prévu, l'enregistrement est bloqué. Vous devrez taper manuellement **OUI** pour confirmer cette anomalie majeure.

---

## 4. Suivi des Performances (EVM) & Analyse Intelligente

L'onglet **EVM (Earned Value Management)** est le cœur analytique de votre projet. Il compare ce qui était prévu avec ce qui est réellement achevé et dépensé.

### 4.1 Arrêtés des comptes
Vous pouvez enregistrer des "Arrêtés" (Snapshots) réguliers pour figer les performances (CPI, SPI) à une date précise.

### 4.2 L'Analyse Intelligente 🤖
Au sommet de la page EVM, cliquez sur le bouton d'actualisation de **l'Analyse Intelligente**.
L'IA (Claude) audite instantanément toutes les données de votre projet et vous génère :
- Une **Santé Globale** (Optimale, Satisfaisante, Vigilance, Critique).
- Un résumé narratif de la situation.
- Une **Projection financière** (Coût final estimé et écart prévisionnel).
- Des **Points d'attention** et des **Recommandations concrètes** pour redresser la barre si nécessaire.

---

## 5. Plan de Passation des Marchés (PPM)

Gérez vos appels d'offres et contrats dans l'onglet **PPM**.
- Suivez les étapes clés de chaque marché : Avis général, DAO, Réception des offres, Évaluation, et Signature.
- Identifiez facilement les retards grâce aux indicateurs visuels.

---

## 6. Matrice des Risques

Dans l'onglet **Risques** :
- Répertoriez les menaces qui pèsent sur votre projet.
- Évaluez leur probabilité (1-5) et leur impact (1-5).
- Assignez un propriétaire et définissez des plans de mitigation.

---

## 7. Génération du Rapport PDF Automatisé

À tout moment, vous pouvez générer un rapport de supervision officiel pour vos bailleurs de fonds :
- Cliquez sur **Exporter > Rapport Complet (PDF)**.
- Le document généré contient l'ensemble de vos données (EVM, Budget, Risques, PPM).
- **Le plus :** Une **SECTION 0 : RÉSUMÉ EXÉCUTIF** est automatiquement rédigée par l'Intelligence Artificielle en tête de document, offrant une synthèse professionnelle prête à être soumise à votre comité de pilotage.
