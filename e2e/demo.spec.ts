import { expect, test } from '@playwright/test';

test('demo picker exposes twelve fixed showcase levels', async ({ page }) => {
  await page.goto('/demo');
  await expect(page.getByText('特殊規則 Demo')).toBeVisible();
  await expect(page.locator('[data-testid^="demo-"]')).toHaveCount(12);
  await expect(page.getByText('單冰封', { exact: true })).toBeVisible();
  await expect(page.getByText('單遺失', { exact: true })).toBeVisible();
  await expect(page.getByText('冰封＋遺失', { exact: true })).toBeVisible();
  await expect(page.getByText('冰封＋遺失＋雙色域', { exact: true })).toBeVisible();
});

test('single frozen demo renders frozen cells without lost cells', async ({ page }) => {
  await page.goto('/game?demo=frozen-1');
  await expect(page.getByTestId('game-screen')).toHaveAttribute('aria-label', '遊戲已就緒');
  await expect(page.locator('[data-testid^="frozen-"]')).toHaveCount(1);
  await expect(page.locator('[data-testid^="lost-"]')).toHaveCount(0);
});

test('single lost demo renders lost cells without frozen cells', async ({ page }) => {
  await page.goto('/game?demo=lost-1');
  await expect(page.getByTestId('game-screen')).toHaveAttribute('aria-label', '遊戲已就緒');
  await expect(page.locator('[data-testid^="lost-"]')).toHaveCount(1);
  await expect(page.locator('[data-testid^="frozen-"]')).toHaveCount(0);
});

test('mixed demo renders both frozen and lost cells', async ({ page }) => {
  await page.goto('/game?demo=frozen-lost-1');
  await expect(page.getByTestId('game-screen')).toHaveAttribute('aria-label', '遊戲已就緒');
  await expect(page.locator('[data-testid^="frozen-"]')).toHaveCount(2);
  await expect(page.locator('[data-testid^="lost-"]')).toHaveCount(1);
});

test('dual-color demo keeps dual regions hidden during play', async ({ page }) => {
  await page.goto('/game?demo=frozen-lost-dual-1');
  await expect(page.getByTestId('game-screen')).toHaveAttribute('aria-label', '遊戲已就緒');
  await expect(page.locator('[data-testid^="frozen-"]')).toHaveCount(2);
  await expect(page.locator('[data-testid^="lost-"]')).toHaveCount(1);
  await expect(page.locator('[data-testid^="dual-region-"]')).toHaveCount(0);
  await expect(page.getByText('雙色域目前依正式規則在遊戲中隱藏，通關結算才揭示。')).toBeVisible();
});
