import { expect, test } from '@playwright/test';
import { getBundledCampaignPuzzle } from '../src/puzzles/bundled-campaign.ts';

const bundledFixture = getBundledCampaignPuzzle(1);
if (!bundledFixture) throw new Error('Bundled campaign fixture is missing.');

const level100Puzzle = {
  level: 100,
  puzzleId: 'campaign-100-offline-fixture',
  size: bundledFixture.size,
  difficulty: bundledFixture.difficulty,
  regionMap: bundledFixture.regionMap,
  givenQueenCellIndexes: bundledFixture.givenQueens.map(({ row, column }) => row * bundledFixture.size + column),
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
  await expect(page.locator('[data-testid^="cell-"]')).toHaveCount(bundledFixture.size * bundledFixture.size);
  await expect(page.locator('[data-testid^="cell-"][aria-label*="皇后，預置"]')).toHaveCount(bundledFixture.givenQueens.length);
});
