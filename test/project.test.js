const test = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { once } = require('node:events');
process.env.JWT_SECRET = randomBytes(48).toString('hex');
const app = require('../app');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { mongoose } = require('../app_api/models/db');
const Trip = require('../app_api/models/travlr');
const User = require('../app_api/models/user');
const trips = require('../data/trips.json');
let server, mongo, baseUrl, adminToken, customerToken, otherToken, customerId, reservationId;
const request = (path, method = 'GET', body, token) => fetch(baseUrl + path, {
  method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  ...(body ? { body: JSON.stringify(body) } : {}),
});
test.before(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri('travlr'));
  await Trip.insertMany(trips);
  const admin = new User({ name: 'Project Admin', email: 'project-admin@example.test', role: 'admin' });
  await admin.setPassword('ProjectAdminPassword!'); await admin.save();
  adminToken = admin.generateJWT();
  server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});
test.after(async () => { await new Promise(resolve => server.close(resolve)); await mongoose.disconnect(); await mongo.stop(); });

test('public registration creates customers even when an admin role is submitted', async () => {
  const response = await request('/api/register', 'POST', { name: 'Project Customer', email: 'project-customer@example.test', password: 'ProjectCustomerPassword!', role: 'admin' });
  assert.equal(response.status, 201); customerToken = (await response.json()).token;
  const customer = await User.findOne({ email: 'project-customer@example.test' }); customerId = String(customer._id);
  assert.equal(customer.role, 'customer');
  assert.equal((await request('/api/trips', 'POST', { ...trips[0], code: 'AD009' }, customerToken)).status, 403);
  assert.equal((await request('/api/trips/GR001', 'PUT', { name: 'Forbidden' }, customerToken)).status, 403);
  assert.equal((await request('/api/trips/GR001', 'DELETE', undefined, customerToken)).status, 403);
  assert.equal((await request('/api/customers', 'GET', undefined, customerToken)).status, 403);
  assert.equal((await request('/api/reservations', 'GET', undefined, customerToken)).status, 403);
  const other = await request('/api/register', 'POST', { name: 'Other Customer', email: 'other-customer@example.test', password: 'OtherCustomerPassword!' });
  assert.equal(other.status, 201); otherToken = (await other.json()).token;
});

test('trip search filters location and numeric price bounds safely', async () => {
  const matches = await request('/api/trips?location=Emerald&minPrice=750&maxPrice=850');
  assert.equal(matches.status, 200); assert.deepEqual((await matches.json()).map(t => t.code), ['GR001']);
  const noResults = await request('/api/trips?location=does-not-exist');
  assert.equal(noResults.status, 200); assert.deepEqual(await noResults.json(), []);
  for (const query of ['maxPrice=-1', 'minPrice=900&maxPrice=100', 'maxPrice=abc', 'location[$ne]=x']) assert.equal((await request('/api/trips?' + query)).status, 400);
});

test('checkout quotes reject unreviewed price/date changes and cannot be used by another customer', async () => {
  const response = await request('/api/trips/GR001/quote?travellers=2', 'GET', undefined, customerToken);
  assert.equal(response.status, 200);
  const review = await response.json();
  assert.equal(review.total, 1598);
  assert.ok(review.quote);
  assert.equal((await request('/api/reservations', 'POST', { tripCode: 'GR001', travellers: 2 }, customerToken)).status, 400);
  assert.equal((await request('/api/reservations', 'POST', { tripCode: 'GR001', travellers: 2, quote: review.quote }, otherToken)).status, 400);
  await request('/api/trips/GR001', 'PUT', { perPerson: 999, start: '2027-03-21' }, adminToken);
  assert.equal((await request('/api/reservations', 'POST', { tripCode: 'GR001', travellers: 2, quote: review.quote }, customerToken)).status, 409);
  assert.equal((await (await request('/api/me/reservations', 'GET', undefined, customerToken)).json()).length, 0);
  await request('/api/trips/GR001', 'PUT', { perPerson: trips[0].perPerson, start: trips[0].start }, adminToken);
});

test('a customer books a trip with a server-calculated price and saved itinerary', async () => {
  assert.equal((await request('/api/reservations', 'POST', { tripCode: 'GR001', travellers: 2 })).status, 401);
  assert.equal((await request('/api/reservations', 'POST', { tripCode: 'GR001', travellers: -1 }, customerToken)).status, 400);
  assert.equal((await request('/api/reservations', 'POST', { tripCode: 'ZZ999', travellers: 2 }, customerToken)).status, 404);
  const review = await (await request('/api/trips/GR001/quote?travellers=2', 'GET', undefined, customerToken)).json();
  const response = await request('/api/reservations', 'POST', { tripCode: 'GR001', travellers: 2, quote: review.quote, total: 1, customer: customerId }, customerToken);
  assert.equal(response.status, 201); const booked = await response.json(); reservationId = booked._id;
  assert.equal(booked.total, 1598); assert.equal(booked.trip.name, 'Gale Reef'); assert.equal(booked.status, 'confirmed');
  assert.equal(String(booked.customer), customerId);
  assert.equal((await request('/api/me/reservations', 'GET', undefined, customerToken)).status, 200);
  assert.equal((await (await request('/api/me/reservations', 'GET', undefined, customerToken)).json()).length, 1);
  assert.equal((await (await request('/api/me/reservations', 'GET', undefined, otherToken)).json()).length, 0);
  assert.equal((await request('/api/reservations/' + reservationId, 'GET', undefined, otherToken)).status, 404);
});

test('bookings retain their itinerary and price after an administrator updates a package', async () => {
  const update = await request('/api/trips/GR001', 'PUT', { name: 'Updated Package', perPerson: 900 }, adminToken);
  assert.equal(update.status, 200);
  const reservation = await (await request('/api/reservations/' + reservationId, 'GET', undefined, customerToken)).json();
  assert.equal(reservation.trip.name, 'Gale Reef'); assert.equal(reservation.total, 1598);
  assert.equal((await request('/api/trips/GR001', 'DELETE', undefined, adminToken)).status, 409);
  await request('/api/trips/GR001', 'PUT', { name: 'Gale Reef', perPerson: 799 }, adminToken);
});

test('trip codes cannot be renamed to bypass confirmed reservation protection', async () => {
  assert.equal((await request('/api/trips/GR001', 'PUT', { code: 'ZZ123' }, adminToken)).status, 400);
  assert.equal((await request('/api/trips/GR001')).status, 200);
  assert.equal((await request('/api/trips/GR001', 'DELETE', undefined, adminToken)).status, 409);
});

test('package prices are finite, bounded amounts with whole cents', async () => {
  for (const perPerson of ['Infinity', 799.001, 1000000.01]) {
    const result = await request('/api/trips/DR002', 'PUT', { perPerson }, adminToken);
    assert.equal(result.status, 400);
  }
  assert.equal((await request('/api/trips/DR002', 'PUT', { perPerson: 699.99 }, adminToken)).status, 200);
  await request('/api/trips/DR002', 'PUT', { perPerson: 699 }, adminToken);
});

test('search keeps the chosen category selected', async () => {
  const html = await (await fetch(baseUrl + '/travel?category=Beaches')).text();
  assert.match(html, /<option[^>]*selected[^>]*>Beaches<\/option>/);
});

test('account route variants have session and CSRF context', async () => {
  for (const path of ['/login/', '/LOGIN', '/signup/']) {
    const response = await fetch(baseUrl + path);
    const html = await response.text();
    assert.equal(response.status, 200);
    const csrf = html.match(/name="_csrf" value="([a-f\d]{64}-[a-f\d]{64})"/);
    assert.ok(csrf, path + ' must include a form token');
  }
  const denied = await fetch(baseUrl + '/login/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ _csrf: 'a'.repeat(64) + '-' + 'b'.repeat(64) }) });
  assert.equal(denied.status, 403);
});

test('admin customer management excludes password material and cannot change roles', async () => {
  const response = await request('/api/customers', 'GET', undefined, adminToken);
  assert.equal(response.status, 200); const customers = await response.json();
  assert.equal(customers.length, 2); assert.ok(customers.every(c => !c.hash && !c.salt && !c.password && c.role === 'customer'));
  const updated = await request('/api/customers/' + customerId, 'PUT', { name: 'Updated Customer', role: 'admin' }, adminToken);
  assert.equal(updated.status, 200); assert.equal((await updated.json()).name, 'Updated Customer');
  assert.equal((await User.findById(customerId)).role, 'customer');
  assert.equal((await request('/api/customers/' + customerId, 'DELETE', undefined, adminToken)).status, 409);
});

test('admin reservation management and customer cancellation preserve ownership', async () => {
  const response = await request('/api/reservations', 'GET', undefined, adminToken);
  assert.equal(response.status, 200); assert.equal((await response.json()).length, 1);
  assert.equal((await request('/api/reservations/' + reservationId, 'PUT', { status: 'cancelled' }, otherToken)).status, 404);
  assert.equal((await request('/api/reservations/' + reservationId, 'PUT', { status: 'arbitrary' }, adminToken)).status, 400);
  assert.equal((await request('/api/reservations/' + reservationId, 'PUT', { status: 'cancelled' }, customerToken)).status, 200);
  const cancelled = await (await request('/api/reservations/' + reservationId, 'GET', undefined, customerToken)).json();
  assert.equal(cancelled.status, 'cancelled');
});

test('public account forms require CSRF and protect private itinerary pages', async () => {
  const signup = await fetch(baseUrl + '/signup'); assert.equal(signup.status, 200);
  assert.match(await signup.text(), /Re-type password/);
  const anonymous = await fetch(baseUrl + '/reservations', { redirect: 'manual' }); assert.equal(anonymous.status, 302); assert.match(anonymous.headers.get('location'), /login/);
  const forged = await fetch(baseUrl + '/login', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'email=x%40example.test&password=Password123!', redirect: 'manual' });
  assert.equal(forged.status, 403);
  const csrfCookie = signup.headers.getSetCookie().find(c => c.startsWith('travlr_csrf='));
  assert.ok(csrfCookie);
  const csrf = csrfCookie.split(';')[0].split('=')[1];
  const signin = await fetch(baseUrl + '/login', { method: 'POST', headers: { Cookie: csrfCookie.split(';')[0], 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ _csrf: csrf, email: 'project-customer@example.test', password: 'ProjectCustomerPassword!' }), redirect: 'manual' });
  assert.equal(signin.status, 303);
  const authCookie = signin.headers.getSetCookie().find(c => c.startsWith('travlr_session='));
  assert.match(authCookie, /HttpOnly/); assert.match(authCookie, /SameSite=Lax/);
  const itinerary = await fetch(baseUrl + '/reservations', { headers: { Cookie: authCookie.split(';')[0] } });
  assert.equal(itinerary.status, 200); const page = await itinerary.text(); assert.match(page, /Gale Reef/); assert.match(page, /cancelled/);
});

test('malformed non-ASCII CSRF input is denied instead of causing a server error', async () => {
  const response = await fetch(baseUrl + '/login', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ _csrf: 'é'.repeat(129), email: 'project-customer@example.test', password: 'ProjectCustomerPassword!' }), redirect: 'manual' });
  assert.equal(response.status, 403);
});

test('deactivating a customer blocks existing tokens and new login until reactivated', async () => {
  assert.equal((await request('/api/customers/' + customerId, 'PUT', { active: false }, adminToken)).status, 200);
  assert.equal((await request('/api/me', 'GET', undefined, customerToken)).status, 401);
  assert.equal((await request('/api/login', 'POST', { email: 'project-customer@example.test', password: 'ProjectCustomerPassword!' })).status, 401);
  assert.equal((await request('/api/customers/' + customerId, 'PUT', { active: true }, adminToken)).status, 200);
  assert.equal((await request('/api/me', 'GET', undefined, customerToken)).status, 200);
});

test('local administrator setup creates a working admin and refuses to overwrite an account', async () => {
  const execFile = require('node:util').promisify(require('node:child_process').execFile);
  const env = { ...process.env, DB_URI: mongo.getUri('travlr'), ADMIN_EMAIL: 'local-admin@example.test', ADMIN_NAME: 'Local Administrator', ADMIN_PASSWORD: 'LocalAdminPassword!' };
  const result = await execFile(process.execPath, ['scripts/create-admin.js'], { env });
  assert.match(result.stdout, /Administrator account created/);
  const login = await request('/api/login', 'POST', { email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD });
  assert.equal(login.status, 200);
  const token = (await login.json()).token;
  assert.equal((await request('/api/customers', 'GET', undefined, token)).status, 200);
  await assert.rejects(execFile(process.execPath, ['scripts/create-admin.js'], { env: { ...env, ADMIN_PASSWORD: 'ChangedPassword123!' } }), error => error.code === 1 && /No account was changed/.test(error.stderr));
  assert.equal((await request('/api/login', 'POST', { email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD })).status, 200);
});
