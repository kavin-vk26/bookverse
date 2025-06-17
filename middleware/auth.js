function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  // If the request is for an API (starts with /api/), return 401
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  // Otherwise, redirect to login page
  res.redirect('/login');
}

module.exports = ensureAuthenticated;