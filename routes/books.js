const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
require('dotenv').config();

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) return next();
  res.redirect('/login');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Get all books (protected)
router.get('/', ensureAuthenticated, async (req, res) => {
  try {
    const results = await pool.query('SELECT * FROM books WHERE user_id = $1 ORDER BY id DESC', [req.user.id]);
    res.json(results.rows);
  } catch (err) {
    res.status(500).send('Error fetching books');
  }
});

// Add Book - POST (protected)
router.post('/add', ensureAuthenticated, async (req, res) => {
  const { title, author, genre, description, cover_url, status, notes } = req.body;
  try {
    await pool.query(
      'INSERT INTO books (title, author, genre, description, cover_url, user_id, status, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [title, author, genre, description, cover_url, req.user.id, status, notes]
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
    await pool.query('DELETE FROM books WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    res.status(204).end();
  } catch (err) {
    res.status(500).send('Error deleting book');
  }
});

module.exports = router;