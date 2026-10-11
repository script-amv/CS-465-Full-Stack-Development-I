const { test, expect } = require('@playwright/test');
const path = require('node:path');

async function login(page) {
  await page.goto('/login');
  await page.getByLabel('Email address').fill('admin@example.test');
  await page.getByLabel('Password', { exact: true }).fill('MockPassword7!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible();
}

test('logged-out admin navigation requires login and hides CRUD', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole('link', { name: /Add.*trip/i })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Edit trip' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Delete', exact: true })).toHaveCount(0);
  for (const route of ['/edit/GR001', '/add', '/customers', '/reservations']) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/login\?returnUrl=/);
  }
});

test('wrong password stays on login and reports the error', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email address').fill('admin@example.test');
  await page.getByLabel('Password', { exact: true }).fill('WrongPassword7!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Invalid email or password.');
  await expect(page).toHaveURL(/\/login$/);
});

test('login enables CRUD, changes persist on the public site, and logout removes access', async ({ page, request }) => {
  await login(page);
  await expect(page.getByRole('link', { name: 'Edit trip' })).toHaveCount(4);
  await page.screenshot({ path: path.join('..', 'final-project-submission', 'screenshots', 'Logged In - CRUD Enabled.png'), fullPage: true });
  await page.getByRole('link', { name: 'Add a trip', exact: true }).click();
  await page.getByLabel('Trip code').fill('UI007');
  await page.getByLabel('Trip name').fill('Secure Browser Trip');
  await page.getByLabel('Length').fill('5 days / 4 nights');
  await page.getByLabel('Start date').fill('2026-12-01');
  await page.getByLabel('Resort').fill('Gale Reef');
  await page.getByLabel('Price per person').fill('877');
  await page.getByLabel('Trip image').selectOption('reef1.jpg');
  await page.getByLabel('Description').fill('A mock trip to verify authenticated CRUD.');
  await page.getByRole('button', { name: 'Save trip', exact: true }).click();
  const card = page.locator('app-trip-card').filter({ hasText: 'UI007' });
  await expect(card).toContainText('Secure Browser Trip');
  expect(await (await request.get('http://localhost:3000/travel')).text()).toContain('Secure Browser Trip');
  await card.getByRole('link', { name: 'Edit trip' }).click();
  await page.getByLabel('Trip name').fill('Updated Secure Browser Trip');
  await page.getByLabel('Price per person').fill('977');
  await page.getByRole('button', { name: 'Update trip', exact: true }).click();
  await expect(card).toContainText('Updated Secure Browser Trip');
  expect((await (await request.get('http://localhost:3000/api/trips/UI007')).json()).perPerson).toBe(977);
  expect(await (await request.get('http://localhost:3000/travel')).text()).toContain('Updated Secure Browser Trip');
  await page.screenshot({ path: path.join('..', 'final-project-submission', 'screenshots', 'Authenticated Trip Update.png'), fullPage: true });
  page.once('dialog', dialog => dialog.accept());
  await card.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(card).toHaveCount(0);
  expect((await request.get('http://localhost:3000/api/trips/UI007')).status()).toBe(404);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible();
  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page.getByRole('link', { name: 'Edit trip' })).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('travlr-token'))).toBeNull();
  await expect(page).toHaveURL(/\/login/);
  await page.screenshot({ path: path.join('..', 'final-project-submission', 'screenshots', 'Admin Login.png'), fullPage: true });
});

test('malformed and expired local tokens redirect safely to login', async ({ page }) => {
  await page.goto('/');
  for (const token of ['invalid.token', 'e30.' + Buffer.from(JSON.stringify({ exp: 1, email: 'admin@example.test', name: 'Admin' })).toString('base64url') + '.invalid']) {
    await page.evaluate(token => localStorage.setItem('travlr-token', token), token);
    await page.goto('/add');
    await expect(page).toHaveURL(/\/login/);
    expect(await page.evaluate(() => localStorage.getItem('travlr-token'))).toBeNull();
  }
});

test('server rejection of an altered token clears the session without saving', async ({ page, request }) => {
  await login(page);
  await page.goto('/edit/GR001');
  await expect(page.getByLabel('Trip name')).toHaveValue('Gale Reef');
  await page.evaluate(() => {
    const parts = localStorage.getItem('travlr-token').split('.');
    parts[2] = (parts[2][0] === 'a' ? 'b' : 'a') + parts[2].slice(1);
    localStorage.setItem('travlr-token', parts.join('.'));
  });
  await page.getByLabel('Trip name').fill('Should Not Save');
  await page.getByRole('button', { name: 'Update trip', exact: true }).click();
  await expect(page).toHaveURL(/\/login/);
  expect((await (await request.get('http://localhost:3000/api/trips/GR001')).json()).name).toBe('Gale Reef');
});

test('expiry noticed during interaction leaves the edit form before a delayed timer', async ({ page }) => {
  await login(page);
  await page.goto('/edit/GR001');
  await expect(page.getByLabel('Trip name')).toHaveValue('Gale Reef');
  await page.clock.install();
  await page.clock.setSystemTime(new Date(Date.now() + 7200000));
  await page.getByLabel('Trip name').fill('Expired Session');
  await expect(page).toHaveURL(/\/login/);
  expect(await page.evaluate(() => localStorage.getItem('travlr-token'))).toBeNull();
});

test('cancelled login cannot save a session or redirect after a delayed response', async ({ page }) => {
  let respond;
  const payload = Buffer.from(JSON.stringify({ _id: '000000000000000000000001', role: 'admin', name: 'Delayed Admin', email: 'delayed@example.test', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url');
  await page.route('**/api/login', route => {
    respond = () => route.fulfill({ json: { token: `e30.${payload}.signature` } }).catch(() => {});
  });
  await page.goto('/login?returnUrl=%2Fedit%2FGR001');
  await page.getByLabel('Email address').fill('delayed@example.test');
  await page.getByLabel('Password', { exact: true }).fill('DelayedPassword7!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect.poll(() => Boolean(respond)).toBe(true);
  await page.getByRole('link', { name: 'Cancel', exact: true }).click();
  await expect(page).toHaveURL(/\/login/);
  await respond();
  await expect(page.getByRole('link', { name: 'Log in', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Edit trip' })).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('travlr-token'))).toBeNull();
});
