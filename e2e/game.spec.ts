import { expect, test, type Locator, type Page } from '@playwright/test';

async function openGame(page: Page, difficulty: string, size = 8): Promise<void> {
  await page.goto(`/game?difficulty=${difficulty}&size=${size}`);
  await expect(page.getByTestId('game-screen')).toHaveAttribute('aria-label', '遊戲已就緒');
}

async function markQueen(cell: Locator): Promise<void> {
  await cell.click();
  await expect(cell).toHaveAttribute('aria-label', /叉號/);
  await cell.click();
  await expect(cell).toHaveAttribute('aria-label', /皇后/);
}

async function finishBeginnerSixBySix(page: Page): Promise<void> {
  const remainingQueens = [[0,2],[2,3],[3,5],[5,4]];
  for (const [row, column] of remainingQueens.slice(0, -1)) await markQueen(page.getByTestId(`cell-${row}-${column}`));
  const [lastRow, lastColumn] = remainingQueens.at(-1)!;
  const lastCell = page.getByTestId(`cell-${lastRow}-${lastColumn}`);
  await lastCell.click();
  await expect(lastCell).toHaveAttribute('aria-label', /叉號/);
  await lastCell.click();
  await expect(page.getByTestId('completion-screen')).toBeVisible();
}

test('opens a new game, cycles marks, undoes and restarts', async ({ page }) => {
  await openGame(page, 'advanced', 12);
  await expect(page.getByTestId('game-board')).toBeVisible();
  await expect(page.getByText('高級 · 12×12')).toBeVisible();
  await expect(page.locator('[data-testid^="cell-"]')).toHaveCount(144);
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
  const givens = page.locator('[data-testid^="cell-"][aria-label*="皇后，預置"]');
  await expect(givens).toHaveCount(2);
  const given = givens.first();
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

test('an unfinished game can be continued after leaving the board', async ({ page }) => {
  await openGame(page, 'expert', 9);
  const cell = page.getByTestId('cell-0-0');
  await cell.click();
  await expect(cell).toHaveAttribute('aria-label', /叉號/);
  await page.goto('/');
  await expect(page.getByTestId('continue-game')).toContainText('進階 · 9×9 · 1 步');
  await page.getByTestId('continue-game').click();
  await expect(page.getByTestId('game-screen')).toHaveAttribute('aria-label', '遊戲已就緒');
  await expect(page.getByTestId('cell-0-0')).toHaveAttribute('aria-label', /叉號/);
});

test('home exposes campaign and keeps challenge locked before level 200', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('campaign-mode')).toBeEnabled();
  await expect(page.getByTestId('challenge-mode')).toBeDisabled();
  await expect(page.getByText('完成初級第 200 關後解鎖')).toBeVisible();
});

test('campaign describes every level as fixed and replayable', async ({ page }) => {
  await page.goto('/campaign');
  await expect(page.getByText('固定關卡 · 所有玩家相同 · 完成後可重玩')).toBeVisible();
});

test('tenth campaign level advances normally after completion and persistence', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('equireign.player-progress.v1', JSON.stringify({
      version: 1,
      progress: { completedCampaignLevel: 9, challengeSuccessCounts: {}, firstClearResults: {} },
    }));
  });
  await page.goto('/game?mode=campaign&level=10&difficulty=beginner&size=6');
  await expect(page.getByTestId('game-screen')).toHaveAttribute('aria-label', '遊戲已就緒');
  await finishBeginnerSixBySix(page);
  await expect(page.getByTestId('next-level')).toBeEnabled();
  await expect(page.getByTestId('next-level')).toContainText('下一關');
  await expect(page.getByTestId('return-campaign')).toHaveCount(0);
});

test('replayed campaign level returns to campaign instead of implying progression', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('equireign.player-progress.v1', JSON.stringify({
      version: 1,
      progress: { completedCampaignLevel: 3, challengeSuccessCounts: {}, firstClearResults: {} },
    }));
  });
  await page.goto('/game?mode=campaign&level=3&difficulty=beginner&size=6');
  await expect(page.getByTestId('game-screen')).toHaveAttribute('aria-label', '遊戲已就緒');
  await finishBeginnerSixBySix(page);
  await expect(page.getByTestId('return-campaign')).toBeEnabled();
  await expect(page.getByTestId('return-campaign')).toContainText('返回闖關');
  await expect(page.getByTestId('next-level')).toHaveCount(0);
  await page.getByTestId('return-campaign').click();
  await expect(page.getByText('第 4 關')).toBeVisible();
  await expect(page.getByText('目前進度')).toBeVisible();
});

test('campaign game resumes with its mode and level intact', async ({ page }) => {
  await page.goto('/game?mode=campaign&level=1&difficulty=beginner&size=6');
  await expect(page.getByTestId('game-screen')).toHaveAttribute('aria-label', '遊戲已就緒');
  const cell = page.getByTestId('cell-0-0');
  await cell.click();
  await expect(cell).toHaveAttribute('aria-label', /叉號/);
  await page.goto('/');
  await expect(page.getByTestId('continue-game')).toContainText('初級 · 6×6 · 1 步');
  await page.getByTestId('continue-game').click();
  await expect(page.getByTestId('game-screen')).toHaveAttribute('aria-label', '遊戲已就緒');
  await expect(page.getByTestId('cell-0-0')).toHaveAttribute('aria-label', /叉號/);
});

test('campaign lets players select and replay any unlocked level', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('equireign.player-progress.v1', JSON.stringify({
      version: 1,
      progress: { completedCampaignLevel: 3, challengeSuccessCounts: {}, firstClearResults: {} },
    }));
  });
  await page.goto('/campaign');
  await expect(page.getByText('第 4 關')).toBeVisible();
  await expect(page.getByText('目前進度')).toBeVisible();
  await page.getByTestId('campaign-previous-level').click();
  await expect(page.getByText('第 3 關')).toBeVisible();
  await expect(page.getByText('已完成 · 可重玩')).toBeVisible();
  await expect(page.getByTestId('campaign-start')).toContainText('重玩此關');
  await page.getByTestId('campaign-next-level').click();
  await expect(page.getByText('第 4 關')).toBeVisible();
  await expect(page.getByTestId('campaign-start')).toContainText('開始闖關');
});
