# Module Seven security plan

Goal: Add the course guide's single authentication layer to the existing Angular admin and Express API. Public trip reads and the Handlebars customer site remain available without login. As in the guide, registered users can administer trips; roles are outside this module.

1. Add integration tests for registration, login, hashed password storage, unauthorized write requests, invalid and expired tokens, and authenticated CRUD. Run the new tests before implementation to confirm the missing behavior.
2. Add the User Mongoose model (email, name, salt, hash), Passport local strategy, registration/login controllers, and JWT middleware. Keep the signing secret in an ignored .env file. Sign HS256 tokens lasting one hour; validate signatures, expiry, and the existing user before POST, PUT, or DELETE. Use a random 16-byte salt and PBKDF2-SHA512 with 210,000 iterations, with constant-time password comparison. Validate credential types and avoid returning password material.
3. Add Angular User/AuthResponse models, browser storage, authentication service, navbar, login form, route guard, and API-only JWT interceptor. Handle login asynchronously, remove expired or invalid local tokens, and return to login on protected API 401 errors. Hide add/edit/delete controls when logged out.
4. Add a Module Seven Postman collection covering registration, failed/successful login, unauthorized writes, authenticated CRUD, and altered tokens. Run it with Newman against a disposable database. Browser-test login, logout, route protection, CRUD, public rendering, and session expiry using mock data.
5. Update run instructions and configuration examples. Build Angular, run the server, Postman, and browser checks, review security boundaries, push module7, and package tracked source as module7-submission/travlr.zip. Exclude credentials, installed dependencies, and generated build caches.

Review focus: malformed credentials; duplicate normalized emails; malformed/expired tokens; token leakage to other origins; protected routes reached directly or after session expiry. Preserve module6 and earlier branches.
