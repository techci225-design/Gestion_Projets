import { expect, test } from '@playwright/test'

test('un visiteur non authentifié est redirigé vers la connexion', async ({ page }) => {
  await page.goto('/projects')

  await expect(page).toHaveURL(/\/login/)
  await expect(page.getByRole('heading', { name: 'Smart-Project-Manager' })).toBeVisible()
})
