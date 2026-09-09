import { test, expect } from '@playwright/test'

test('search palette opens with keyboard shortcut', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('Meta+k')
  await expect(page.getByPlaceholder(/search/i)).toBeVisible()
})

test('search returns results for valid query', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('Meta+k')
  const searchInput = page.getByPlaceholder(/search/i)
  await searchInput.fill('array')
  await expect(page.locator('mark, [class*="highlight"]').first()).toBeVisible()
})

test('search palette closes with Escape', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('Meta+k')
  await expect(page.getByPlaceholder(/search/i)).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByPlaceholder(/search/i)).not.toBeVisible()
})

test('click search result navigates to concept', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('Meta+k')
  await page.getByPlaceholder(/search/i).fill('binary search')
  const result = page.locator('a[href^="/concept/"], [role="option"]').first()
  await result.click()
  await expect(page).toHaveURL(/\/concept\//)
})
