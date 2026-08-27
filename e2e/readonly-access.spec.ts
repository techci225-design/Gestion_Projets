import { expect, test } from '@playwright/test'

const email = process.env.E2E_READONLY_EMAIL
const password = process.env.E2E_READONLY_PASSWORD
const projectId = process.env.E2E_READONLY_PROJECT_ID

async function signIn(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.locator('#email').fill(email!)
  await page.locator('#password').fill(password!)
  await page.getByRole('button', { name: 'Se connecter' }).click()
  await expect(page).toHaveURL(/\/projects/)
}

test.describe('compte FUNDER_READONLY', () => {
  test.skip(!email || !password || !projectId, 'Configurez les variables E2E_READONLY_* pour exécuter ce scénario.')

  test('ne voit pas les actions de modification des risques et marchés', async ({ page }) => {
    await signIn(page)

    await page.goto(`/projects/${projectId}/risques`)
    await expect(page.getByRole('button', { name: 'Déclarer un Risque' })).toHaveCount(0)

    await page.goto(`/projects/${projectId}/marches`)
    await expect(page.getByRole('button', { name: 'Nouveau Marché' })).toHaveCount(0)
  })
})
