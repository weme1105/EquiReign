import { expect, test } from '@playwright/test';

const level100Puzzle = {
  level: 100,
  puzzleId: 'campaign-100-offline-fixture',
  size: 6,
  difficulty: 'beginner',
  regionMap: [1,0,0,2,3,3, 1,1,0,2,3,3, 1,1,2,2,2,3, 4,2,2,3,3,3, 4,4,5,5,5,3, 4,4,4,5,5,5],
  givenQueenCellIndexes: [2, 28],
  version: 1,
};

test('campaign level without bundle or cache reports that download is required', async ({ page }) => {
  await page.goto('/game?mode=campaign&level=100&difficulty=beginner&size=6');
  await expect(page.getByTestId('game-screen')).toHaveAttribute('aria-label', '關卡資料無法讀取');
  await expect(page.getByText('這批關卡尚未下載，請連線後再試。')).toBeVisible();
});

test('downloaded campaign level remains playable offline', async ({ page }) => {
  await page.addInitScript((puzzle) => {
    localStorage.setItem('equireign.campaign-batch.v1.100', JSON.stringify({
      startLevel: 100,
      endLevel: 199,
      downloadedAtMs: Date.now(),
      puzzles: [puzzle],
    }));
  }, level100Puzzle);
  await page.goto('/game?mode=campaign&level=100&difficulty=beginner&size=6');
  await expect(page.getByTestId('game-screen')).toHaveAttribute('aria-label', '遊戲已就緒');
  await expect(page.getByTestId('game-board')).toBeVisible();
  await expect(page.locator('[data-testid^="cell-"]')).toHaveCount(36);
  await expect(page.locator('[data-testid^="cell-"][aria-label*="皇后，預置"]')).toHaveCount(2);
});
