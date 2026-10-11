const { randomBytes } = require('node:crypto');
process.env.JWT_SECRET ||= randomBytes(48).toString('hex');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { mongoose } = require('../app_api/models/db');
const Trip = require('../app_api/models/travlr');
const User = require('../app_api/models/user');
const trips = require('../data/trips.json');
const app = require('../app');

async function run() {
  const mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri('travlr'));
  await Trip.insertMany(trips);
  await User.init();
  const user = new User({ name: 'Mock Administrator', email: 'admin@example.test', role: 'admin' });
  await user.setPassword('MockPassword7!');
  await user.save();
  const customer = new User({ name: 'Demo Customer', email: 'customer@example.test', role: 'customer' });
  await customer.setPassword('MockCustomer7!');
  await customer.save();
  const server = app.listen(3000, () => {
    console.log('Travlr demo is running at http://localhost:3000');
    console.log('Run the Angular admin in another terminal with: cd app_admin && npm start');
  });

  async function stop() {
    await new Promise(resolve => server.close(resolve));
    await mongoose.disconnect();
    await mongoServer.stop();
  }
  process.once('SIGINT', () => stop().finally(() => process.exit(0)));
  process.once('SIGTERM', () => stop().finally(() => process.exit(0)));
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
