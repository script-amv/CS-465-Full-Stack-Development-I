const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Travlr Getaways is running at http://localhost:${port}`);
  });
}

module.exports = app;
