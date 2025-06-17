function showHome() {
  const main = document.getElementById('main-content');
  main.innerHTML = `
    <section id="home-section">
      <h2>Welcome to BookVerse</h2>
      <p>
        BookVerse is a mini digital catalog where you can list and manage your favorite books.
        Use the “Add Book” feature to build your reading list.
      </p>
    </section>
  `;
}

function showAddBook() {
  const main = document.getElementById('main-content');
  main.innerHTML = `
    <form id="book-form">
      <input type="text" id="title" placeholder="Book Title" required>
      <input type="text" id="author" placeholder="Author Name" required>
      <button type="submit">Add Book</button>
    </form>
    <ul id="book-list"></ul>
  `;

  const bookForm = document.getElementById('book-form');
  const bookList = document.getElementById('book-list');

  bookForm.onsubmit = (e) => {
    e.preventDefault();
    const title = document.getElementById('title').value;
    const author = document.getElementById('author').value;

    fetch('/books', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, author })
    }).then(() => {
      bookForm.reset();
      loadBooks();
    });
  };

  function loadBooks() {
    fetch('/books')
      .then(res => res.json())
      .then(data => {
        bookList.innerHTML = '';
        data.forEach(book => {
          const li = document.createElement('li');
          li.innerHTML = `${book.title} by ${book.author}
            <button onclick="deleteBook(${book.id})">❌</button>`;
          bookList.appendChild(li);
        });
      });
  }

  window.deleteBook = function (id) {
    fetch(`/books/${id}`, { method: 'DELETE' })
      .then(() => loadBooks());
  };

  loadBooks();
}

// Load home by default
document.addEventListener('DOMContentLoaded', showHome);
