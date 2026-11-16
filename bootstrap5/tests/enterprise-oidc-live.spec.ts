import { expect, request as playwrightRequest, test } from '@playwright/test';

// These tests deliberately do not mock HTTP. They only run when the ephemeral
// Keycloak/PostgreSQL/HTTPS fixture has explicitly opted in.
test.describe('EP-12C real Keycloak over verified HTTPS', () => {
  test.skip(process.env.EP12C_LIVE_TEST !== 'true', 'Requires isolated Keycloak HTTPS fixture');
  test.use({
    baseURL: process.env.EP12C_BFF_ORIGIN ?? 'https://localhost:18444',
    ignoreHTTPSErrors: false,
  });

  const bff = 'https://localhost:18444';

  test('real authorization-code/PKCE login and stolen-cookie replay after logout-all', async ({ page }) => {
    const alicePassword = process.env.EP12C_ALICE_PASSWORD;
    expect(alicePassword).toBeTruthy();

    await page.goto('/auth/login');
    await expect(page).toHaveURL(/localhost:18443\/realms\/ep12c\/protocol\/openid-connect\/auth/);
    await page.locator('#username').fill('alice');
    await page.locator('#password').fill(alicePassword!);
    await page.locator('#kc-login').click();

    // The real IdP -> BFF callback must complete. The BFF exposes a data-free
    // interstitial because SameSite=Strict can otherwise hide the new cookie.
    await expect(page).toHaveURL(bff + '/auth/complete');
    await page.getByRole('link', { name: 'Continue to workspace' }).click();
    await expect(page.getByTestId('enterprise-identity'))
      .toHaveText('OIDC identity: ep12c-test / alice');
    await expect(page.locator('#enterprise-wav')).toBeVisible();

    const cookies = await page.context().cookies(bff);
    const ticket = cookies.filter(c => c.name === '__Host-Http-EP12');
    expect(ticket).toHaveLength(1);
    expect(ticket[0]).toMatchObject({
      secure: true, httpOnly: true, sameSite: 'Strict', path: '/',
    });

    // Simulate a previously stolen copy: a separate HTTP client retains the
    // original cookie even after the browser clears its own cookie.
    const stolen = await playwrightRequest.newContext({
      baseURL: bff, ignoreHTTPSErrors: false,
      extraHTTPHeaders: { Cookie: ticket[0].name + '=' + ticket[0].value },
    });
    try {
      const active = await stolen.get('/auth/session');
      expect(active.status()).toBe(200);
      expect(await active.json()).toEqual({ tenant: 'ep12c-test', sub: 'alice' });

      // CSRF must not revoke a legitimate session from a foreign Origin.
      const forgedLogout = await stolen.post('/auth/logout-all', {
        headers: { Origin: 'https://attacker.invalid' },
      });
      expect(forgedLogout.status()).toBe(403);
      expect((await stolen.get('/auth/session')).status()).toBe(200);

      await page.getByRole('button', { name: 'Sign out everywhere' }).click();
      await expect(page.getByTestId('enterprise-identity')).toHaveText('Signed out.');
      await expect(page.locator('#enterprise-wav')).toHaveCount(0);

      expect((await stolen.get('/auth/session')).status()).toBe(401);
      expect((await stolen.get('/enterprise-search/agent/identity')).status()).toBe(401);
    } finally {
      await stolen.dispose();
    }
  });

  test('valid real IdP credentials without trusted principal mapping cannot sign in', async ({ page }) => {
    const bobPassword = process.env.EP12C_BOB_PASSWORD;
    expect(bobPassword).toBeTruthy();

    await page.goto('/auth/login');
    await expect(page).toHaveURL(/localhost:18443\/realms\/ep12c\/protocol\/openid-connect\/auth/);
    await page.locator('#username').fill('bob');
    await page.locator('#password').fill(bobPassword!);
    await page.locator('#kc-login').click();

    // Framework OIDC validates the real token but the server's explicit exact
    // issuer+sub directory lacks Bob, so no usable session cookie is issued.
    await expect(page.locator('body')).toContainText('OIDC authentication failed.');
    const ticket = (await page.context().cookies(bff))
      .filter(c => c.name === '__Host-Http-EP12');
    expect(ticket).toHaveLength(0);
    const response = await page.request.get(bff + '/auth/session');
    expect(response.status()).toBe(401);
  });
});
