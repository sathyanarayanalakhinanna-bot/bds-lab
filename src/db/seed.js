const { getDbConnection, closeDbConnection } = require('./connection');

const initialBooks = [
  { title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', price: 10.99 },
  { title: 'To Kill a Mockingbird', author: 'Harper Lee', price: 12.50 },
  { title: '1984', author: 'George Orwell', price: 9.99 },
  { title: 'Pride and Prejudice', author: 'Jane Austen', price: 8.75 },
  { title: 'The Catcher in the Rye', author: 'J.D. Salinger', price: 11.20 },
  { title: 'The Hobbit', author: 'J.R.R. Tolkien', price: 14.99 },
  { title: 'Clean Code', author: 'Robert C. Martin', price: 34.50 },
  { title: 'The Pragmatic Programmer', author: 'David Thomas & Andrew Hunt', price: 39.99 },
  { title: 'Design Patterns', author: 'Erich Gamma et al.', price: 44.00 },
  { title: 'Introduction to Algorithms', author: 'Thomas H. Cormen', price: 65.00 },
  { title: 'JavaScript: The Good Parts', author: 'Douglas Crockford', price: 19.95 },
  { title: 'You Don\'t Know JS Yet', author: 'Kyle Simpson', price: 24.99 }
];

async function seed(customDbPath) {
  const db = await getDbConnection(customDbPath);

  // Clear existing data
  await db.run('DELETE FROM books;');
  await db.run('DELETE FROM sqlite_sequence WHERE name="books";');

  const insertStmt = await db.prepare(
    'INSERT INTO books (title, author, price) VALUES (?, ?, ?)'
  );

  for (const book of initialBooks) {
    await insertStmt.run(book.title, book.author, book.price);
  }

  await insertStmt.finalize();
  console.log(`Successfully seeded ${initialBooks.length} books into the database.`);
}

if (require.main === module) {
  seed()
    .then(async () => {
      await closeDbConnection();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('Failed to seed database:', err);
      await closeDbConnection();
      process.exit(1);
    });
}

module.exports = { seed, initialBooks };

