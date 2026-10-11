# Final project implementation plan

Complete the final Travlr application and every section of the existing Software Design Document. Preserve earlier module branches.

## Application requirements

Keep Express MVC, HBS, MongoDB/Mongoose, the REST API, Angular 18, Bootstrap, and Node 20. Extend the finished module7 build to meet the full client scenario and wireframe: customer sign-up/login, travel search by location and price, trip reservations with saved itineraries, and an admin-only SPA that manages trips/prices and customer records.

New accounts have the customer role; public registration cannot create administrators. Verified database roles protect administrative endpoints, and customer reservations are scoped to the authenticated owner. Supply an explicit local administrator setup command and disposable demo accounts. Maintain the existing one-hour JWT protocol, password hashing, API-only token interceptor, and public trip reads. The customer MVC site uses an HttpOnly SameSite session cookie carrying the signed token; server-side forms use CSRF tokens. There is no external payment processing: checkout confirms a reservation with Travlr's agency and stores its price/date snapshot.

## Tasks and verification

1. Write failing server tests for customer/admin separation, search filters, owner-only reservation access, saved trip/price snapshots, admin customer management, and public MVC sign-up/login/booking/itinerary flow. Implement roles, reservation schema/controllers, search, and user management. Update existing tests to use explicit administrator fixtures.
2. Add HBS account, trip-detail/checkout, and reservation pages with shared navigation, forms, validation/errors, dates/prices, and a mobile-friendly stylesheet addition. Preserve the original Travlr images and page structure. Test signed-out redirects, customer persistence, CSRF rejection, and public search in the browser.
3. Add Angular role-aware guards/navigation, customer and reservation management components, and services. Keep reusable trip cards/forms. Test that customer logins cannot enter administration; administrator trip updates appear in both interfaces; staff can inspect/update customers and reservations.
4. Complete the SDD from the Milestone Two/template document: current executive summary and constraints, provided component diagram and explanation, updated sequence diagram (sign-in, trips, reservations, admin), actual implementation class diagram and explanation, complete API table, and User Interface text plus the required added-trip/edit/update screenshots. Preserve the earlier revision records and add the final revision.
5. Run server, Postman, browser, Angular unit/build, and archive checks. Render the DOCX to PDF and inspect pages for missing content, diagram legibility, screenshots, and layout. Push the project branch and package matching source as final-project-submission/travlr.zip. Place the final SDD and verification evidence beside it.

Document limits honestly: no real payment provider, airline integration, or invented production/load-test claims.

## Remaining implementation interfaces

The Angular `AuthenticationService.isAdmin()` reads the token role for navigation; the server checks the current database role before every administrative request. `authGuard` protects the trip list, add/edit forms, customers, and reservations. Customer credentials stay on login with an explanation and no stored token.

`ManagementService` consumes `GET /api/customers`, `PUT/DELETE /api/customers/:customerId`, `GET /api/reservations`, and `PUT /api/reservations/:reservationId`. CustomerManagementComponent edits name/email/active status; ReservationManagementComponent updates confirmed/cancelled status. The API interceptor attaches tokens only to the configured `/api/` origin, excluding login/register.

Trip forms add location and category while retaining the shared TripFieldsComponent. Browser tests in `browser-tests/project.spec.js` verify role denial, customer booking and return login, admin customer/reservation maintenance, and additional-tour add/edit/price changes. Required screenshots are saved under `final-project-submission/screenshots`.
