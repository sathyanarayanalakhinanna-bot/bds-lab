// BROKEN VERSION - Demonstrating Bug 1: Port conflict (EADDRINUSE)
const express = require('express');
// BUG 2: Wrong import path
const { getDbConnection } = require('./database/connection'); // ERROR: Cannot find module './database/connection'

const app = express();
app.use(express.json());

// BUG 1: Hardcoded port with no fallback or error handler, causing unhandled EADDRINUSE crash
const PORT = 3000;

app.get('/books', async (req, res) => {
  // BUG 4: Missing await
  const db = getDbConnection(); // Returns Promise { <pending> }, not the connection!
  
  // BUG 3: Table-name typo ('book' instead of 'books')
  const books = await db.all('SELECT * FROM book'); // ERROR: SQLITE_ERROR: no such table: book
  res.json(books);
});

// Starts server without checking if port is occupied
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
