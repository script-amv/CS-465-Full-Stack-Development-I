# Travlr Getaways

Module Four Express, Mongoose, and MongoDB application.

## Run the site

1. Install dependencies with `npm install`.
2. Start the server with `npm start`.
3. Open `http://localhost:3000` in a browser.

The `/travel` route passes local mock data from `data/trips.json` through the travel controller to the Handlebars view. The view uses `{{#each trips}}` to render each trip with the shared header and footer. Names, images, and descriptions are stored in JSON. Restart the server after changing that file. Old `/travel.html` links redirect to `/travel`.

The database module is at `app_server/models/db.js`. It connects through `DB_URI`, or uses `mongodb://127.0.0.1:27017/travlr` by default. The Trip schema is in `app_server/models/travlr.js` and requires a code, name, length, start date, resort, price, image, and description. `GET /api/trips` returns stored trips as JSON. Seed the local `trips` collection with `npm run seed` after MongoDB is running. Run `npm run inspect-db` to print the collection count and records for inspection in the terminal; MongoDB Compass can also show the `travlr.trips` collection.

Run `npm test` to check routes, JSON content, images, additional mock trips, empty data, schema validation, and API JSON handling. Other pages and assets remain in `public/` for this course stage.
