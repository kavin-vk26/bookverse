const express = require('express');
const session = require('express-session');
const passport = require('passport');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();
require('./config/passport')(passport);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'keyboard cat',
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

// Authentication middleware
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/login');
}

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

// Google OAuth endpoints
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    res.redirect('/');
  }
);

// Book API routes
const booksRouter = require('./routes/books');
app.use('/api/books', booksRouter);

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
  WHERE user_id = $2 AND (
    title ILIKE $1
    OR author ILIKE $1
    OR genre ILIKE $1
    OR description ILIKE $1
  )
`, [`%${q}%`, req.user.id]);
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
  console.log(`Server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
});