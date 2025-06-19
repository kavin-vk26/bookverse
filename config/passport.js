const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

module.exports = function(passport) {
  // Serialize the user
  passport.serializeUser((user, done) => {
    done(null, { id: user.id, google_id: user.google_id });
  });

  passport.deserializeUser(async (obj, done) => {
    try {
      let result;
      if (obj.id) {
        result = await pool.query('SELECT * FROM users WHERE id = $1', [obj.id]);
      } else if (obj.google_id) {
        result = await pool.query('SELECT * FROM users WHERE google_id = $1', [obj.google_id]);
      }
      done(null, result && result.rows[0]);
    } catch (err) {
      done(err, null);
    }
  });

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "/auth/google/callback"
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const { id, displayName, emails, photos } = profile;
          const email = emails && emails.length > 0 ? emails[0].value : null;
          const picture = photos && photos.length > 0 ? photos[0].value : null;

          // UPSERT user: insert or update on conflict (by google_id)
          const result = await pool.query(
            `INSERT INTO users (google_id, name, email, picture)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (google_id)
             DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email, picture = EXCLUDED.picture
             RETURNING *;`,
            [id, displayName, email, picture]
          );

          done(null, result.rows[0]);
        } catch (err) {
          console.error('Error in Google OAuth Strategy:', err.message);
          done(err, null);
        }
      }
    )
  );
};