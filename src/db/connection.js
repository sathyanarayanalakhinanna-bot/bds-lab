const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

let dbInstance = null;

/**
 * Initializes and returns the SQLite database connection.
 * Creates the books table if it does not already exist.
 */
async function getDbConnection(dbFilePath) {
  if (dbInstance) {
    return dbInstance;
  }

  const filename = dbFilePath || process.env.DATABASE_FILE || path.resolve(__dirname, '../../database.sqlite');

  dbInstance = await open({
    filename,
    driver: sqlite3.Database,
  });

  // Enable foreign keys
  await dbInstance.run('PRAGMA foreign_keys = ON;');

  // Ensure books table exists
  await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      price REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  return dbInstance;
}

/**
 * Closes the database connection.
 */
async function closeDbConnection() {
  if (dbInstance) {
    await dbInstance.close();
    dbInstance = null;
  }
}

module.exports = {
  getDbConnection,
  closeDbConnection,
};

