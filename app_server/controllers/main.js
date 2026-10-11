const index = (req, res) => {
  res.render('home', { title: 'Travlr Getaways' });
};

module.exports = {
  index,
};
