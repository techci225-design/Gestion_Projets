# Tests E2E

Exécuter les tests locaux :

```powershell
npx playwright install chromium
npm run test:e2e
```

Le test de redirection anonyme ne requiert aucune donnée de test. Le scénario
`FUNDER_READONLY` nécessite un compte de test existant, membre du projet ciblé :

```text
E2E_READONLY_EMAIL=lecteur-e2e@example.test
E2E_READONLY_PASSWORD=mot-de-passe-du-compte-de-test
E2E_READONLY_PROJECT_ID=uuid-du-projet-de-test
```

Définir ces variables dans l'environnement de l'exécution ou dans un fichier
local non versionné. Ne jamais utiliser un compte utilisateur réel ni un projet
de production : les futurs scénarios de mutation devront utiliser des données
E2E dédiées et réinitialisables.

Pour viser un environnement déjà démarré, définir également
`PLAYWRIGHT_BASE_URL`, par exemple `http://127.0.0.1:3000`.
