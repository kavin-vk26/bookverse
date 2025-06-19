CREATE TABLE books (
  id SERIAL PRIMARY KEY,
  title VARCHAR(100) NOT NULL,
  author VARCHAR(100) NOT NULL,
  genre VARCHAR(50),
  description TEXT,
  user_id VARCHAR(255)
);