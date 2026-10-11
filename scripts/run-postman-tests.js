const { once } = require('node:events');
process.env.JWT_SECRET = require('node:crypto').randomBytes(48).toString('hex');
const path = require('node:path');
const newman = require('newman');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { mongoose } = require('../app_api/models/db');
const Trip = require('../app_api/models/travlr');
const User = require('../app_api/models/user');
const Reservation = require('../app_api/models/reservation');
const trips = require('../data/trips.json');
const app = require('../app');

async function run() {
  const mongoServer = await MongoMemoryServer.create();
  let server;
  try {
    await mongoose.connect(mongoServer.getUri('travlr'));
    await Trip.insertMany(trips);
    await User.init();
    await Reservation.init();
    const administrator = new User({ name: 'Postman Administrator', email: 'admin@example.test', role: 'admin' });
    await administrator.setPassword('MockPassword7!');
    await administrator.save();
    if (await Trip.countDocuments() !== trips.length) throw new Error('Database seed count did not match trips.json.');
    server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const baseUrl = `http://127.0.0.1:${server.address().port}`;

    await new Promise((resolve, reject) => {
      newman.run({
        collection: path.join(__dirname, '..', 'postman', 'travlr-project.postman_collection.json'),
        envVar: [{ key: 'baseUrl', value: baseUrl }],
        reporters: 'cli',
      }, (error, summary) => {
        if (error) return reject(error);
        if (summary.run.failures.length) return reject(new Error('Postman collection had failed assertions.'));
        resolve();
      });
    });
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    await mongoose.disconnect();
    await mongoServer.stop();
  }
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
