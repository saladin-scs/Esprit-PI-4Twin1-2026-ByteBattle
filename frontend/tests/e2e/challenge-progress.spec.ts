import { expect, test } from '@playwright/test';

test('challenge progress + hint + submit XP flow', async ({ page }) => {
  let revealCalled = false;
  let submitCalled = false;

  await page.addInitScript(() => {
    localStorage.setItem('token', 'e2e-token');
    localStorage.setItem('refresh_token', 'e2e-refresh');
  });

  await page.route('**/bb-api/auth/refresh', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ access_token: 'e2e-token', refresh_token: 'e2e-refresh' }),
    });
  });

  await page.route('**/bb-api/users/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: 'u1', username: 'tester', email: 't@t.dev', roles: ['user'] }),
    });
  });

  await page.route('**/bb-api/challenges/c1/my-completion', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ completedLanguages: [] }) });
  });
  await page.route('**/bb-api/challenges/c1/progress', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ solved: false, startedAt: new Date().toISOString(), revealedHintIndices: [] }),
      });
      return;
    }
    await route.continue();
  });
  await page.route('**/bb-api/challenges/c1/progress/reveal-hint', async (route) => {
    revealCalled = true;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ startedAt: new Date().toISOString(), revealedHintIndices: [0] }),
    });
  });
  await page.route('**/bb-api/challenges/c1/submit', async (route) => {
    submitCalled = true;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'accepted',
        passedTests: 2,
        totalTests: 2,
        xpEarned: 88,
        executionTimeMs: 14,
        badgesUnlocked: [],
        xpModifiers: { timeMultiplier: 1, hintFlatPenalty: 5, elapsedMs: 1000 },
        testResults: [{ testNumber: 1, passed: true }, { testNumber: 2, passed: true }],
      }),
    });
  });
  await page.route('**/bb-api/gamification/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ xp: 200, rankTier: 'bronze', rankProgress: null }),
    });
  });
  await page.route('**/bb-api/challenges/c1', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        _id: 'c1',
        title: 'Sum Two Numbers',
        description: 'Add two numbers.',
        difficulty: 'easy',
        languages: ['python'],
        examples: [{ input: '1 2', output: '3' }],
        constraints: [],
        tags: ['math'],
        xpReward: 50,
        starterCode: { python: 'print(1+2)' },
        hints: [{ text: 'Use +', tier: 'basic', cost: 5 }],
      }),
    });
  });

  await page.goto('/challenges/c1?lang=python');
  await page.getByRole('tab', { name: 'Hints' }).click();
  await page.getByRole('button', { name: 'Show hint' }).click();
  await expect(page.getByText('Hint 1')).toBeVisible();
  await expect(revealCalled).toBeTruthy();

  await page.getByRole('button', { name: /Submit/i }).click();
  await expect(submitCalled).toBeTruthy();
});

