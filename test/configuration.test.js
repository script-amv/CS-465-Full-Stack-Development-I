const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

test('server, seed, and inspection entrypoints load the same private database configuration', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'travlr-config-'));
  try {
    for (const file of ['.seedgooserc.js', 'app_api/models/db.js', 'app_api/config/security.js', 'app_api/config/environment.js']) {
      const source = path.join(__dirname, '..', file);
      if (!fs.existsSync(source)) continue;
      fs.mkdirSync(path.dirname(path.join(fixture, file)), { recursive: true });
      fs.copyFileSync(source, path.join(fixture, file));
    }
    fs.writeFileSync(path.join(fixture, '.env'), 'DB_URI=mongodb://127.0.0.1:27019/configured_travlr\n');
    const env = { ...process.env, NODE_PATH: path.join(__dirname, '..', 'node_modules') };
    delete env.DB_URI;
    for (const code of [
      'console.log(require("./.seedgooserc").db)',
      'const db=require("./app_api/models/db"); db.mongoose.connect=async uri=>console.log(uri); db.connectDatabase()',
    ]) {
      const result = spawnSync(process.execPath, ['-e', code], { cwd: fixture, env, encoding: 'utf8' });
      assert.equal(result.status, 0, result.stderr);
      assert.equal(result.stdout.trim(), 'mongodb://127.0.0.1:27019/configured_travlr');
    }
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

test('MongoDB logs omit credentials when connections fail', () => {
  const code = 'const db=require("./app_api/models/db"); db.mongoose.connect=async()=>{throw Error("Cannot connect to " + process.env.DB_URI)}; db.connectDatabase().catch(()=>{})';
  const result = spawnSync(process.execPath, ['-e', code], {
    cwd: path.join(__dirname, '..'), encoding: 'utf8',
    env: { ...process.env, DB_URI: 'mongodb://privateuser:privatepassword@127.0.0.1:27017/travlr' },
  });
  assert.equal(result.status, 0);
  assert.doesNotMatch(result.stdout + result.stderr, /privateuser|privatepassword/);
  assert.match(result.stderr, /Unable to connect to MongoDB/);
});
