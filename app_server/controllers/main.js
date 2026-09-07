const path = require('path');

const index = (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'public', 'index.html'));
};

module.exports = {
  index,
};
