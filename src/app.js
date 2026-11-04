const express = require('express');
const cors = require('cors');
const booksRouter = require('./routes/books');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root welcome & API info
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Welcome to Books REST API - Backend Development Fundamentals Lab 3',
    version: '1.0.0',
    endpoints: {
      'GET /books': 'List books with search_q, order_by, order, limit, offset, min_price, max_price',
      'GET /books/:id': 'Get book by ID',
      'POST /books': 'Create new book (title, author, price)',
      'PUT /books/:id': 'Update book by ID (title, author, price)',
      'DELETE /books/:id': 'Delete book by ID'
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString()
  });
});

// Books resource endpoints
app.use('/books', booksRouter);

// 404 Not Found Handler
app.use((req, res) => {
  res.status(404).json({
    message: `Endpoint ${req.method} ${req.originalUrl} not found`
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Application Error:', err);
  const status = err.status || 500;
  res.status(status).json({
    message: err.message || 'Internal server error occurred'
  });
});

module.exports = app;

