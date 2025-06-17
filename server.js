require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// Passport configuration
require('./auth/google');

// Middleware
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'your_secret',
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

// Auth middleware
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

// Auth routes
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    res.redirect('/');
  }
);

app.get('/logout', (req, res) => {
  req.logout(() => {
    res.redirect('/');
  });
});

// Page routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.get('/add', ensureAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'addbook.html'));
});
app.get('/search', ensureAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'search.html'));
});
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});
app.get('/profile', ensureAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});
app.get('/profile-data', ensureAuthenticated, (req, res) => {
  res.json(req.user);
});

// Book API routes
const booksRouter = require('./routes/books');
app.use('/api/books', booksRouter);

// Reviews API routes (NEW)
const reviewsRouter = require('./routes/reviews');
app.use('/api/reviews', reviewsRouter);

// Book search API (protected)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});
app.get('/api/search', ensureAuthenticated, async (req, res) => {
  const { q } = req.query;
  try {
    const results = await pool.query(`
      SELECT * FROM books
      WHERE title ILIKE $1
         OR author ILIKE $1
         OR genre ILIKE $1
         OR description ILIKE $1
    `, [`%${q}%`]);
    res.json(results.rows);
  } catch (err) {
    console.error('Search error:', err.message);
    res.status(500).send('Server error while searching.');
  }
});

// 404 fallback
app.use((req, res) => {
  res.status(404).send('404 Not Found');
});


// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});