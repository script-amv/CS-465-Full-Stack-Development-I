const fs = require('node:fs');
const path = require('node:path');
const collection = require('../postman/travlr-module7.postman_collection.json');
collection.info.name = 'Travlr Final Project: Roles, Trips, Customers and Reservations';
collection.variable.push({ key: 'adminEmail', value: 'admin@example.test' }, { key: 'adminPassword', value: 'MockPassword7!' });
for (const item of collection.item) {
  if (item.request.body?.raw) item.request.body.raw = item.request.body.raw.replaceAll('Postman Administrator', 'Postman Customer');
  if (item.name === 'Login mock user') item.event[0].script.exec.push("pm.collectionVariables.set('customerToken', pm.response.json().token);");
}
function request(name, method, route, status, body, token, assertions = []) {
  return {
    name,
    request: {
      method, url: '{{baseUrl}}' + route,
      header: [{ key: 'Content-Type', value: 'application/json' }, ...(token ? [{ key: 'Authorization', value: 'Bearer {{' + token + '}}' }] : [])],
      ...(body ? { body: { mode: 'raw', raw: JSON.stringify(body) } } : {}),
    },
    event: [{ listen: 'test', script: { exec: ["pm.test('" + name + ": HTTP " + status + "', () => pm.response.to.have.status(" + status + "));", ...assertions] } }],
  };
}
const loginIndex = collection.item.findIndex(item => item.name === 'Login mock user');
collection.item.splice(loginIndex + 1, 0,
  request('Reject customer trip write', 'PUT', '/api/trips/GR001', 403, { name: 'Forbidden' }, 'customerToken'),
  request('Reject customer customer-list access', 'GET', '/api/customers', 403, null, 'customerToken'),
  request('Login explicit administrator', 'POST', '/api/login', 200, { email: '{{adminEmail}}', password: '{{adminPassword}}' }, null, [
    "pm.collectionVariables.set('token', pm.response.json().token);",
    "pm.test('Admin token is present', () => pm.expect(pm.response.json().token).to.be.a('string'));",
  ]),
);
collection.item.push(
  request('Search by location and price', 'GET', '/api/trips?location=Emerald&minPrice=750&maxPrice=850', 200, null, null, [
    "pm.test('Filtered trip is Gale Reef', () => pm.expect(pm.response.json().map(t => t.code)).to.eql(['GR001']));",
  ]),
  request('Reject invalid search bounds', 'GET', '/api/trips?minPrice=900&maxPrice=100', 400),
  request('Read current customer', 'GET', '/api/me', 200, null, 'customerToken', [
    "pm.collectionVariables.set('customerId', pm.response.json()._id);",
    "pm.test('Public account is a customer', () => pm.expect(pm.response.json().role).to.eql('customer'));",
  ]),
  request('Reject booking without checkout review', 'POST', '/api/reservations', 400, { tripCode: 'GR001', travellers: 2 }, 'customerToken'),
  request('Review authenticated checkout quote', 'GET', '/api/trips/GR001/quote?travellers=2', 200, null, 'customerToken', [
    "pm.collectionVariables.set('bookingQuote', pm.response.json().quote);",
    "pm.test('Review total matches two travellers', () => pm.expect(pm.response.json().total).to.eql(1598));",
  ]),
  request('Book customer itinerary', 'POST', '/api/reservations', 201, { tripCode: 'GR001', travellers: 2, quote: '{{bookingQuote}}', total: 1 }, 'customerToken', [
    "pm.collectionVariables.set('reservationId', pm.response.json()._id);",
    "pm.test('Server calculates booking total', () => pm.expect(pm.response.json().total).to.eql(1598));",
    "pm.test('Itinerary stores trip data', () => pm.expect(pm.response.json().trip.name).to.eql('Gale Reef'));",
  ]),
  request('Reject duplicate booking', 'POST', '/api/reservations', 409, { tripCode: 'GR001', travellers: 2, quote: '{{bookingQuote}}' }, 'customerToken'),
  request('Reject renaming booked trip code', 'PUT', '/api/trips/GR001', 400, { code: 'ZZ123' }, 'token'),
  request('Reject non-finite package price', 'PUT', '/api/trips/DR002', 400, { perPerson: 'Infinity' }, 'token'),
  request('Read saved itineraries', 'GET', '/api/me/reservations', 200, null, 'customerToken', [
    "pm.test('Own itinerary is returned', () => pm.expect(pm.response.json()).to.have.lengthOf(1));",
  ]),
  request('Read individual reservation', 'GET', '/api/reservations/{{reservationId}}', 200, null, 'customerToken'),
  request('Register second customer', 'POST', '/api/register', 201, { name: 'Other Postman Customer', email: 'other-{{userEmail}}', password: 'PostmanPassword7!' }, null, [
    "pm.collectionVariables.set('otherToken', pm.response.json().token);",
  ]),
  request('Deny another customer itinerary', 'GET', '/api/reservations/{{reservationId}}', 404, null, 'otherToken'),
  request('Reject deleting a booked package', 'DELETE', '/api/trips/GR001', 409, null, 'token'),
  request('Admin reads customer base', 'GET', '/api/customers', 200, null, 'token', [
    "pm.test('Customers contain no password material', () => pm.expect(pm.response.json().every(c => !c.hash && !c.salt && !c.password && c.role === 'customer')).to.eql(true));",
  ]),
  request('Admin updates customer name', 'PUT', '/api/customers/{{customerId}}', 200, { name: 'Updated Postman Customer', role: 'admin' }, 'token', [
    "pm.test('Customer cannot be promoted through this endpoint', () => pm.expect(pm.response.json().role).to.eql('customer'));",
  ]),
  request('Reject deleting customer history', 'DELETE', '/api/customers/{{customerId}}', 409, null, 'token'),
  request('Admin reads all reservations', 'GET', '/api/reservations', 200, null, 'token', [
    "pm.test('Reservation contains customer details', () => pm.expect(pm.response.json()[0].customer.name).to.eql('Updated Postman Customer'));",
  ]),
  request('Customer cancels reservation', 'PUT', '/api/reservations/{{reservationId}}', 200, { status: 'cancelled' }, 'customerToken', [
    "pm.test('Cancellation is stored', () => pm.expect(pm.response.json().status).to.eql('cancelled'));",
  ]),
  request('Admin restores reservation', 'PUT', '/api/reservations/{{reservationId}}', 200, { status: 'confirmed' }, 'token'),
  request('Reject invalid reservation status', 'PUT', '/api/reservations/{{reservationId}}', 400, { status: 'arbitrary' }, 'token'),
);
fs.writeFileSync(path.join(__dirname, '..', 'postman', 'travlr-project.postman_collection.json'), JSON.stringify(collection, null, 2) + '\n');
console.log('Final project Postman collection generated.');
