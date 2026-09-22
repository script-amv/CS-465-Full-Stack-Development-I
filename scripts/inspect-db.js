const { connectDatabase, gracefulShutdown } = require('../app_server/models/db');
const Trip = require('../app_server/models/travlr');

async function inspectDatabase() {
  await connectDatabase();
  const trips = await Trip.find().sort({ code: 1 }).lean();
  console.log(JSON.stringify({ collection: 'trips', count: trips.length, trips }, null, 2));
  await gracefulShutdown('inspection complete');
}

inspectDatabase().catch(async error => {
  console.error(`Database inspection failed: ${error.message}`);
  await gracefulShutdown('inspection failed');
  process.exitCode = 1;
});
