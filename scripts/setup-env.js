const { randomBytes } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const destination = path.join(__dirname, '..', '.env');
try {
  fs.writeFileSync(destination, `JWT_SECRET=${randomBytes(48).toString('hex')}\nDB_URI=mongodb://127.0.0.1:27017/travlr\n`, { flag: 'wx', mode: 0o600 });
  console.log('Created private .env configuration.');
} catch (error) {
  if (error.code === 'EEXIST') console.log('Existing .env configuration was kept.');
  else throw error;
}
