const readline = require('node:readline/promises');
const { stdin, stdout } = require('node:process');
const { connectDatabase, mongoose } = require('../app_api/models/db');
const User = require('../app_api/models/user');

async function run() {
  const input = readline.createInterface({ input: stdin, output: stdout });
  try {
    const email = (process.env.ADMIN_EMAIL || await input.question('Administrator email: ')).trim().toLowerCase();
    const name = (process.env.ADMIN_NAME || await input.question('Administrator name: ')).trim();
    const password = process.env.ADMIN_PASSWORD;
    if (!password || password.length < 12 || password.length > 128) throw new Error('Set ADMIN_PASSWORD to a password of 12 to 128 characters before running this command.');
    if (!name || name.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('A valid name and email are required.');
    await connectDatabase();
    await User.init();
    if (await User.exists({ email })) throw new Error('This email already has an account. No account was changed.');
    const user = new User({ email, name, role: 'admin' });
    await user.setPassword(password); await user.save();
    console.log('Administrator account created.');
  } finally { input.close(); await mongoose.disconnect(); }
}
run().catch(error => { console.error(error.message); process.exitCode = 1; });
