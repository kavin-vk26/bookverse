const express = require('express');
const router = express.Router();
const pool = require('../db');
const ensureAuthenticated = require('../middleware/auth');

// POST /api/reviews/add
router.post('/add', ensureAuthenticated, async (req, res) => {
  const { book_id, rating, review } = req.body;
  try {
    await pool.query(
      'INSERT INTO reviews (user_id, book_id, rating, review) VALUES ($1, $2, $3, $4)',
      [req.user.id, book_id, rating, review]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Error adding review:', err.message);
    res.status(500).json({ error: 'Error saving review.' });
  }
});

// GET /api/reviews/:book_id - fetch reviews for a book
router.get('/:book_id', async (req, res) => {
  const { book_id } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT r.*, u.display_name FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.book_id = $1
       ORDER BY r.created_at DESC`,
      [book_id]
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching reviews:', err.message);
    res.status(500).json({ error: 'Error fetching reviews.' });
  }
});

module.exports = router;