import { expect, test } from '@playwright/test'

test('empêche la création d’un compte lorsque les mots de passe diffèrent', async ({ page }) => {
  await page.goto('/register')

  await page.locator('input[name="firstName"]').fill('Test')
  await page.locator('input[name="lastName"]').fill('E2E')
  await page.locator('input[name="email"]').fill('test.e2e@example.test')
  await page.locator('input[name="password"]').fill('MotDePasse1')
  await page.locator('input[name="confirmPassword"]').fill('MotDePasse2')
  await page.getByRole('button', { name: 'Continuer' }).click()

  await expect(page.getByText('Les mots de passe ne correspondent pas')).toBeVisible()
})
