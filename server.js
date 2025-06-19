const express = require('express');
const session = require('express-session');
const passport = require('passport');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();
require('./config/passport')(passport);

const app = express();
const PORT = process.env.PORT || 3000;

const usersRouter = require('./routes/users');
app.use('/api/users', usersRouter);


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

app.get('/discover', ensureAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'discover.html'));
});
app.get('/user.html', ensureAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'user.html'));
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

app.get('/api/profile-stats', ensureAuthenticated, async (req, res) => {
  const userId = req.user.id;
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    const userQ = await pool.query('SELECT name, email FROM users WHERE id = $1', [userId]);
    const totalQ = await pool.query('SELECT COUNT(*) FROM books WHERE user_id = $1', [userId]);
    const byStatusQ = await pool.query('SELECT status, COUNT(*) FROM books WHERE user_id = $1 GROUP BY status', [userId]);
    const genreQ = await pool.query('SELECT genre, COUNT(*) AS c FROM books WHERE user_id=$1 GROUP BY genre ORDER BY c DESC LIMIT 1', [userId]);
    const authorQ = await pool.query('SELECT author, COUNT(*) AS c FROM books WHERE user_id=$1 GROUP BY author ORDER BY c DESC LIMIT 1', [userId]);
    const statusCounts = {};
    byStatusQ.rows.forEach(r => statusCounts[r.status] = parseInt(r.count));

    res.json({
      name: userQ.rows[0]?.name || "",
      email: userQ.rows[0]?.email || "",
      totalBooks: parseInt(totalQ.rows[0]?.count) || 0,
      statusCounts,
      favoriteGenre: genreQ.rows[0]?.genre || null,
      favoriteAuthor: authorQ.rows[0]?.author || null
    });
  } catch (err) {
    res.json({ error: "Failed to load stats." });
  }
});

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