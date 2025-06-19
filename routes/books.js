const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
require('dotenv').config();

// You may want to import ensureAuthenticated if you define it in server.js
// For reusability, we define it here too:
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Unauthorized' });
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Get all books (optional: can be public or protected)
router.get('/', ensureAuthenticated, async (req, res) => {
  try {
    const results = await pool.query('SELECT * FROM books WHERE user_id = $1 ORDER BY id DESC');
    res.json(results.rows);
  } catch (err) {
    res.status(500).send('Error fetching books');
  }
});

// Add Book - POST (protected)
router.post('/add', ensureAuthenticated, async (req, res) => {
  const { title, author, genre, description, cover_url } = req.body;
  try {
    await pool.query(
      'INSERT INTO books (title, author, genre, description, cover_url, user_id) VALUES ($1, $2, $3, $4, $5, $6)',
      [title, author, genre, description, cover_url, req.user.id]
    );
    res.redirect('/?success=true');
  } catch (err) {
    console.error('Error adding book:', err.message);
    res.status(500).send('Error saving book to database.');
  }
});

// Delete Book (protected)
router.delete('/:id', ensureAuthenticated, async (req, res) => {
  try {
    await pool.query('DELETE FROM books WHERE id = $1', [req.params.id]);
    res.status(204).end();
  } catch (err) {
    res.status(500).send('Error deleting book');
  }
});

module.exports = router;