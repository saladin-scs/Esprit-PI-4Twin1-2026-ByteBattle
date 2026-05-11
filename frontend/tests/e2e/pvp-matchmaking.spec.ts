import { expect, test, type Page } from '@playwright/test';

async function mockAuthState(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('token', 'e2e-token');
  });
}

test.describe('PvP matchmaking smoke', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthState(page);
    await page.route('**/bb-api/users/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'u1', username: 'tester', email: 't@t.dev', roles: ['user'] }),
      });
    });
    await page.route('**/bb-api/battle/pending', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ battle: null }),
      });
    });
    await page.route('**/socket.io/**', async (route) => {
      await route.abort();
    });
  });

  for (const mode of ['1v1', '2v2', '4v4', '5v5'] as const) {
    test(`queues ${mode} and navigates when matched`, async ({ page }) => {
      await page.route('**/bb-api/battle/queue', async (route) => {
        const body = route.request().postDataJSON() as { mode?: string };
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            queued: false,
            battleId: `battle-${body.mode || '1v1'}`,
            challengeId: 'c1',
          }),
        });
      });

      await page.goto('/battle/matchmaking');
      await page.getByRole('radio', { name: new RegExp(`^${mode}`) }).click();
      await page.getByRole('button', { name: 'Find match' }).click();
      await expect(page).toHaveURL(/\/battle\/room\/battle-/);
    });
  }
});

