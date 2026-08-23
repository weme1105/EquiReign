import { expect, test, type Locator, type Page } from '@playwright/test';

async function openGame(page: Page, difficulty: string): Promise<void> {
  await page.goto(`/game?difficulty=${difficulty}`);
  await expect(page.getByTestId('game-screen')).toHaveAttribute('aria-label', '遊戲已就緒');
}

async function markQueen(cell: Locator): Promise<void> {
  await cell.click();
  await expect(cell).toHaveAttribute('aria-label', /叉號/);
  await cell.click();
  await expect(cell).toHaveAttribute('aria-label', /皇后/);
}

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
  await openGame(page, 'beginner');
  const given = page.getByTestId('cell-1-0');
  await expect(given).toHaveAttribute('aria-disabled', 'true');
  await given.click({ force: true });
  await expect(given).toHaveAttribute('aria-label', /皇后，預置/);
  await page.getByTestId('restart-button').click();
  await expect(given).toHaveAttribute('aria-label', /皇后，預置/);
});

test('direct conflicts are always shown while feasibility follows difficulty', async ({ page }) => {
  await openGame(page, 'expert');
  const first = page.getByTestId('cell-0-0'); const adjacent = page.getByTestId('cell-1-1');
  await markQueen(first);
  await expect(first).not.toHaveAttribute('aria-label', /錯誤/);
  await markQueen(adjacent);
  await expect(first).toHaveAttribute('aria-label', /錯誤/);

  await openGame(page, 'advanced');
  const wrong = page.getByTestId('cell-0-0');
  await markQueen(wrong);
  await expect(wrong).toHaveAttribute('aria-label', /錯誤/);

  await openGame(page, 'king');
  const kingCell = page.getByTestId('cell-0-0');
  await markQueen(kingCell);
  await expect(kingCell).not.toHaveAttribute('aria-label', /錯誤/);
});

test('Expert hints highlight without revealing and stop after three', async ({ page }) => {
  await openGame(page, 'expert');
  const hint = page.getByTestId('hint-button');
  for (const expected of [2, 1, 0]) {
    await hint.click();
    await expect(hint).toContainText(`提示 ${expected}`);
    const target = page.getByTestId('hint-target');
    await expect(target).toBeVisible();
    await target.click();
  }
  await expect(hint).toHaveAttribute('aria-disabled', 'true');
});

test('a complete legal board reaches the completion screen', async ({ page }) => {
  await openGame(page, 'advanced');
  const solution = [[0,6],[1,2],[2,4],[3,7],[4,5],[5,0],[6,3],[7,1]];
  for (const [row, column] of solution.slice(0, -1)) {
    const cell = page.getByTestId(`cell-${row}-${column}`);
    await markQueen(cell);
  }
  const [lastRow, lastColumn] = solution.at(-1)!;
  const lastCell = page.getByTestId(`cell-${lastRow}-${lastColumn}`);
  await lastCell.click();
  await expect(lastCell).toHaveAttribute('aria-label', /叉號/);
  await lastCell.click();
  await expect(page.getByTestId('completion-screen')).toBeVisible();
});
