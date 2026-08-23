import { expect, test } from '@playwright/test';

test('opens a new game, cycles marks, undoes and restarts', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('difficulty-advanced').click();
  await expect(page.getByTestId('game-board')).toBeVisible();
  const cell = page.getByTestId('cell-0-0');
  await cell.click();
  await expect(cell).toHaveAttribute('aria-label', /叉號/);
  await cell.click();
  await expect(cell).toHaveAttribute('aria-label', /皇后/);
  await page.getByTestId('undo-button').click();
  await expect(cell).toHaveAttribute('aria-label', /叉號/);
  await page.getByTestId('restart-button').click();
  await expect(cell).toHaveAttribute('aria-label', /空白/);
});

test('given queens stay locked through restart', async ({ page }) => {
  await page.goto('/game?difficulty=beginner');
  const given = page.getByTestId('cell-1-0');
  await expect(given).toHaveAttribute('aria-disabled', 'true');
  await given.click({ force: true });
  await expect(given).toHaveAttribute('aria-label', /皇后，預置/);
  await page.getByTestId('restart-button').click();
  await expect(given).toHaveAttribute('aria-label', /皇后，預置/);
});

test('direct conflicts are always shown while feasibility follows difficulty', async ({ page }) => {
  await page.goto('/game?difficulty=expert');
  const first = page.getByTestId('cell-0-0'); const adjacent = page.getByTestId('cell-1-1');
  await first.click(); await first.click();
  await expect(first).not.toHaveAttribute('aria-label', /錯誤/);
  await adjacent.click(); await adjacent.click();
  await expect(first).toHaveAttribute('aria-label', /錯誤/);

  await page.goto('/game?difficulty=advanced');
  const wrong = page.getByTestId('cell-0-0');
  await wrong.click(); await wrong.click();
  await expect(wrong).toHaveAttribute('aria-label', /錯誤/);

  await page.goto('/game?difficulty=king');
  const kingCell = page.getByTestId('cell-0-0');
  await kingCell.click(); await kingCell.click();
  await expect(kingCell).not.toHaveAttribute('aria-label', /錯誤/);
});

test('Expert hints highlight without revealing and stop after three', async ({ page }) => {
  await page.goto('/game?difficulty=expert');
  const hint = page.getByTestId('hint-button');
  for (const expected of [2, 1, 0]) {
    await hint.click();
    const target = page.getByTestId('hint-target');
    await expect(target).toBeVisible();
    await target.click();
    await expect(hint).toContainText(`提示 ${expected}`);
  }
  await expect(hint).toBeDisabled();
});

test('a complete legal board reaches the completion screen', async ({ page }) => {
  await page.goto('/game?difficulty=advanced');
  for (const [row, column] of [[0,6],[1,2],[2,4],[3,7],[4,5],[5,0],[6,3],[7,1]]) {
    const cell = page.getByTestId(`cell-${row}-${column}`);
    await cell.click(); await cell.click();
  }
  await expect(page.getByTestId('completion-screen')).toBeVisible();
});
