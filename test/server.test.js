const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
process.env.JWT_SECRET = require('node:crypto').randomBytes(48).toString('hex');
const app = require('../app');
const hbs = require('hbs');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { mongoose } = require('../app_api/models/db');
const trips = require('../data/trips.json');
const Trip = require('../app_api/models/travlr');

let server;
let baseUrl;
let mongoServer;
let authHeaders;

test.before(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri('travlr'));
  await Trip.insertMany(trips);
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
  const registered = await fetch(`${baseUrl}/api/register`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Integration Admin', email: 'integration@example.test', password: 'IntegrationPassword7!' }),
  });
  assert.equal(registered.status, 201);
  await mongoose.connection.collection('users').updateOne({ email: 'integration@example.test' }, { $set: { role: 'admin' } });
  authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${(await registered.json()).token}` };
});

test.after(async () => {
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  await mongoose.disconnect();
  await mongoServer.stop();
});

test('Express serves the Travlr Getaways home page', async () => {
  const response = await fetch(`${baseUrl}/`);
  const page = await response.text();

  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /text\/html/);
  assert.match(page, /Travlr Getaways/i);
});

test('Express serves the supplied stylesheet', async () => {
  const response = await fetch(`${baseUrl}/css/style.css`);

  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /text\/css/);
});

test('the travel MVC route renders the Handlebars view and partials', async () => {
  const response = await fetch(`${baseUrl}/travel`);
  const page = await response.text();

  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /text\/html/);
  assert.match(page, /<title>Travel \| Travlr Getaways<\/title>/);
  assert.match(page, /<h1>Travel<\/h1>/);
  assert.match(page, /Gale Reef/);
  assert.match(page, /href="\/css\/style\.css"/);
  assert.match(page, /© 2023 by Travlr Getaways/);
  assert.match(page, /href="\/api\/trips\/GR001"/);
  for (const trip of trips) {
    assert.ok(page.includes(hbs.handlebars.escapeExpression(trip.name)));
    assert.ok(page.includes(hbs.handlebars.escapeExpression(trip.description)));
    const image = await fetch(`${baseUrl}/images/${trip.image}`);
    assert.equal(image.status, 200);
  }
  assert.doesNotMatch(page, /{{/);
});

test('legacy travel links reach the JSON-driven listing', async () => {
  const response = await fetch(`${baseUrl}/travel.html`, { redirect: 'manual' });
  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), '/travel');
});

test('the view handles extra mock trips, empty data, and HTML escaping', async () => {
  const render = trips => new Promise((resolve, reject) => {
    app.render('travel', { title: 'Mock data test', trips }, (error, html) => {
      if (error) reject(error);
      else resolve(html);
    });
  });
  const mock = { name: 'Test island', image: 'reef1.jpg', description: '<script>alert(1)</script>' };
  const html = await render([...trips, mock]);
  assert.ok(html.includes('Test island'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!html.includes('<script>'));
  const empty = await render([]);
  assert.ok(empty.includes('No trips are available right now.'));
  assert.ok(!empty.includes('Gale Reef'));
});

test('trip seed data meets the Mongoose schema validation rules', async () => {
  for (const tripData of trips) {
    const trip = new Trip(tripData);
    await trip.validate();
  }

  const invalidTrip = new Trip({ ...trips[0], code: 'invalid', perPerson: -1 });
  await assert.rejects(invalidTrip.validate(), error => {
    assert.ok(error.errors.code);
    assert.ok(error.errors.perPerson);
    return true;
  });
});

test('GET /api/trips returns the MongoDB collection as JSON', async () => {
  const response = await fetch(`${baseUrl}/api/trips`);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /application\/json/);
  assert.equal(body.length, trips.length);
  assert.deepEqual(body.map(trip => trip.code), ['GR001', 'DR002', 'PB004', 'CR003']);
});

test('GET /api/trips/:tripCode returns exactly one matching trip', async () => {
  const response = await fetch(`${baseUrl}/api/trips/DR002`);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.code, 'DR002');
  assert.equal(body.name, "Dawson's Reef");
  assert.equal(body.perPerson, 699);
});

test('trip API reports invalid and missing codes with HTTP status codes', async () => {
  const invalid = await fetch(`${baseUrl}/api/trips/!bad`);
  assert.equal(invalid.status, 400);
  assert.deepEqual(await invalid.json(), { message: 'Invalid trip code.' });
  const missing = await fetch(`${baseUrl}/api/trips/ZZ999`);
  assert.equal(missing.status, 404);
  assert.deepEqual(await missing.json(), { message: 'Trip not found.' });
});

test('travel page reads newly stored trips through the API', async () => {
  await Trip.create({ ...trips[0], _id: undefined, code: 'NR004', name: 'New Reef' });
  try {
    const page = await (await fetch(`${baseUrl}/travel`)).text();
    assert.match(page, /New Reef/);
    assert.match(page, /href="\/api\/trips\/NR004"/);
  } finally {
    await Trip.deleteOne({ code: 'NR004' });
  }
});

test('empty database gives a 404 JSON response and a helpful travel page', async () => {
  const records = await Trip.find().lean();
  await Trip.deleteMany({});
  try {
    const response = await fetch(`${baseUrl}/api/trips`);
    assert.equal(response.status, 404);
    const page = await (await fetch(`${baseUrl}/travel`)).text();
    assert.match(page, /No trips are available right now/);
  } finally {
    await Trip.insertMany(records);
  }
});

test('database failures return a 500 JSON error and 503 travel page', async () => {
  const originalFind = Trip.find;
  Trip.find = () => { throw new Error('Simulated database failure'); };
  try {
    const apiResponse = await fetch(`${baseUrl}/api/trips`);
    assert.equal(apiResponse.status, 500);
    assert.deepEqual(await apiResponse.json(), { message: 'Unable to retrieve trips.' });
    const pageResponse = await fetch(`${baseUrl}/travel`);
    assert.equal(pageResponse.status, 503);
    assert.match(await pageResponse.text(), /Trips could not be loaded right now/);
  } finally {
    Trip.find = originalFind;
  }
});

test('admin origin can call all trip API methods', async () => {
  const response = await fetch(`${baseUrl}/api/trips`, {
    method: 'OPTIONS',
    headers: { Origin: 'http://localhost:4200', 'Access-Control-Request-Method': 'PUT' },
  });
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('access-control-allow-origin'), 'http://localhost:4200');
  assert.match(response.headers.get('access-control-allow-methods'), /DELETE/);
});

test('POST, PUT, and DELETE trips update the database, API, and public page', async () => {
  const code = 'NT004';
  const newTrip = { ...trips[0], code, name: 'New Travlr Trip', perPerson: 799 };

  try {
    const created = await fetch(`${baseUrl}/api/trips`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(newTrip),
    });
    assert.equal(created.status, 201);
    assert.equal((await created.json()).code, code);
    assert.equal((await Trip.findOne({ code })).name, 'New Travlr Trip');
    assert.match(await (await fetch(`${baseUrl}/travel`)).text(), /New Travlr Trip/);

    const duplicate = await fetch(`${baseUrl}/api/trips`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(newTrip),
    });
    assert.equal(duplicate.status, 409);

    const invalid = await fetch(`${baseUrl}/api/trips`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ ...newTrip, code: 'BAD', perPerson: -1 }),
    });
    assert.equal(invalid.status, 400);

    const updated = await fetch(`${baseUrl}/api/trips/${code}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({ ...newTrip, name: 'Updated Travlr Trip', perPerson: 899 }),
    });
    assert.equal(updated.status, 200);
    assert.equal((await updated.json()).name, 'Updated Travlr Trip');
    assert.equal((await (await fetch(`${baseUrl}/api/trips/${code}`)).json()).perPerson, 899);
    const updatedPage = await (await fetch(`${baseUrl}/travel`)).text();
    assert.match(updatedPage, /Updated Travlr Trip/);
    assert.doesNotMatch(updatedPage, /New Travlr Trip/);

    const deleted = await fetch(`${baseUrl}/api/trips/${code}`, { method: 'DELETE', headers: authHeaders });
    assert.equal(deleted.status, 204);
    assert.equal((await fetch(`${baseUrl}/api/trips/${code}`)).status, 404);
    assert.doesNotMatch(await (await fetch(`${baseUrl}/travel`)).text(), /Updated Travlr Trip/);
  } finally {
    await Trip.deleteOne({ code });
  }
});

test('write routes reject invalid and missing trip codes', async () => {
  assert.equal((await fetch(`${baseUrl}/api/trips/invalid`, { method: 'PUT', headers: authHeaders })).status, 400);
  assert.equal((await fetch(`${baseUrl}/api/trips/ZZ999`, { method: 'PUT', headers: authHeaders })).status, 404);
  assert.equal((await fetch(`${baseUrl}/api/trips/invalid`, { method: 'DELETE', headers: authHeaders })).status, 400);
  assert.equal((await fetch(`${baseUrl}/api/trips/ZZ999`, { method: 'DELETE', headers: authHeaders })).status, 404);
});
