# Module Seven verification

Verified on October 11, 2026, using Node 20 and Angular 18.

## Assignment requirements

- Login security: Angular HTML login form, Passport local authentication, salted password hashes, one-hour signed JWTs, and middleware on every trip POST/PUT/DELETE endpoint.
- User endpoint testing: the Module Seven Postman collection tests registration, duplicate registration, invalid input, successful and failed login, unauthorized writes, altered tokens, and authenticated CRUD.
- Frontend/backend integration: the Angular interceptor supplies Bearer tokens to the configured trip API only; Express validates tokens before changing MongoDB. Public GET and Handlebars rendering remain available without login.
- Browser CRUD testing: signed-in users can create, update, and delete a mock trip. API queries and the public page reflect those changes. Logged-out users cannot see CRUD controls or directly access add/edit routes.

## Results

- Server integration suite: 24 tests passed, including expired/forged/malformed tokens, nonexistent users, password hashing, input validation, persistence, environment configuration, and credential redaction.
- Postman collection through Newman: 17 requests, 25 assertions passed.
- Google Chrome browser suite: 7 scenarios passed, including rejected-token recovery, expiry while editing, and cancellation of a delayed login.
- Angular production build: passed, with Bootstrap selector warnings and an initial bundle size warning (585.97 kB, below the 1 MB error limit).
- Angular unit suite in Chrome Headless: 3 tests passed.
- Production dependency audit: zero reported vulnerabilities after compatible Mongoose, proxy-addr, and Handlebars patches. Development test tools still have reported advisories.

## Review corrections

Security review identified inconsistent `.env` loading for seed/inspection, a session-expiry navigation race, a pending login surviving cancellation, and credentials in MongoDB logs. Regression tests reproduced each behavior before the fixes and passed afterward.

## Local test data and scope

`npm run demo` uses a temporary database seeded from `data/trips.json`, with a mock administrator (`admin@example.test`, `MockPassword7!`). These credentials are not created in a normal persistent database. The database is discarded when the demo stops.

This follows the guide's single authentication layer: registered users may manage trips. Administrator roles, immediate server-side token revocation on logout, and production deployment protections are not implemented in this assignment. The private signing secret is excluded from Git and the zip; another developer generates it using `npm run setup`.
