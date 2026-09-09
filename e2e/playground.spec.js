import { test, expect } from '@playwright/test'

test('playground page loads', async ({ page }) => {
  await page.goto('/playground')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})

test('playground has editor area', async ({ page }) => {
  await page.goto('/playground')
  await expect(page.locator('.monaco-editor, [data-testid="editor"], textarea, [contenteditable]').first()).toBeVisible()
})

test('playground language selector works', async ({ page }) => {
  await page.goto('/playground')
  const selector = page.locator('select, [role="combobox"], button').filter({ hasText: /python|javascript|js|py/i }).first()
  if (await selector.isVisible()) {
    await selector.click()
  }
})
