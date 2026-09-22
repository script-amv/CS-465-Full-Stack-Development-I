const mongoose = require('mongoose');

const dbURI = process.env.DB_URI || 'mongodb://127.0.0.1:27017/travlr';

mongoose.set('strictQuery', true);

mongoose.connection.on('connected', () => console.log(`Mongoose connected to ${dbURI}`));
mongoose.connection.on('error', error => console.error(`Mongoose connection error: ${error.message}`));
mongoose.connection.on('disconnected', () => console.log('Mongoose disconnected'));

async function connectDatabase() {
  if (mongoose.connection.readyState === 1) return mongoose.connection;

  try {
    await mongoose.connect(dbURI, { serverSelectionTimeoutMS: 3000 });
    return mongoose.connection;
  } catch (error) {
    console.error(`Unable to connect to MongoDB at ${dbURI}: ${error.message}`);
    throw error;
  }
}

async function gracefulShutdown(signal) {
  if (mongoose.connection.readyState !== 0) await mongoose.connection.close();
  console.log(`Mongoose disconnected through ${signal}`);
}

process.once('SIGINT', () => gracefulShutdown('SIGINT').finally(() => process.exit(0)));
process.once('SIGTERM', () => gracefulShutdown('SIGTERM').finally(() => process.exit(0)));

module.exports = { connectDatabase, gracefulShutdown, mongoose };
