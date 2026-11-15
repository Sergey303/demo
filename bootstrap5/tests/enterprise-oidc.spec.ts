import { expect, test } from '@playwright/test';

test('OIDC identity uses verified mapping and logout clears the workspace', async ({ page }) => {
  await page.route('**/enterprise-search/agent/identity', r => r.fulfill({
    headers: { 'X-EP12-BFF': '1' }, json: { tenant: 'alpha', subject: 'alice', identity_kind: 'oidc' },
  }));
  await page.route('**/enterprise-api/ready', r => r.fulfill({ json: { status: 'ready' } }));
  let logout = 0;
  await page.route('**/auth/logout', r => { logout++; expect(r.request().method()).toBe('POST'); return r.fulfill({ status: 204 }); });
  await page.goto('/dashboard/enterprise-ai');
  await expect(page.getByTestId('enterprise-identity')).toHaveText('OIDC identity: alpha / alice');
  await expect(page.locator('#enterprise-wav')).toBeVisible();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.locator('#enterprise-wav')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/auth/login');
  expect(logout).toBe(1);
});

for (const bff of [true, false]) {
  test(`401 shows sign-in only with BFF header (${bff})`, async ({ page }) => {
    await page.route('**/enterprise-search/agent/identity', r => r.fulfill({
      status: 401, headers: bff ? { 'X-EP12-BFF': '1' } : {}, json: { error: 'Unauthorized' },
    }));
    await page.goto('/dashboard/enterprise-ai');
    await expect(page.getByTestId('enterprise-identity')).toContainText('не подтверждена');
    await expect(page.getByRole('link', { name: 'Sign in' })).toHaveCount(bff ? 1 : 0);
    await expect(page.locator('#enterprise-wav')).toHaveCount(0);
  });
}

test('logout in flight cannot restore the workspace on focus', async ({ page }) => {
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/enterprise-search/agent/identity', r => r.fulfill({
    headers: { 'X-EP12-BFF': '1' }, json: { tenant: 'alpha', subject: 'alice', identity_kind: 'oidc' },
  }));
  await page.route('**/enterprise-api/ready', r => r.fulfill({ json: { status: 'ready' } }));
  await page.route('**/auth/logout', async r => { await pending; await r.fulfill({ status: 204 }); });
  await page.goto('/dashboard/enterprise-ai');
  await expect(page.locator('#enterprise-wav')).toBeVisible();
  const logout = page.waitForRequest('**/auth/logout');
  await page.getByRole('button', { name: 'Sign out' }).click(); await logout;
  await expect(page.locator('#enterprise-wav')).toHaveCount(0);
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  // Allow an incorrectly started identity probe to complete before asserting the gate.
  await page.waitForTimeout(500);
  await expect(page.locator('#enterprise-wav')).toHaveCount(0);
  release();
  await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
  await expect(page.locator('#enterprise-wav')).toHaveCount(0);
});
