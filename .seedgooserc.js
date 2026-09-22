module.exports = {
  modelBaseDirectory: 'app_server/models',
  models: 'travlr.js',
  data: 'data',
  db: process.env.DB_URI || 'mongodb://127.0.0.1:27017/travlr',
};
