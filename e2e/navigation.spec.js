import { test, expect } from '@playwright/test'

test('home page loads with title and hero', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/Learn Blazingly Fast/)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})

test('navigate to browse page', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: /browse/i }).first().click()
  await expect(page).toHaveURL(/\/browse/)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})

test('navigate to playground', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: /playground/i }).first().click()
  await expect(page).toHaveURL(/\/playground/)
})

test('navigate to leaderboard', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: /leaderboard/i }).first().click()
  await expect(page).toHaveURL(/\/leaderboard/)
})

test('navigate back to home from browse', async ({ page }) => {
  await page.goto('/browse')
  await page.getByRole('link', { name: /home/i }).first().click()
  await expect(page).toHaveURL(/\/$/)
})
