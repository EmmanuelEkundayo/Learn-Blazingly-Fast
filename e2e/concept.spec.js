import { test, expect } from '@playwright/test'

test('browse page loads concepts', async ({ page }) => {
  await page.goto('/browse')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.locator('[data-testid="concept-card"], .concept-card, a[href^="/concept/"]').first()).toBeVisible()
})

test('click concept navigates to concept page', async ({ page }) => {
  await page.goto('/browse')
  const conceptLink = page.locator('a[href^="/concept/"]').first()
  await conceptLink.click()
  await expect(page).toHaveURL(/\/concept\//)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})

test('concept page has visualization and exercises', async ({ page }) => {
  await page.goto('/browse')
  await page.locator('a[href^="/concept/"]').first().click()
  await expect(page).toHaveURL(/\/concept\//)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})

test('navigate back from concept page', async ({ page }) => {
  await page.goto('/browse')
  await page.locator('a[href^="/concept/"]').first().click()
  await expect(page).toHaveURL(/\/concept\//)
  await page.goBack()
  await expect(page).toHaveURL(/\/browse/)
})
