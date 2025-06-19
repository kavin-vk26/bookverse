const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
require('dotenv').config();

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) return next();
  res.status(401).json({error: "Not authenticated"});
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Get all users (for discover page)
router.get('/all', ensureAuthenticated, async (req, res) => {
  const users = await pool.query('SELECT id, name, email FROM users WHERE id <> $1', [req.user.id]);
  res.json(users.rows);
});

// Get a single user's public profile and their books
router.get('/:id', ensureAuthenticated, async (req, res) => {
  const userQ = await pool.query('SELECT id, name, email FROM users WHERE id = $1', [req.params.id]);
  if (userQ.rowCount === 0) return res.status(404).json({ error: "User not found" });

  const booksQ = await pool.query(
    'SELECT * FROM books WHERE user_id = $1 ORDER BY id DESC',
    [req.params.id]
  );

  // Follower/following counts
  const followersQ = await pool.query('SELECT COUNT(*) FROM follows WHERE followed_id = $1', [req.params.id]);
  const followingQ = await pool.query('SELECT COUNT(*) FROM follows WHERE follower_id = $1', [req.params.id]);

  // Am I following?
  let amFollowing = false;
  if (req.user.id != req.params.id) {
    const checkFollow = await pool.query(
      'SELECT 1 FROM follows WHERE follower_id = $1 AND followed_id = $2',
      [req.user.id, req.params.id]
    );
    amFollowing = checkFollow.rowCount > 0;
  }

  res.json({
    user: userQ.rows[0],
    books: booksQ.rows,
    followers: parseInt(followersQ.rows[0].count),
    following: parseInt(followingQ.rows[0].count),
    amFollowing
  });
});

// Follow a user
router.post('/:id/follow', ensureAuthenticated, async (req, res) => {
  if (req.user.id == req.params.id) return res.status(400).json({ error: "Cannot follow yourself" });
  await pool.query(
    'INSERT INTO follows (follower_id, followed_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [req.user.id, req.params.id]
  );
  res.json({ success: true });
});

// Unfollow a user
router.post('/:id/unfollow', ensureAuthenticated, async (req, res) => {
  if (req.user.id == req.params.id) return res.status(400).json({ error: "Cannot unfollow yourself" });
  await pool.query(
    'DELETE FROM follows WHERE follower_id = $1 AND followed_id = $2',
    [req.user.id, req.params.id]
  );
  res.json({ success: true });
});

module.exports = router;