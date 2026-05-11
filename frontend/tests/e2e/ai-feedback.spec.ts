import { expect, test, type Page } from '@playwright/test';

async function mockBaseRoutes(page: Page) {
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
  await page.route('**/bb-api/notifications**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [], total: 0, unreadCount: 0, page: 1, totalPages: 0 }),
    });
  });
  await page.route('**/bb-api/gamification/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ xp: 0, rankTier: 'bronze', rankProgress: null }),
    });
  });

  await page.route('**/bb-api/challenges/c1/my-completion', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ completedLanguages: [] }) });
  });
  await page.route('**/bb-api/challenges/c1/progress', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ solved: false, startedAt: new Date().toISOString(), revealedHintIndices: [] }),
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
      }),
    });
  });
}

test('AI feedback success renders score and points', async ({ page }) => {
  await mockBaseRoutes(page);
  let called = false;
  await page.route('**/bb-api/ai/analyze-code', async (route) => {
    called = true;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        overall_score: 77,
        summary: 'Solid baseline.',
        points: [{ title: 'Edge cases', description: 'Handle zero.', category: 'improvement', severity: 'low' }],
      }),
    });
  });

  await page.goto('/challenges/c1?lang=python');
  await page.getByRole('tab', { name: /AI coach/i }).click();
  const coachPanel = page.getByRole('region', { name: /AI coach - code analysis/i });
  await page.getByRole('button', { name: /Analyze my code/i }).evaluate((el) => (el as HTMLButtonElement).click());
  await expect.poll(() => called).toBeTruthy();
  await expect(coachPanel).toContainText('Solid baseline.');
  await expect(coachPanel).toContainText('Edge cases');
});

test('AI feedback retry works after transient failure', async ({ page }) => {
  await mockBaseRoutes(page);
  let callCount = 0;
  await page.route('**/bb-api/ai/analyze-code', async (route) => {
    callCount += 1;
    if (callCount === 1) {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Service unavailable' }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        overall_score: 84,
        summary: 'Recovered.',
        points: [{ title: 'Complexity', description: 'Reduce loops.', category: 'improvement', severity: 'medium' }],
      }),
    });
  });

  await page.goto('/challenges/c1?lang=python');
  await page.getByRole('tab', { name: /AI coach/i }).click();
  const coachPanel = page.getByRole('region', { name: /AI coach - code analysis/i });
  await page.getByRole('button', { name: /Analyze my code/i }).evaluate((el) => (el as HTMLButtonElement).click());
  await expect(coachPanel.getByText(/temporarily unavailable|Analysis unavailable/i)).toBeVisible();
  await page.getByRole('button', { name: 'Retry' }).evaluate((el) => (el as HTMLButtonElement).click());
  await expect(coachPanel).toContainText('Recovered.');
});

test('AI feedback 429 shows rate-limit message', async ({ page }) => {
  await mockBaseRoutes(page);
  await page.route('**/bb-api/ai/analyze-code', async (route) => {
    await route.fulfill({
      status: 429,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Too many requests' }),
    });
  });

  await page.goto('/challenges/c1?lang=python');
  await page.getByRole('tab', { name: /AI coach/i }).click();
  const coachPanel = page.getByRole('region', { name: /AI coach - code analysis/i });
  await page.getByRole('button', { name: /Analyze my code/i }).evaluate((el) => (el as HTMLButtonElement).click());
  await expect(coachPanel.getByText(/Too many requests/i)).toBeVisible();
});

