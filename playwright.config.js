const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './browser-tests',
  workers: 1,
  timeout: 45000,
  use: { baseURL: 'http://localhost:4200', channel: 'chrome', headless: true, viewport: { width: 1440, height: 1000 }, screenshot: 'only-on-failure' },
  webServer: [
    { command: 'npm run demo', url: 'http://localhost:3000/api/trips', reuseExistingServer: false, timeout: 60000 },
    { command: 'npm start --prefix app_admin -- --host localhost', url: 'http://localhost:4200', reuseExistingServer: false, timeout: 120000 },
  ],
});
