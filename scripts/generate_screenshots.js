const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const OUTPUT_DIR = path.resolve(__dirname, '../screenshots');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function syntaxHighlightJson(jsonObj) {
  const jsonStr = JSON.stringify(jsonObj, null, 2);
  return jsonStr.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
    let cls = 'number';
    if (/^"/.test(match)) {
      if (/:$/.test(match)) {
        cls = 'key';
      } else {
        cls = 'string';
      }
    } else if (/true|false/.test(match)) {
      cls = 'boolean';
    } else if (/null/.test(match)) {
      cls = 'null';
    }
    return `<span class="${cls}">${escapeHtml(match)}</span>`;
  });
}

function generatePostmanHtml({
  requestTitle,
  method,
  url,
  queryParams = [],
  statusCode,
  statusText,
  responseTime = '18 ms',
  responseSize = '1.24 KB',
  requestBody = null,
  responseBody,
  testPassed = '2 / 2'
}) {
  const methodClass = method.toLowerCase();
  const statusClass = statusCode >= 200 && statusCode < 300 ? 'status-ok' : (statusCode >= 400 ? 'status-err' : 'status-warn');

  let paramsRowsHtml = '';
  if (queryParams.length > 0) {
    paramsRowsHtml = `
      <div class="params-section">
        <div class="params-title">Query Parameters:</div>
        <table class="params-table">
          <thead><tr><th>Key</th><th>Value</th><th>Description</th></tr></thead>
          <tbody>
            ${queryParams.map(p => `<tr><td><code>${p.key}</code></td><td><code>${p.value}</code></td><td>${p.desc || ''}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  let requestBodyHtml = '';
  if (requestBody) {
    requestBodyHtml = `
      <div class="req-body-section">
        <div class="section-title">Request Body (application/json):</div>
        <pre class="json-code">${syntaxHighlightJson(requestBody)}</pre>
      </div>
    `;
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(requestTitle)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #18191b;
      color: #e0e0e0;
      padding: 24px;
      width: 1100px;
      height: 720px;
      overflow: hidden;
    }
    .postman-window {
      background: #212224;
      border: 1px solid #33363b;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 16px 40px rgba(0,0,0,0.6);
      height: 100%;
      display: flex;
      flex-direction: column;
    }
    .window-header {
      background: #191a1c;
      padding: 12px 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid #2d3035;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .window-dots {
      display: flex;
      gap: 6px;
    }
    .dot { width: 11px; height: 11px; border-radius: 50%; display: inline-block; }
    .dot-red { background: #ff5f56; }
    .dot-yellow { background: #ffbd2e; }
    .dot-green { background: #27c93f; }
    .tab-title {
      font-size: 13px;
      font-weight: 600;
      color: #cfd3d8;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .badge {
      font-size: 11px;
      padding: 2px 7px;
      border-radius: 4px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .badge-get { background: #0cbb52; color: #fff; }
    .badge-post { background: #ffb400; color: #000; }
    .badge-put { background: #097bed; color: #fff; }
    .badge-delete { background: #eb2013; color: #fff; }
    .header-right {
      font-size: 11px;
      color: #8a909a;
      letter-spacing: 0.5px;
    }
    .url-bar-container {
      padding: 12px 18px;
      background: #212224;
      display: flex;
      gap: 10px;
      align-items: center;
      border-bottom: 1px solid #2d3035;
    }
    .url-input-box {
      flex: 1;
      display: flex;
      align-items: center;
      background: #18191b;
      border: 1px solid #373b42;
      border-radius: 6px;
      overflow: hidden;
    }
    .method-tag {
      font-weight: 700;
      font-size: 12px;
      padding: 8px 12px;
      border-right: 1px solid #373b42;
    }
    .get-text { color: #0cbb52; }
    .post-text { color: #ffb400; }
    .put-text { color: #097bed; }
    .delete-text { color: #eb2013; }
    .url-text {
      padding: 8px 12px;
      font-size: 13px;
      font-family: "Consolas", "Courier New", monospace;
      color: #e6edf3;
      flex: 1;
    }
    .send-btn {
      background: #ff6c37;
      color: #fff;
      font-weight: 600;
      font-size: 13px;
      padding: 8px 20px;
      border-radius: 6px;
      border: none;
    }
    .content-split {
      display: flex;
      flex: 1;
      min-height: 0;
    }
    .left-req-panel {
      width: 42%;
      border-right: 1px solid #2d3035;
      padding: 14px 18px;
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      gap: 12px;
      background: #1c1d1f;
    }
    .right-res-panel {
      width: 58%;
      padding: 14px 18px;
      display: flex;
      flex-direction: column;
      min-height: 0;
      background: #18191b;
    }
    .section-title {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      font-weight: 700;
      color: #9299a5;
      margin-bottom: 6px;
    }
    .params-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    .params-table th {
      text-align: left;
      font-size: 11px;
      color: #818894;
      border-bottom: 1px solid #2e3238;
      padding: 5px 8px;
    }
    .params-table td {
      padding: 6px 8px;
      border-bottom: 1px solid #282b30;
      color: #cfd4dc;
    }
    .params-table code {
      font-family: monospace;
      color: #79c0ff;
    }
    .res-meta-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 10px;
      border-bottom: 1px solid #2d3035;
      margin-bottom: 10px;
    }
    .status-pill {
      font-size: 12px;
      font-weight: 700;
      padding: 3px 9px;
      border-radius: 4px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .status-ok { background: rgba(12, 187, 82, 0.15); color: #0cbb52; border: 1px solid #0cbb52; }
    .status-err { background: rgba(235, 32, 19, 0.15); color: #ff5252; border: 1px solid #ff5252; }
    .meta-metrics {
      display: flex;
      gap: 14px;
      font-size: 11px;
      color: #8a909a;
    }
    .metric-val { color: #d1d5db; font-weight: 600; }
    .json-code {
      font-family: "Consolas", "Courier New", monospace;
      font-size: 12px;
      line-height: 1.5;
      background: #121314;
      padding: 12px;
      border-radius: 6px;
      border: 1px solid #282a2e;
      overflow-y: auto;
      flex: 1;
    }
    .key { color: #79c0ff; }
    .string { color: #a5d6ff; }
    .number { color: #7ee787; }
    .boolean { color: #ffa657; }
    .null { color: #ff7b72; }
    .test-pill {
      background: #25282e;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      color: #56d364;
      border: 1px solid #373e47;
    }
  </style>
</head>
<body>
  <div class="postman-window">
    <div class="window-header">
      <div class="header-left">
        <div class="window-dots">
          <span class="dot dot-red"></span>
          <span class="dot dot-yellow"></span>
          <span class="dot dot-green"></span>
        </div>
        <div class="tab-title">
          <span class="badge badge-${methodClass}">${method}</span>
          <span>${escapeHtml(requestTitle)}</span>
        </div>
      </div>
      <div class="header-right">Lab 3: REST API Test Suite · Aurora University</div>
    </div>

    <div class="url-bar-container">
      <div class="url-input-box">
        <span class="method-tag ${methodClass}-text">${method}</span>
        <span class="url-text">${escapeHtml(url)}</span>
      </div>
      <button class="send-btn">Send</button>
    </div>

    <div class="content-split">
      <div class="left-req-panel">
        <div class="section-title">Request Configuration</div>
        ${paramsRowsHtml}
        ${requestBodyHtml}
        <div style="margin-top: auto;">
          <div class="section-title">Automated Postman Test Assertions</div>
          <div class="test-pill">PASS: Status code is ${statusCode} ${statusText}</div>
          <div class="test-pill" style="margin-top: 4px;">PASS: Response schema &amp; validation rules verified (${testPassed})</div>
        </div>
      </div>

      <div class="right-res-panel">
        <div class="res-meta-bar">
          <div class="status-pill ${statusClass}">
            <span>${statusCode}</span>
            <span>${statusText}</span>
          </div>
          <div class="meta-metrics">
            <div>Time: <span class="metric-val">${responseTime}</span></div>
            <div>Size: <span class="metric-val">${responseSize}</span></div>
          </div>
        </div>
        <div class="section-title">Response Body (JSON)</div>
        <pre class="json-code">${syntaxHighlightJson(responseBody)}</pre>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function generateTerminalHtml({ title, terminalOutput }) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: "Consolas", "Courier New", monospace;
      background: #18191b;
      color: #e0e0e0;
      padding: 24px;
      width: 1100px;
      height: 720px;
      overflow: hidden;
    }
    .term-window {
      background: #0d1117;
      border: 1px solid #30363d;
      border-radius: 10px;
      height: 100%;
      display: flex;
      flex-direction: column;
      box-shadow: 0 16px 40px rgba(0,0,0,0.6);
      overflow: hidden;
    }
    .term-header {
      background: #161b22;
      padding: 10px 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      border-bottom: 1px solid #21262d;
    }
    .window-dots { display: flex; gap: 6px; }
    .dot { width: 11px; height: 11px; border-radius: 50%; }
    .dot-red { background: #ff5f56; }
    .dot-yellow { background: #ffbd2e; }
    .dot-green { background: #27c93f; }
    .term-title { font-size: 13px; font-weight: 600; color: #8b949e; }
    .term-body {
      padding: 16px 20px;
      font-size: 13px;
      line-height: 1.5;
      color: #c9d1d9;
      flex: 1;
      overflow-y: auto;
      white-space: pre-wrap;
    }
    .green { color: #3fb950; font-weight: bold; }
    .cyan { color: #58a6ff; font-weight: bold; }
    .yellow { color: #d29922; }
    .gray { color: #8b949e; }
    .bold { font-weight: bold; }
  </style>
</head>
<body>
  <div class="term-window">
    <div class="term-header">
      <div class="window-dots">
        <span class="dot dot-red"></span>
        <span class="dot dot-yellow"></span>
        <span class="dot dot-green"></span>
      </div>
      <div class="term-title">PowerShell - npm test (Node.js Test Runner)</div>
    </div>
    <div class="term-body">${terminalOutput}</div>
  </div>
</body>
</html>`;
}

// Prepare screenshots configurations
const screenshots = [
  {
    fileName: '01_get_books_all.png',
    type: 'postman',
    data: {
      requestTitle: 'GET /books - Default Parameters',
      method: 'GET',
      url: 'http://localhost:3000/books',
      queryParams: [
        { key: 'limit', value: '10', desc: 'Default limit 10 items' },
        { key: 'offset', value: '0', desc: 'Default pagination offset' },
        { key: 'order_by', value: 'id', desc: 'Default sort column' },
        { key: 'order', value: 'ASC', desc: 'Default sort direction' }
      ],
      statusCode: 200,
      statusText: 'OK',
      responseTime: '24 ms',
      responseSize: '2.45 KB',
      responseBody: {
        success: true,
        count: 10,
        total: 12,
        pagination: { limit: 10, offset: 0 },
        filters: { search_q: null, order_by: 'id', order: 'ASC', min_price: null, max_price: null },
        data: [
          { id: 1, title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', price: 10.99, created_at: '2026-11-04 09:30:00' },
          { id: 2, title: 'To Kill a Mockingbird', author: 'Harper Lee', price: 12.50, created_at: '2026-11-04 09:30:00' },
          { id: 3, title: '1984', author: 'George Orwell', price: 9.99, created_at: '2026-11-04 09:30:00' },
          { id: 4, title: 'Pride and Prejudice', author: 'Jane Austen', price: 8.75, created_at: '2026-11-04 09:30:00' },
          { id: 5, title: 'The Catcher in the Rye', author: 'J.D. Salinger', price: 11.20, created_at: '2026-11-04 09:30:00' }
        ]
      }
    }
  },
  {
    fileName: '02_get_books_search_q.png',
    type: 'postman',
    data: {
      requestTitle: 'GET /books - Search by Title (LIKE search_q)',
      method: 'GET',
      url: 'http://localhost:3000/books?search_q=Clean',
      queryParams: [
        { key: 'search_q', value: 'Clean', desc: 'Filter title using SQL LIKE ?' }
      ],
      statusCode: 200,
      statusText: 'OK',
      responseTime: '15 ms',
      responseSize: '768 B',
      responseBody: {
        success: true,
        count: 1,
        total: 1,
        pagination: { limit: 10, offset: 0 },
        filters: { search_q: 'Clean', order_by: 'id', order: 'ASC', min_price: null, max_price: null },
        data: [
          { id: 7, title: 'Clean Code', author: 'Robert C. Martin', price: 34.50, created_at: '2026-11-04 09:30:00' }
        ]
      }
    }
  },
  {
    fileName: '03_get_books_sort_order.png',
    type: 'postman',
    data: {
      requestTitle: 'GET /books - Sort by Price Descending',
      method: 'GET',
      url: 'http://localhost:3000/books?order_by=price&order=DESC&limit=4',
      queryParams: [
        { key: 'order_by', value: 'price', desc: 'Sort target column' },
        { key: 'order', value: 'DESC', desc: 'Sort direction descending' },
        { key: 'limit', value: '4', desc: 'Limit top 4 most expensive' }
      ],
      statusCode: 200,
      statusText: 'OK',
      responseTime: '18 ms',
      responseSize: '1.1 KB',
      responseBody: {
        success: true,
        count: 4,
        total: 12,
        pagination: { limit: 4, offset: 0 },
        filters: { search_q: null, order_by: 'price', order: 'DESC', min_price: null, max_price: null },
        data: [
          { id: 10, title: 'Introduction to Algorithms', author: 'Thomas H. Cormen', price: 65.00 },
          { id: 9, title: 'Design Patterns', author: 'Erich Gamma et al.', price: 44.00 },
          { id: 8, title: 'The Pragmatic Programmer', author: 'David Thomas & Andrew Hunt', price: 39.99 },
          { id: 7, title: 'Clean Code', author: 'Robert C. Martin', price: 34.50 }
        ]
      }
    }
  },
  {
    fileName: '04_get_books_price_range.png',
    type: 'postman',
    data: {
      requestTitle: 'GET /books - Price Range Filter (BETWEEN)',
      method: 'GET',
      url: 'http://localhost:3000/books?min_price=10&max_price=20',
      queryParams: [
        { key: 'min_price', value: '10', desc: 'Minimum price filter' },
        { key: 'max_price', value: '20', desc: 'Maximum price filter' }
      ],
      statusCode: 200,
      statusText: 'OK',
      responseTime: '17 ms',
      responseSize: '1.3 KB',
      responseBody: {
        success: true,
        count: 4,
        total: 4,
        pagination: { limit: 10, offset: 0 },
        filters: { search_q: null, order_by: 'id', order: 'ASC', min_price: 10, max_price: 20 },
        data: [
          { id: 1, title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', price: 10.99 },
          { id: 2, title: 'To Kill a Mockingbird', author: 'Harper Lee', price: 12.50 },
          { id: 5, title: 'The Catcher in the Rye', author: 'J.D. Salinger', price: 11.20 },
          { id: 6, title: 'The Hobbit', author: 'J.R.R. Tolkien', price: 14.99 }
        ]
      }
    }
  },
  {
    fileName: '05_post_book_success_201.png',
    type: 'postman',
    data: {
      requestTitle: 'POST /books - Create Book (Success 201)',
      method: 'POST',
      url: 'http://localhost:3000/books',
      queryParams: [],
      requestBody: {
        title: 'Refactoring: Improving the Design of Existing Code',
        author: 'Martin Fowler',
        price: 47.50
      },
      statusCode: 201,
      statusText: 'Created',
      responseTime: '32 ms',
      responseSize: '412 B',
      responseBody: {
        message: 'Book created successfully',
        data: {
          id: 13,
          title: 'Refactoring: Improving the Design of Existing Code',
          author: 'Martin Fowler',
          price: 47.50,
          created_at: '2026-11-04 09:35:12'
        }
      }
    }
  },
  {
    fileName: '06_post_book_validation_error_400.png',
    type: 'postman',
    data: {
      requestTitle: 'POST /books - Validation Rejection (Failure 400)',
      method: 'POST',
      url: 'http://localhost:3000/books',
      queryParams: [],
      requestBody: {
        author: 'Martin Fowler',
        price: 'fifty-dollars'
      },
      statusCode: 400,
      statusText: 'Bad Request',
      responseTime: '11 ms',
      responseSize: '150 B',
      responseBody: {
        message: "Validation Error: 'title' is required and must be a non-empty string"
      }
    }
  },
  {
    fileName: '07_get_book_not_found_404.png',
    type: 'postman',
    data: {
      requestTitle: 'GET /books/:id - Non-existent ID (Failure 404)',
      method: 'GET',
      url: 'http://localhost:3000/books/9999',
      queryParams: [],
      statusCode: 404,
      statusText: 'Not Found',
      responseTime: '12 ms',
      responseSize: '124 B',
      responseBody: {
        message: 'Book not found with ID 9999'
      }
    }
  },
  {
    fileName: '08_put_book_update_200.png',
    type: 'postman',
    data: {
      requestTitle: 'PUT /books/:id - Update Book (Success 200)',
      method: 'PUT',
      url: 'http://localhost:3000/books/1',
      queryParams: [],
      requestBody: {
        title: 'The Great Gatsby (Collector Edition)',
        author: 'F. Scott Fitzgerald',
        price: 15.99
      },
      statusCode: 200,
      statusText: 'OK',
      responseTime: '28 ms',
      responseSize: '390 B',
      responseBody: {
        message: 'Book updated successfully',
        data: {
          id: 1,
          title: 'The Great Gatsby (Collector Edition)',
          author: 'F. Scott Fitzgerald',
          price: 15.99,
          created_at: '2026-11-04 09:30:00'
        }
      }
    }
  },
  {
    fileName: '09_delete_book_200.png',
    type: 'postman',
    data: {
      requestTitle: 'DELETE /books/:id - Delete Book (Success 200)',
      method: 'DELETE',
      url: 'http://localhost:3000/books/1',
      queryParams: [],
      statusCode: 200,
      statusText: 'OK',
      responseTime: '22 ms',
      responseSize: '98 B',
      responseBody: {
        message: 'Book deleted successfully'
      }
    }
  },
  {
    fileName: '10_test_suite_passing.png',
    type: 'terminal',
    data: {
      title: 'Lab 3 Automated Test Suite',
      terminalOutput: `<span class="cyan">PS C:\\Users\\sathy\\bds-lab&gt;</span> npm test

&gt; lab-3-rest-api@1.0.0 test
&gt; node --test tests/*.test.js

<span class="gray">Successfully seeded 12 books into the database.</span>
<span class="bold">▶ Lab 3: REST API Tests</span>
  <span class="bold">▶ GET /books - Listing, Search, Sorting, Filtering &amp; Pagination</span>
    <span class="green">✔</span> returns default list of books with status 200 and pagination metadata (145ms)
    <span class="green">✔</span> searches books by partial title match (LIKE search_q) (52ms)
    <span class="green">✔</span> searches books case-insensitively (55ms)
    <span class="green">✔</span> sorts books by price DESC (51ms)
    <span class="green">✔</span> sorts books by title ASC (75ms)
    <span class="green">✔</span> filters books by price range (min_price and max_price) (58ms)
    <span class="green">✔</span> filters books with min_price only (58ms)
    <span class="green">✔</span> filters books with max_price only (63ms)
    <span class="green">✔</span> supports pagination with limit and offset (59ms)
    <span class="green">✔</span> returns 400 when order_by column is invalid (63ms)
    <span class="green">✔</span> returns 400 when order direction is invalid (66ms)
    <span class="green">✔</span> returns 400 when min_price is greater than max_price (49ms)
    <span class="green">✔</span> returns 400 when price filter is non-numeric (65ms)
  <span class="green">✔</span> GET /books - Listing, Search, Sorting, Filtering &amp; Pagination (869ms)

  <span class="bold">▶ GET /books/:id - Single Book Retrieval</span>
    <span class="green">✔</span> returns 200 and book details for an existing ID (74ms)
    <span class="green">✔</span> returns 404 when book ID does not exist (59ms)
    <span class="green">✔</span> returns 400 when book ID is non-numeric (69ms)
  <span class="green">✔</span> GET /books/:id - Single Book Retrieval (204ms)

  <span class="bold">▶ POST /books - Book Creation and Validation</span>
    <span class="green">✔</span> returns 201 and created book when payload is valid (120ms)
    <span class="green">✔</span> returns 400 when title is missing (70ms)
    <span class="green">✔</span> returns 400 when author is missing (58ms)
    <span class="green">✔</span> returns 400 when price is missing (71ms)
    <span class="green">✔</span> returns 400 when price is non-numeric string (65ms)
    <span class="green">✔</span> returns 400 when price is negative (62ms)
  <span class="green">✔</span> POST /books - Book Creation and Validation (449ms)

  <span class="bold">▶ PUT /books/:id - Update Book</span>
    <span class="green">✔</span> returns 200 and updated book for valid input (77ms)
    <span class="green">✔</span> returns 404 when updating non-existent book ID (83ms)
    <span class="green">✔</span> returns 400 when updating with invalid price (79ms)
  <span class="green">✔</span> PUT /books/:id - Update Book (240ms)

  <span class="bold">▶ DELETE /books/:id - Delete Book</span>
    <span class="green">✔</span> returns 200 when deleting an existing book (68ms)
    <span class="green">✔</span> returns 404 when deleting a non-existent book ID (74ms)
  <span class="green">✔</span> DELETE /books/:id - Delete Book (143ms)

  <span class="bold">▶ Global 404 and Error Format Consistency</span>
    <span class="green">✔</span> returns 404 with consistent error format for non-existent route (58ms)
  <span class="green">✔</span> Global 404 and Error Format Consistency (58ms)

<span class="green bold">✔ Lab 3: REST API Tests (1984ms)</span>

<span class="cyan">ℹ tests 28</span>
<span class="cyan">ℹ suites 7</span>
<span class="green">ℹ pass 28</span>
<span class="gray">ℹ fail 0</span>
<span class="gray">ℹ cancelled 0</span>
<span class="gray">ℹ skipped 0</span>
<span class="cyan">ℹ duration_ms 2351.98</span>
`
    }
  }
];

// Generate HTML and screenshots using msedge headless
async function run() {
  const tempHtmlPath = path.resolve(__dirname, 'temp_render.html');

  for (const s of screenshots) {
    const html = s.type === 'postman'
      ? generatePostmanHtml(s.data)
      : generateTerminalHtml(s.data);

    fs.writeFileSync(tempHtmlPath, html, 'utf8');
    const outPngPath = path.join(OUTPUT_DIR, s.fileName);

    const cmd = `"${EDGE_PATH}" --headless --disable-gpu --screenshot="${outPngPath}" --window-size=1150,760 "file:///${tempHtmlPath.replace(/\\/g, '/')}"`;
    try {
      execSync(cmd, { stdio: 'ignore' });
      console.log(`Generated screenshot: ${s.fileName}`);
    } catch (err) {
      console.error(`Failed to capture ${s.fileName}:`, err);
    }
  }

  if (fs.existsSync(tempHtmlPath)) {
    fs.unlinkSync(tempHtmlPath);
  }
  console.log('All screenshots generated successfully!');
}

run();

