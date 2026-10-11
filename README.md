# Travlr Getaways

Module Seven Travlr Getaways customer website and Angular admin SPA with login authentication.

## Run the site

1. Use Node 20 and install dependencies with `npm install`. Run `npm run setup` to create a private `.env` file with a random JWT signing secret.
2. Start MongoDB and load the sample trips with `npm run seed`. Change `DB_URI` in `.env` if your database uses a different address.
3. Start the server with `npm start`.
4. In a second terminal, run `cd app_admin`, `npm install`, and `npm start` with Node 20.
5. Open `http://localhost:3000/travel` for the public site and `http://localhost:4200` for the admin SPA.

For a quick local demo without a separate MongoDB installation, run `npm run demo` in the project folder instead of steps 2 and 3. It starts a temporary seeded database and the Express server, with a mock user: email `admin@example.test`, password `MockPassword7!`. These credentials are only for the disposable demo database. The demo database is cleared when the process stops. Keep the Express and Angular terminals running at the same time. Visit `http://localhost:4200/login` to sign in.

For a persistent database, register a user through Postman with `POST http://localhost:3000/api/register` and a JSON or URL-encoded body containing `name`, `email`, and `password`. Passwords must contain 12 to 128 characters. Use that email and password in the Angular login form. Registration returns HTTP 201 with `{ "token": "..." }`; login at `POST /api/login` returns HTTP 200 with a token. Missing or malformed credentials return 400, incorrect credentials return 401, and duplicate emails return 409.

The `/travel` controller requests trip JSON from the REST API, then passes it to the Handlebars view. The view uses `{{#each trips}}` to render each trip with shared header and footer. Old `/travel.html` links redirect to `/travel`.

The database module is at `app_api/models/db.js`. It connects through `DB_URI`, or uses `mongodb://127.0.0.1:27017/travlr` by default. The Trip schema is in `app_api/models/travlr.js` and requires a code, name, length, start date, resort, price, image, and description. The API supports `GET /api/trips`, `GET /api/trips/:tripCode`, `POST /api/trips`, `PUT /api/trips/:tripCode`, and `DELETE /api/trips/:tripCode`. The Angular trip data service uses these routes for listing, adding, editing, and deleting trips. Missing trips return 404, malformed codes return 400, invalid trip data returns 400, and duplicate codes return 409. Seed the `trips` collection with `npm run seed` after MongoDB is running. Run `npm run inspect-db` to print the collection count and records.

## Module Seven security

The User model at `app_api/models/user.js` stores email, name, a random 16-byte salt, and a PBKDF2-SHA512 password hash. It uses 210,000 iterations rather than the guide's demonstration value of 1,000. Password comparison uses constant-time comparison. Passwords, hashes, and salts are not returned in API responses or stored in Angular.

Passport's local strategy checks the database credentials. The server issues signed HS256 JSON Web Tokens that expire after one hour. Middleware validates the signature, expiration, and registered user before any POST, PUT, or DELETE trip action. Missing, altered, malformed, and expired tokens return JSON with HTTP 401. GET trip requests and the public Handlebars site remain open.

Angular stores the token under `travlr-token` in browser local storage. Its authentication service handles login and logout, malformed or expired local tokens, and the signed-in user display. The navbar and trip cards show CRUD controls only when signed in. Guards protect direct navigation to add/edit forms. The JWT interceptor sends `Authorization: Bearer <token>` only to this application's trip API, and clears the session and returns to login if the server rejects a token. CORS allows the Authorization header from the two local Angular development origins.

The course guide assumes that every registered user may manage trips. This implementation follows that single authentication layer; it does not implement administrator roles. Local storage is readable by browser scripts, so a production deployment would also need an authorization policy, HTTPS, and further session protection. Logout removes the browser token; an already copied token remains valid until its one-hour expiry.

`.env` is ignored by Git and excluded from the submission archive. `.env.example` and `npm run setup` let another developer generate their own secret. Keep actual secrets private; no online token verifier is required.

The server, seed command, and database inspection command load the same `.env` configuration. MongoDB credentials are redacted from connection logs. Compatible dependency patches keep Mongoose on version 6 and override Handlebars to 4.7.10; the production dependency audit reports no vulnerabilities. Development test-tool dependencies still report advisories.

## Tests

Run `npm test` for server integration and authentication tests using a temporary MongoDB. Run `npm run test:postman` to execute `postman/travlr-module7.postman_collection.json` through Newman against another temporary database. The same collection can be imported into Postman; set `baseUrl` to the running Express server. It registers a unique mock email on each run, logs in, stores the JWT as a collection variable, and tests unauthorized writes, wrong credentials, altered tokens, and authenticated trip CRUD.

Run `npm run test:browser` for Chrome browser checks of login, logout, add/update/delete, direct-route protection, malformed/expired local tokens, and rejected-token recovery. This command starts both demo servers on ports 3000 and 4200, which must be free. It requires installed Google Chrome and creates verification screenshots in the sibling `module7-submission/screenshots` folder. Run `npm run build` and `npm test -- --watch=false --browsers=ChromeHeadless` inside `app_admin` to build Angular and run its unit tests. Node 20 and Angular 18 are used for this course project.
