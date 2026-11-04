const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const app = require('../src/app');
const { getDbConnection, closeDbConnection } = require('../src/db/connection');
const { seed } = require('../src/db/seed');

let server;
let baseUrl;

describe('Lab 3: REST API Tests', () => {
  before(async () => {
    // Use test database
    const testDbPath = path.resolve(__dirname, '../test.sqlite');
    process.env.DATABASE_FILE = testDbPath;
    await getDbConnection(testDbPath);

    // Start server on ephemeral port
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await closeDbConnection();
  });

  beforeEach(async () => {
    // Reset database to initial 12 books before each test
    await seed(process.env.DATABASE_FILE);
  });

  describe('GET /books - Listing, Search, Sorting, Filtering & Pagination', () => {
    test('returns default list of books with status 200 and pagination metadata', async () => {
      const res = await fetch(`${baseUrl}/books`);
      const body = await res.json();

      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.count, 10); // default limit is 10
      assert.equal(body.total, 12);
      assert.equal(body.pagination.limit, 10);
      assert.equal(body.pagination.offset, 0);
      assert.equal(Array.isArray(body.data), true);
    });

    test('searches books by partial title match (LIKE search_q)', async () => {
      const res = await fetch(`${baseUrl}/books?search_q=Clean`);
      const body = await res.json();

      assert.equal(res.status, 200);
      assert.equal(body.count, 1);
      assert.equal(body.data[0].title, 'Clean Code');
    });

    test('searches books case-insensitively', async () => {
      const res = await fetch(`${baseUrl}/books?search_q=hobbit`);
      const body = await res.json();

      assert.equal(res.status, 200);
      assert.equal(body.count, 1);
      assert.equal(body.data[0].title, 'The Hobbit');
    });

    test('sorts books by price DESC', async () => {
      const res = await fetch(`${baseUrl}/books?order_by=price&order=DESC&limit=12`);
      const body = await res.json();

      assert.equal(res.status, 200);
      assert.equal(body.count, 12);
      for (let i = 0; i < body.data.length - 1; i++) {
        assert.ok(body.data[i].price >= body.data[i + 1].price);
      }
    });

    test('sorts books by title ASC', async () => {
      const res = await fetch(`${baseUrl}/books?order_by=title&order=ASC&limit=5`);
      const body = await res.json();

      assert.equal(res.status, 200);
      assert.equal(body.count, 5);
      for (let i = 0; i < body.data.length - 1; i++) {
        assert.ok(body.data[i].title.localeCompare(body.data[i + 1].title) <= 0);
      }
    });

    test('filters books by price range (min_price and max_price)', async () => {
      const res = await fetch(`${baseUrl}/books?min_price=10&max_price=20`);
      const body = await res.json();

      assert.equal(res.status, 200);
      assert.ok(body.count > 0);
      for (const book of body.data) {
        assert.ok(book.price >= 10 && book.price <= 20);
      }
    });

    test('filters books with min_price only', async () => {
      const res = await fetch(`${baseUrl}/books?min_price=40`);
      const body = await res.json();

      assert.equal(res.status, 200);
      for (const book of body.data) {
        assert.ok(book.price >= 40);
      }
    });

    test('filters books with max_price only', async () => {
      const res = await fetch(`${baseUrl}/books?max_price=10`);
      const body = await res.json();

      assert.equal(res.status, 200);
      for (const book of body.data) {
        assert.ok(book.price <= 10);
      }
    });

    test('supports pagination with limit and offset', async () => {
      const res = await fetch(`${baseUrl}/books?limit=3&offset=3`);
      const body = await res.json();

      assert.equal(res.status, 200);
      assert.equal(body.count, 3);
      assert.equal(body.pagination.limit, 3);
      assert.equal(body.pagination.offset, 3);
    });

    test('returns 400 when order_by column is invalid', async () => {
      const res = await fetch(`${baseUrl}/books?order_by=hacked_column`);
      const body = await res.json();

      assert.equal(res.status, 400);
      assert.ok(body.message.includes('Invalid order_by column'));
    });

    test('returns 400 when order direction is invalid', async () => {
      const res = await fetch(`${baseUrl}/books?order=SIDEWAYS`);
      const body = await res.json();

      assert.equal(res.status, 400);
      assert.ok(body.message.includes('Invalid order direction'));
    });

    test('returns 400 when min_price is greater than max_price', async () => {
      const res = await fetch(`${baseUrl}/books?min_price=50&max_price=20`);
      const body = await res.json();

      assert.equal(res.status, 400);
      assert.equal(body.message, "'min_price' cannot be greater than 'max_price'");
    });

    test('returns 400 when price filter is non-numeric', async () => {
      const res = await fetch(`${baseUrl}/books?min_price=free`);
      const body = await res.json();

      assert.equal(res.status, 400);
      assert.ok(body.message.includes('must be a valid non-negative number'));
    });
  });

  describe('GET /books/:id - Single Book Retrieval', () => {
    test('returns 200 and book details for an existing ID', async () => {
      const res = await fetch(`${baseUrl}/books/1`);
      const body = await res.json();

      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.data.id, 1);
      assert.equal(body.data.title, 'The Great Gatsby');
    });

    test('returns 404 when book ID does not exist', async () => {
      const res = await fetch(`${baseUrl}/books/9999`);
      const body = await res.json();

      assert.equal(res.status, 404);
      assert.equal(body.message, 'Book not found with ID 9999');
    });

    test('returns 400 when book ID is non-numeric', async () => {
      const res = await fetch(`${baseUrl}/books/abc`);
      const body = await res.json();

      assert.equal(res.status, 400);
      assert.ok(body.message.includes('Invalid book ID format'));
    });
  });

  describe('POST /books - Book Creation and Validation', () => {
    test('returns 201 and created book when payload is valid', async () => {
      const payload = {
        title: 'Refactoring',
        author: 'Martin Fowler',
        price: 47.50
      };

      const res = await fetch(`${baseUrl}/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const body = await res.json();

      assert.equal(res.status, 201);
      assert.equal(body.message, 'Book created successfully');
      assert.equal(body.data.title, 'Refactoring');
      assert.equal(body.data.author, 'Martin Fowler');
      assert.equal(body.data.price, 47.50);
      assert.ok(body.data.id > 0);
    });

    test('returns 400 when title is missing', async () => {
      const payload = { author: 'Martin Fowler', price: 47.50 };

      const res = await fetch(`${baseUrl}/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const body = await res.json();

      assert.equal(res.status, 400);
      assert.ok(body.message.includes("'title' is required"));
    });

    test('returns 400 when author is missing', async () => {
      const payload = { title: 'Refactoring', price: 47.50 };

      const res = await fetch(`${baseUrl}/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const body = await res.json();

      assert.equal(res.status, 400);
      assert.ok(body.message.includes("'author' is required"));
    });

    test('returns 400 when price is missing', async () => {
      const payload = { title: 'Refactoring', author: 'Martin Fowler' };

      const res = await fetch(`${baseUrl}/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const body = await res.json();

      assert.equal(res.status, 400);
      assert.ok(body.message.includes("'price' is required"));
    });

    test('returns 400 when price is non-numeric string', async () => {
      const payload = { title: 'Refactoring', author: 'Martin Fowler', price: 'fifty' };

      const res = await fetch(`${baseUrl}/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const body = await res.json();

      assert.equal(res.status, 400);
      assert.ok(body.message.includes('must be a valid numeric value'));
    });

    test('returns 400 when price is negative', async () => {
      const payload = { title: 'Refactoring', author: 'Martin Fowler', price: -10 };

      const res = await fetch(`${baseUrl}/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const body = await res.json();

      assert.equal(res.status, 400);
      assert.ok(body.message.includes('cannot be negative'));
    });
  });

  describe('PUT /books/:id - Update Book', () => {
    test('returns 200 and updated book for valid input', async () => {
      const payload = {
        title: 'The Great Gatsby - Special Edition',
        author: 'F. Scott Fitzgerald',
        price: 15.99
      };

      const res = await fetch(`${baseUrl}/books/1`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const body = await res.json();

      assert.equal(res.status, 200);
      assert.equal(body.message, 'Book updated successfully');
      assert.equal(body.data.id, 1);
      assert.equal(body.data.title, 'The Great Gatsby - Special Edition');
      assert.equal(body.data.price, 15.99);
    });

    test('returns 404 when updating non-existent book ID', async () => {
      const payload = {
        title: 'Unknown Book',
        author: 'Anonymous',
        price: 20
      };

      const res = await fetch(`${baseUrl}/books/9999`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const body = await res.json();

      assert.equal(res.status, 404);
      assert.equal(body.message, 'Book not found with ID 9999');
    });

    test('returns 400 when updating with invalid price', async () => {
      const payload = {
        title: 'The Great Gatsby',
        author: 'F. Scott Fitzgerald',
        price: 'not-a-number'
      };

      const res = await fetch(`${baseUrl}/books/1`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const body = await res.json();

      assert.equal(res.status, 400);
      assert.ok(body.message.includes('must be a valid numeric value'));
    });
  });

  describe('DELETE /books/:id - Delete Book', () => {
    test('returns 200 when deleting an existing book', async () => {
      const res = await fetch(`${baseUrl}/books/1`, { method: 'DELETE' });
      const body = await res.json();

      assert.equal(res.status, 200);
      assert.equal(body.message, 'Book deleted successfully');

      // Subsequent GET should return 404
      const getRes = await fetch(`${baseUrl}/books/1`);
      assert.equal(getRes.status, 404);
    });

    test('returns 404 when deleting a non-existent book ID', async () => {
      const res = await fetch(`${baseUrl}/books/9999`, { method: 'DELETE' });
      const body = await res.json();

      assert.equal(res.status, 404);
      assert.equal(body.message, 'Book not found with ID 9999');
    });
  });

  describe('Global 404 and Error Format Consistency', () => {
    test('returns 404 with consistent error format for non-existent route', async () => {
      const res = await fetch(`${baseUrl}/unknown-endpoint`);
      const body = await res.json();

      assert.equal(res.status, 404);
      assert.ok(body.message);
      assert.equal(typeof body.message, 'string');
    });
  });
});
