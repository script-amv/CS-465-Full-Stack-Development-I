const { test, expect } = require('@playwright/test');
const path = require('node:path');
const evidence = name => path.join('..', 'final-project-submission', 'screenshots', name + '.png');

async function adminLogin(page) {
  await page.goto('/login');
  await page.getByLabel('Email address').fill('admin@example.test');
  await page.getByLabel('Password', { exact: true }).fill('MockPassword7!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible();
}

test('admin pages reject anonymous visitors and customer credentials', async ({ page }) => {
  for (const route of ['/', '/customers', '/reservations', '/add', '/edit/GR001']) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/login/);
  }
  await page.getByLabel('Email address').fill('customer@example.test');
  await page.getByLabel('Password', { exact: true }).fill('MockCustomer7!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('administrators');
  expect(await page.evaluate(() => localStorage.getItem('travlr-token'))).toBeNull();
});

test('customer signs up, searches, books and returns to a saved itinerary; admin maintains the customer', async ({ page, browser }) => {
  test.setTimeout(90000);
  await page.goto('http://localhost:3000/signup');
  await page.getByLabel('Name', { exact: true }).fill('Final Browser Customer');
  await page.getByLabel('Email', { exact: true }).fill('final-browser@example.test');
  await page.getByLabel('Password', { exact: true }).fill('FinalBrowserPassword!');
  await page.getByLabel('Re-type password').fill('FinalBrowserPassword!');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Sign Up', exact: true }).click();
  await expect(page).toHaveURL('http://localhost:3000/travel');
  await page.getByLabel(/location/i).fill('Emerald');
  await page.getByLabel('Maximum price').fill('850');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Gale Reef', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: "Dawson's Reef", exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: 'View trip and book', exact: true }).click();
  await page.getByLabel('Number of travellers').fill('2');
  await page.getByRole('button', { name: 'Continue to checkout' }).click();
  await expect(page.locator('#contents')).toContainText('$1598.00');
  await page.getByRole('button', { name: 'Confirm reservation' }).click();
  await expect(page.getByRole('heading', { name: 'My Reservations' })).toBeVisible();
  await expect(page.locator('#contents')).toContainText('Gale Reef');
  await expect(page.locator('#contents')).toContainText('confirmed');
  await page.screenshot({ path: evidence('Customer Saved Itinerary'), fullPage: true });
  await page.getByRole('button', { name: 'Log out', exact: true }).click();
  await page.goto('http://localhost:3000/reservations');
  await expect(page).toHaveURL(/\/login/);
  await page.getByLabel('Email', { exact: true }).fill('final-browser@example.test');
  await page.getByLabel('Password', { exact: true }).fill('FinalBrowserPassword!');
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await expect(page.locator('#contents')).toContainText('Gale Reef');
  await expect(page.locator('#contents')).toContainText('$1598.00');

  const adminContext = await browser.newContext();
  const staff = await adminContext.newPage();
  await adminLogin(staff);
  await expect(staff.getByRole('link', { name: 'Customers', exact: true })).toBeVisible();
  await staff.getByRole('link', { name: 'Customers', exact: true }).click();
  const customer = staff.locator('[data-customer]').filter({ hasText: 'final-browser@example.test' });
  await expect(customer).toBeVisible();
  await customer.getByLabel('Customer name').fill('Updated Browser Customer');
  await customer.getByRole('button', { name: 'Save customer' }).click();
  await expect(staff.getByRole('status')).toContainText('saved');
  await staff.screenshot({ path: evidence('Admin Customer Management'), fullPage: true });
  await page.reload();
  await expect(page.locator('#header')).toContainText('Updated Browser Customer');
  await staff.getByRole('link', { name: 'Reservations', exact: true }).click();
  const booking = staff.locator('[data-reservation]').filter({ hasText: 'final-browser@example.test' });
  await expect(booking).toContainText('Gale Reef');
  await booking.getByLabel('Reservation status').selectOption('cancelled');
  await booking.getByRole('button', { name: 'Save status' }).click();
  await expect(staff.getByRole('status')).toContainText('saved');
  await page.reload();
  await expect(page.locator('#contents')).toContainText('cancelled');
  await adminContext.close();
});

test('admin adds a unique tour with dates and location, then edits package pricing', async ({ page, request }) => {
  await adminLogin(page);
  await page.getByRole('link', { name: 'Add a trip', exact: true }).click();
  await page.getByLabel('Trip code').fill('FT009');
  await page.getByLabel('Trip name').fill('Final Emerald Bay Tour');
  await page.getByLabel('Length', { exact: true }).fill('6 days / 5 nights');
  await page.getByLabel('Start date').fill('2027-02-20');
  await page.getByLabel('Resort', { exact: true }).fill('Emerald Bay Resort');
  await expect(page.getByLabel('Location', { exact: true })).toBeVisible();
  await page.getByLabel('Location', { exact: true }).fill('Emerald Bay');
  await page.getByLabel('Category', { exact: true }).selectOption('Beaches');
  await page.getByLabel('Price per person').fill('850');
  await page.getByLabel('Trip image').selectOption('reef1.jpg');
  await page.getByLabel('Description').fill('A February beach tour with a reef visit and five nights at Emerald Bay.');
  await page.getByRole('button', { name: 'Save trip', exact: true }).click();
  const card = page.locator('app-trip-card').filter({ hasText: 'FT009' });
  await expect(card).toContainText('Final Emerald Bay Tour');
  await page.screenshot({ path: evidence('Card Listing - Additional Trip'), fullPage: true });
  await card.getByRole('link', { name: 'Edit trip' }).click();
  await expect(page.getByLabel('Trip name')).toHaveValue('Final Emerald Bay Tour');
  await expect(page.getByLabel('Trip code')).toBeDisabled();
  await page.screenshot({ path: evidence('Edit Screen'), fullPage: true });
  await page.getByLabel('Trip name').fill('Final Emerald Bay Tour Updated');
  await page.getByLabel('Price per person').fill('899');
  await page.getByRole('button', { name: 'Update trip', exact: true }).click();
  await expect(card).toContainText('Final Emerald Bay Tour Updated');
  await expect(card).toContainText('$899.00');
  await page.screenshot({ path: evidence('Update Screen'), fullPage: true });
  const json = await (await request.get('http://localhost:3000/api/trips/FT009')).json();
  expect(json).toMatchObject({ name: 'Final Emerald Bay Tour Updated', perPerson: 899, location: 'Emerald Bay' });
  expect(await (await request.get('http://localhost:3000/travel?location=Emerald&maxPrice=900')).text()).toContain('Final Emerald Bay Tour Updated');
  page.once('dialog', dialog => dialog.accept());
  await card.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(card).toHaveCount(0);
});

test('public forms and trip pages fit a phone screen without horizontal scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 850 });
  for (const route of ['/', '/signup', '/travel', '/travel/GR001']) {
    await page.goto('http://localhost:3000' + route);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  }
  await page.screenshot({ path: evidence('Customer Mobile Trip'), fullPage: true });
});

test('checkout requires another review when an admin changes the displayed package', async ({ page, request }) => {
  await page.goto('http://localhost:3000/login');
  await page.getByLabel('Email', { exact: true }).fill('customer@example.test');
  await page.getByLabel('Password', { exact: true }).fill('MockCustomer7!');
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await page.goto('http://localhost:3000/checkout?tripCode=DR002&travellers=2');
  await expect(page.locator('#contents')).toContainText('$1398.00');
  const login = await request.post('http://localhost:3000/api/login', { data: { email: 'admin@example.test', password: 'MockPassword7!' } });
  const headers = { Authorization: 'Bearer ' + (await login.json()).token };
  try {
    expect((await request.put('http://localhost:3000/api/trips/DR002', { headers, data: { perPerson: 799 } })).status()).toBe(200);
    const response = page.waitForResponse(r => r.url().endsWith('/checkout') && r.request().method() === 'POST');
    await page.getByRole('button', { name: 'Confirm reservation' }).click();
    expect((await response).status()).toBe(409);
    await expect(page.locator('#contents')).toContainText('Open checkout again');
    await page.goto('http://localhost:3000/reservations');
    await expect(page.locator('#contents')).not.toContainText("Dawson's Reef");
  } finally {
    expect((await request.put('http://localhost:3000/api/trips/DR002', { headers, data: { perPerson: 699 } })).status()).toBe(200);
  }
});
