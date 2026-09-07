const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const app = require('../app');

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
});
