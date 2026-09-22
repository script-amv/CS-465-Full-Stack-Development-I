const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const app = require('../app');
const hbs = require('hbs');
const trips = require('../data/trips.json');
const Trip = require('../app_server/models/travlr');
const { tripsList } = require('../app_api/controllers/trips');

let server;
let baseUrl;

test.before(async () => {
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

test.after(() => {
  server.close();
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

test('the trip API controller returns Mongoose data as JSON', async () => {
  const originalFind = Trip.find;
  const response = {
    statusCode: 0,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };

  Trip.find = () => ({ sort: () => ({ lean: async () => trips }) });
  try {
    await tripsList({}, response);
  } finally {
    Trip.find = originalFind;
  }

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, trips);
});
