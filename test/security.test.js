const test = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes, createHmac } = require('node:crypto');
const { once } = require('node:events');
process.env.JWT_SECRET = randomBytes(48).toString('hex');
const app = require('../app');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { mongoose } = require('../app_api/models/db');
const Trip = require('../app_api/models/travlr');
const trips = require('../data/trips.json');
let mongo, server, baseUrl;
const user = { name: 'Mock Administrator', email: 'admin@example.test', password: 'MockPassword7!' };
const request = (route, method = 'GET', body, token) => fetch(baseUrl + route, {
  method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  ...(body ? { body: JSON.stringify(body) } : {}),
});
function sign(payload, secret = process.env.JWT_SECRET) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const data = `${header}.${Buffer.from(JSON.stringify(payload)).toString('base64url')}`;
  return `${data}.${createHmac('sha256', secret).update(data).digest('base64url')}`;
}
test.before(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri('travlr'));
  await Trip.insertMany(trips);
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});
test.after(async () => {
  await new Promise(resolve => server.close(resolve));
  await mongoose.disconnect();
  await mongo.stop();
});

test('registration returns a one-hour signed token and stores only a salted password hash', async () => {
  const response = await request('/api/register', 'POST', user);
  assert.equal(response.status, 201);
  const body = await response.json();
  assert.deepEqual(Object.keys(body), ['token']);
  const payload = JSON.parse(Buffer.from(body.token.split('.')[1], 'base64url'));
  assert.equal(payload.email, user.email);
  assert.equal(payload.exp - payload.iat, 3600);
  assert.equal(body.token, sign(payload));
  const stored = await mongoose.connection.collection('users').findOne({ email: user.email });
  assert.equal(stored.password, undefined);
  assert.notEqual(stored.hash, user.password);
  assert.equal(stored.salt.length, 32);
  assert.equal(stored.hash.length, 128);
  const other = await request('/api/register', 'POST', { ...user, email: 'other@example.test' });
  assert.equal(other.status, 201);
  const storedOther = await mongoose.connection.collection('users').findOne({ email: 'other@example.test' });
  assert.notEqual(stored.hash, storedOther.hash);
});
test('registration rejects normalized duplicate emails and malformed credentials', async () => {
  assert.equal((await request('/api/register', 'POST', { ...user, email: ' ADMIN@EXAMPLE.TEST ' })).status, 409);
  for (const body of [{}, { ...user, email: 'bad' }, { ...user, password: 'short' }, { ...user, email: { $ne: null } }, { ...user, name: [] }]) {
    assert.equal((await request('/api/register', 'POST', body)).status, 400);
  }
});
test('login accepts correct credentials and rejects wrong or missing credentials', async () => {
  const response = await request('/api/login', 'POST', { email: ' ADMIN@EXAMPLE.TEST ', password: user.password });
  assert.equal(response.status, 200);
  assert.ok((await response.json()).token);
  for (const email of [user.email, 'unknown@example.test']) {
    const denied = await request('/api/login', 'POST', { email, password: 'WrongPassword7!' });
    assert.equal(denied.status, 401);
    assert.deepEqual(await denied.json(), { message: 'Invalid email or password.' });
  }
  assert.equal((await request('/api/login', 'POST', {})).status, 400);
  assert.equal((await request('/api/login', 'POST', { email: user.email, password: [] })).status, 400);
});
test('logged-out writes are denied and cannot change the database', async () => {
  for (const [route, method, body] of [['/api/trips', 'POST', { ...trips[0], code: 'SC007' }], ['/api/trips/GR001', 'PUT', { name: 'Unauthorized' }], ['/api/trips/GR001', 'DELETE']]) {
    const response = await request(route, method, body);
    assert.equal(response.status, 401);
    assert.ok((await response.json()).message);
  }
  assert.equal(await Trip.countDocuments(), 4);
  assert.equal((await Trip.findOne({ code: 'GR001' })).name, 'Gale Reef');
});
test('missing, malformed, expired, forged, and deleted-user tokens cannot update trips', async () => {
  const stored = await mongoose.connection.collection('users').findOne({ email: user.email });
  const payload = { _id: String(stored?._id || '000000000000000000000000'), email: user.email, name: user.name, exp: Math.floor(Date.now() / 1000) + 3600 };
  const tokens = ['broken.token', sign({ ...payload, exp: 1 }), sign(payload, 'wrong-secret'), sign({ ...payload, _id: '000000000000000000000000' }), sign({ ...payload, _id: { $ne: null } }), sign({ ...payload, exp: undefined })];
  for (const token of tokens) assert.equal((await request('/api/trips/GR001', 'PUT', { name: 'Unauthorized' }, token)).status, 401);
  const basic = await fetch(baseUrl + '/api/trips/GR001', { method: 'DELETE', headers: { Authorization: 'Basic abc' } });
  assert.equal(basic.status, 401);
  assert.equal((await Trip.findOne({ code: 'GR001' })).name, 'Gale Reef');
});
test('authenticated CRUD changes both API data and the public Handlebars website', async () => {
  const login = await request('/api/login', 'POST', user);
  assert.equal(login.status, 200);
  const { token } = await login.json();
  const trip = { ...trips[0], code: 'SC007', name: 'Security Test Trip' };
  assert.equal((await request('/api/trips', 'POST', trip, token)).status, 201);
  assert.match(await (await request('/travel')).text(), /Security Test Trip/);
  assert.equal((await request('/api/trips/SC007', 'PUT', { name: 'Secured Updated Trip', perPerson: 777 }, token)).status, 200);
  const retrieved = await (await request('/api/trips/SC007')).json();
  assert.equal(retrieved.name, 'Secured Updated Trip');
  assert.equal(retrieved.perPerson, 777);
  assert.match(await (await request('/travel')).text(), /Secured Updated Trip/);
  assert.equal((await request('/api/trips/SC007', 'DELETE', undefined, token)).status, 204);
  assert.equal((await request('/api/trips/SC007')).status, 404);
});
test('CORS permits the Authorization header only for the admin origins', async () => {
  for (const [origin, expected] of [['http://localhost:4200', 'http://localhost:4200'], ['https://untrusted.example', null]]) {
    const response = await fetch(baseUrl + '/api/trips', { method: 'OPTIONS', headers: { Origin: origin, 'Access-Control-Request-Headers': 'authorization,content-type' } });
    assert.equal(response.headers.get('access-control-allow-origin'), expected);
    if (expected) assert.match(response.headers.get('access-control-allow-headers'), /Authorization/i);
  }
});
