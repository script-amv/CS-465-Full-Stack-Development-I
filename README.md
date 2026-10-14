# Travlr Getaways

Final CS 465 MEAN-stack application: an Express/MVC/Handlebars customer website, a MongoDB/Mongoose REST API, and an Angular 18/Bootstrap administrator SPA. Use Node 20.

CS 465 Portfolio Reflection

Working on Travlr Getaways helped me see how the browser, server, and database work together. The project grew from static pages into a customer website and an administrator application that share the same data.

Architecture

The first customer pages used static HTML, so their content was fixed. The Express website later used MVC routes, controllers, and Handlebars templates to render trip data as HTML on the server. JavaScript handles the server logic and API requests. The Angular admin SPA uses TypeScript, which compiles to JavaScript, and updates browser components without loading a whole new page for every action. Both interfaces use the same Express API, but they render their pages in different places.

MongoDB was used because it is part of the MEAN stack and stores trips, users, and reservations as documents. This fits the objects passed between the JavaScript server and the frontend. Mongoose schemas keep fields such as trip codes, dates, and prices consistent. One database also lets both websites use the same current package information.

Functionality

JSON is a data format, while JavaScript is a programming language that runs instructions. JSON can hold objects, arrays, strings, numbers, and other simple values, but it does not run functions. The API returns trip records as JSON. Express passes that data to HBS templates, while Angular services pass it to components. JSON also provided the original mock trip data for seeding MongoDB.

During the project, the static trip page was changed to an HBS loop. Shared header and footer partials reduced repeated HTML. Database access was separated into app_api, while app_server kept the customer routes and views. In Angular, TripCard displays each package and TripFields supplies the fields for both add and edit forms. Reusing these parts keeps the interface consistent and makes changes easier because the same fix can help more than one page.

Testing

An endpoint is an API address, such as /api/trips or /api/trips/GR001. The HTTP method tells the server what action to take: GET reads data, POST creates it, PUT updates it, and DELETE removes it. Postman tests checked responses, status codes, and whether changes stayed in the database. Browser tests also checked that an admin update appeared in the trip cards and customer website.

Security added more cases to test. Protected requests needed a valid Bearer token, so testing the trip data alone was not enough. Checks included wrong passwords, expired or changed tokens, and customer attempts to use admin endpoints. Missing or invalid authentication returns 401, while an authenticated user without the required permission receives 403. Hiding an edit button is not enough; the server must also check permission. Tests checked that rejected requests did not change stored data.

Reflection

This course gave me a clearer understanding of full stack development and helped me prepare for software development work. I developed skills in Express MVC, HBS, Angular components and services, MongoDB schemas, REST APIs, authentication, and Git branches. The project also gave me practice testing problems across more than one layer and explaining the design in the SDD. I now have a working project to show in my portfolio. I still need more practice with Angular and security, but I feel more confident connecting the pieces of a web application.

## Quick local demo

In the project folder, run `npm ci` and `npm run demo`. In a second terminal, run `cd app_admin`, `npm ci`, and `npm start`. Keep both processes running.

Open `http://localhost:3000` for customers and `http://localhost:4200/login` for administrators. The demo uses a disposable MongoDB seeded from `data/trips.json` with two mock accounts:

- Administrator: `admin@example.test` / `MockPassword7!`
- Customer: `customer@example.test` / `MockCustomer7!`

These accounts exist only in the temporary demo database. Stopping the demo removes that database. Customers can also sign up through `/signup`.

## Persistent MongoDB setup

1. Run `npm ci` and `npm run setup`. Setup creates an ignored `.env` with a random JWT signing secret without overwriting an existing file.
2. Start MongoDB. Set `DB_URI` in `.env` if it differs from `mongodb://127.0.0.1:27017/travlr`.
3. For a new/test database, run `npm run seed`, then `npm run inspect-db`. Reseeding replaces the trip collection; do not run it against trip records you need to keep.
4. Create an administrator separately. Set `ADMIN_PASSWORD` securely in the terminal environment to a password of 12–128 characters, then run `ADMIN_EMAIL=staff@example.test ADMIN_NAME="Travlr Administrator" npm run create-admin`. Clear the password environment variable afterward. The command refuses to change an existing account.
5. Run `npm start` for Express. In a second terminal, run `cd app_admin`, `npm ci`, and `npm start` for Angular.

Do not include `.env`, real passwords, or database credentials in Git or archives. Server, seed, and inspection entrypoints read the same `.env`; connection logs redact MongoDB credentials. `.env.example` is guidance, not a shared secret.

## Customer website and administrator SPA

Public home and `/travel` use Express MVC controllers and HBS views with shared partials. The listing obtains live API JSON, renders an `each` loop, and supports location, minimum/maximum price, and category search. `/travel/:tripCode` shows package details. `/signup` and `/login` create/authenticate customer accounts. Checkout confirms a reservation with the agency without collecting payment. `/reservations` shows the customer's saved itineraries and allows cancellation.

Reservations save a trip/date/price snapshot and traveller count. The server calculates totals from the stored price and assigns the authenticated owner. Package edits do not rewrite existing bookings. Customers cannot read or cancel another customer's reservation; duplicate confirmed bookings return 409.

Checkout first obtains a signed ten-minute quote tied to the user, traveller count, and reviewed package fields. Confirming a changed or expired review returns 409 and requires checkout again. Trip codes cannot change after creation. Prices are finite USD amounts from $0 to $1,000,000 with up to two decimal places.

The Angular site is admin-only, including its trip list and direct add/edit/customer/reservation routes. Reusable cards and fields support trip CRUD. Administrators manage customer names, emails, active status, and reservation status. Deactivation blocks existing tokens and new login. Customers with booking history cannot be deleted; trips with confirmed bookings cannot be deleted. Public registration cannot create administrators or change roles.

## API and security

The API is mounted at `/api`. Public routes are GET `/trips`, GET `/trips/:tripCode`, POST `/register`, and POST `/login`. Search filters are `location`, `minPrice`, `maxPrice`, and `category`; filtered no matches returns `[]`, while an unfiltered empty collection returns 404.

POST `/trips` and PUT/DELETE `/trips/:tripCode` require an active administrator. GET `/me` returns safe account details. GET `/customers` and PUT/DELETE `/customers/:customerId` are admin-only. POST `/reservations` and GET `/me/reservations` require login; GET `/reservations` lists all bookings for administrators. GET/PUT `/reservations/:reservationId` permit the owner or an admin, with owner updates limited to cancellation.

Before POST `/reservations`, request GET `/trips/:tripCode/quote?travellers=2` with the customer's Bearer token. Submit its `quote` with `tripCode` and numeric `travellers`. The server rejects altered, wrong-owner, stale, or expired quotes rather than confirming unreviewed booking changes.

User passwords use random salts and PBKDF2-SHA512 with 210,000 iterations and constant-time comparison. Hashes/salts are excluded from API responses. Passport verifies credentials, then the server issues signed HS256 JWTs lasting one hour. Protected requests verify signatures, expiry, and current active database accounts; admin access uses the current database role.

Customer MVC forms use an HttpOnly SameSite=Lax token cookie and signed, session-bound CSRF tokens. Cookies are Secure in production. Angular uses local storage under `travlr-token`; its interceptor sends tokens only to this API, excluding login/register. Guards control navigation, but actual authorization is server-side. Rejected tokens clear the SPA session. Cancel unsubscribes pending login requests.

Errors include 400 invalid input, 401 missing/invalid credentials, 403 insufficient permission, 404 missing/private records, 409 conflicts, and 500/503 database/service failures. Another customer's itinerary returns 404.

This is a local course application, not a production deployment. Production needs HTTPS, request-rate controls, stronger session protection, monitoring, backups, and load testing. Logout does not revoke an already copied token. Automatic password-reset emails, payment processing, and airline integrations are not implemented.

Dependency audit: server production dependencies reported zero advisories. The required Angular 18 production dependency set reported eight advisories (four high, four moderate), with fixes requiring newer Angular major versions. The full development dependency audit also reports advisories, including two critical findings in the Angular toolchain. These packages are retained for the course's Angular 18 requirement; public deployment requires a separately tested dependency upgrade. Do not expose the demo or Angular development server publicly.

## Verification

Run `npm test` for integration tests with temporary databases. Test files run sequentially to avoid competing MongoDB startup timeouts. Run `npm run test:postman` for `postman/travlr-project.postman_collection.json` using Newman and another temporary database. It can be imported into Postman: set `baseUrl`, `adminEmail`, and `adminPassword` for the running app. It creates unique mock customer accounts and tests trip CRUD, role errors, search, reservation ownership/persistence/status, and customer management. Use a test database because it creates and changes records.

Run `npm run test:browser` to start both demo servers and test Chrome interfaces. Ports 3000/4200 must be free and Google Chrome installed. Screenshots go to the sibling `final-project-submission/screenshots` folder. Tests add, edit, verify, and remove a temporary FT009 tour dated February 20, 2027.

Inside `app_admin`, run `npm run build` and `npm test -- --watch=false --browsers=ChromeHeadless`. The final build completes with bundle-size and Bootstrap selector warnings. Earlier module branches remain separate course snapshots.
