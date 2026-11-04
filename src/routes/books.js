const express = require('express');
const router = express.Router();
const { getDbConnection } = require('../db/connection');

// Whitelisted columns for sorting to prevent SQL injection
const ALLOWED_ORDER_BY = ['id', 'title', 'author', 'price', 'created_at'];
const ALLOWED_ORDER_DIR = ['ASC', 'DESC'];

/**
 * GET /books
 * Query parameters:
 *  - search_q: partial title match (LIKE %search_q%)
 *  - order_by: column to sort by (default: 'id')
 *  - order: sort direction 'ASC' or 'DESC' (default: 'ASC')
 *  - limit: number of results (default: 10)
 *  - offset: pagination offset (default: 0)
 *  - min_price: minimum price filter
 *  - max_price: maximum price filter
 */
router.get('/', async (req, res, next) => {
  try {
    const db = await getDbConnection();

    let {
      search_q = '',
      order_by = 'id',
      order = 'ASC',
      limit = '10',
      offset = '0',
      min_price,
      max_price
    } = req.query;

    // Validate sorting
    const normalizedOrderBy = String(order_by).toLowerCase();
    const normalizedOrder = String(order).toUpperCase();

    if (!ALLOWED_ORDER_BY.includes(normalizedOrderBy)) {
      return res.status(400).json({
        message: `Invalid order_by column '${order_by}'. Allowed columns: ${ALLOWED_ORDER_BY.join(', ')}`
      });
    }

    if (!ALLOWED_ORDER_DIR.includes(normalizedOrder)) {
      return res.status(400).json({
        message: `Invalid order direction '${order}'. Allowed values: ASC, DESC`
      });
    }

    // Validate pagination
    const parsedLimit = parseInt(limit, 10);
    const parsedOffset = parseInt(offset, 10);

    if (isNaN(parsedLimit) || parsedLimit <= 0) {
      return res.status(400).json({
        message: "Query parameter 'limit' must be a positive integer"
      });
    }

    if (isNaN(parsedOffset) || parsedOffset < 0) {
      return res.status(400).json({
        message: "Query parameter 'offset' must be a non-negative integer"
      });
    }

    // Build conditions and params
    const conditions = [];
    const params = [];

    // Search query for title
    if (search_q.trim() !== '') {
      conditions.push('title LIKE ?');
      params.push(`%${search_q.trim()}%`);
    }

    // Price range filters
    let parsedMinPrice = null;
    let parsedMaxPrice = null;

    if (min_price !== undefined && min_price !== '') {
      parsedMinPrice = Number(min_price);
      if (isNaN(parsedMinPrice) || parsedMinPrice < 0) {
        return res.status(400).json({
          message: "Query parameter 'min_price' must be a valid non-negative number"
        });
      }
    }

    if (max_price !== undefined && max_price !== '') {
      parsedMaxPrice = Number(max_price);
      if (isNaN(parsedMaxPrice) || parsedMaxPrice < 0) {
        return res.status(400).json({
          message: "Query parameter 'max_price' must be a valid non-negative number"
        });
      }
    }

    if (parsedMinPrice !== null && parsedMaxPrice !== null) {
      if (parsedMinPrice > parsedMaxPrice) {
        return res.status(400).json({
          message: "'min_price' cannot be greater than 'max_price'"
        });
      }
      conditions.push('price BETWEEN ? AND ?');
      params.push(parsedMinPrice, parsedMaxPrice);
    } else if (parsedMinPrice !== null) {
      conditions.push('price >= ?');
      params.push(parsedMinPrice);
    } else if (parsedMaxPrice !== null) {
      conditions.push('price <= ?');
      params.push(parsedMaxPrice);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Total count query for pagination metadata
    const countSql = `SELECT COUNT(*) as total FROM books ${whereClause}`;
    const totalResult = await db.get(countSql, params);
    const totalCount = totalResult ? totalResult.total : 0;

    // Data query using parameterized inputs
    const querySql = `
      SELECT id, title, author, price, created_at
      FROM books
      ${whereClause}
      ORDER BY ${normalizedOrderBy} ${normalizedOrder}
      LIMIT ? OFFSET ?
    `;

    const dataParams = [...params, parsedLimit, parsedOffset];
    const books = await db.all(querySql, dataParams);

    return res.status(200).json({
      success: true,
      count: books.length,
      total: totalCount,
      pagination: {
        limit: parsedLimit,
        offset: parsedOffset
      },
      filters: {
        search_q: search_q || null,
        order_by: normalizedOrderBy,
        order: normalizedOrder,
        min_price: parsedMinPrice,
        max_price: parsedMaxPrice
      },
      data: books
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /books/:id
 * Retrieve a single book by ID
 */
router.get('/:id', async (req, res, next) => {
  try {
    const bookId = parseInt(req.params.id, 10);
    if (isNaN(bookId) || bookId <= 0) {
      return res.status(400).json({
        message: 'Invalid book ID format. ID must be a positive integer.'
      });
    }

    const db = await getDbConnection();
    const book = await db.get(
      'SELECT id, title, author, price, created_at FROM books WHERE id = ?',
      [bookId]
    );

    if (!book) {
      return res.status(404).json({
        message: `Book not found with ID ${bookId}`
      });
    }

    return res.status(200).json({
      success: true,
      data: book
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /books
 * Create a new book
 * Body: { title, author, price }
 */
router.post('/', async (req, res, next) => {
  try {
    const { title, author, price } = req.body;

    // Validate title
    if (!title || typeof title !== 'string' || title.trim() === '') {
      return res.status(400).json({
        message: "Validation Error: 'title' is required and must be a non-empty string"
      });
    }

    // Validate author
    if (!author || typeof author !== 'string' || author.trim() === '') {
      return res.status(400).json({
        message: "Validation Error: 'author' is required and must be a non-empty string"
      });
    }

    // Validate price
    if (price === undefined || price === null || price === '') {
      return res.status(400).json({
        message: "Validation Error: 'price' is required"
      });
    }

    const numericPrice = Number(price);
    if (isNaN(numericPrice) || typeof price === 'boolean') {
      return res.status(400).json({
        message: "Validation Error: 'price' must be a valid numeric value"
      });
    }

    if (numericPrice < 0) {
      return res.status(400).json({
        message: "Validation Error: 'price' cannot be negative"
      });
    }

    const db = await getDbConnection();
    const result = await db.run(
      'INSERT INTO books (title, author, price) VALUES (?, ?, ?)',
      [title.trim(), author.trim(), numericPrice]
    );

    const newBook = await db.get(
      'SELECT id, title, author, price, created_at FROM books WHERE id = ?',
      [result.lastID]
    );

    return res.status(201).json({
      message: 'Book created successfully',
      data: newBook
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /books/:id
 * Update an existing book by ID
 * Body: { title, author, price }
 */
router.put('/:id', async (req, res, next) => {
  try {
    const bookId = parseInt(req.params.id, 10);
    if (isNaN(bookId) || bookId <= 0) {
      return res.status(400).json({
        message: 'Invalid book ID format. ID must be a positive integer.'
      });
    }

    const db = await getDbConnection();
    const existingBook = await db.get('SELECT id FROM books WHERE id = ?', [bookId]);

    if (!existingBook) {
      return res.status(404).json({
        message: `Book not found with ID ${bookId}`
      });
    }

    const { title, author, price } = req.body;

    // Validate fields for update
    if (!title || typeof title !== 'string' || title.trim() === '') {
      return res.status(400).json({
        message: "Validation Error: 'title' is required and must be a non-empty string"
      });
    }

    if (!author || typeof author !== 'string' || author.trim() === '') {
      return res.status(400).json({
        message: "Validation Error: 'author' is required and must be a non-empty string"
      });
    }

    if (price === undefined || price === null || price === '') {
      return res.status(400).json({
        message: "Validation Error: 'price' is required"
      });
    }

    const numericPrice = Number(price);
    if (isNaN(numericPrice) || typeof price === 'boolean') {
      return res.status(400).json({
        message: "Validation Error: 'price' must be a valid numeric value"
      });
    }

    if (numericPrice < 0) {
      return res.status(400).json({
        message: "Validation Error: 'price' cannot be negative"
      });
    }

    await db.run(
      'UPDATE books SET title = ?, author = ?, price = ? WHERE id = ?',
      [title.trim(), author.trim(), numericPrice, bookId]
    );

    const updatedBook = await db.get(
      'SELECT id, title, author, price, created_at FROM books WHERE id = ?',
      [bookId]
    );

    return res.status(200).json({
      message: 'Book updated successfully',
      data: updatedBook
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /books/:id
 * Delete a book by ID
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const bookId = parseInt(req.params.id, 10);
    if (isNaN(bookId) || bookId <= 0) {
      return res.status(400).json({
        message: 'Invalid book ID format. ID must be a positive integer.'
      });
    }

    const db = await getDbConnection();
    const existingBook = await db.get('SELECT id FROM books WHERE id = ?', [bookId]);

    if (!existingBook) {
      return res.status(404).json({
        message: `Book not found with ID ${bookId}`
      });
    }

    await db.run('DELETE FROM books WHERE id = ?', [bookId]);

    return res.status(200).json({
      message: 'Book deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

