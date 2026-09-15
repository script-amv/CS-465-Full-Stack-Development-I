# Travlr Getaways

Module Three Express MVC and Handlebars application.

## Run the site

1. Install dependencies with `npm install`.
2. Start the server with `npm start`.
3. Open `http://localhost:3000` in a browser.

The `/travel` route passes local mock data from `data/trips.json` through the travel controller to the Handlebars view. The view uses `{{#each trips}}` to render each trip with the shared header and footer. Names, images, and descriptions are stored in JSON. Restart the server after changing that file. Old `/travel.html` links redirect to `/travel`.

Run `npm test` to check routes, JSON content, images, additional mock trips, empty data, and escaped HTML. Other pages and assets remain in `public/` for this course stage.