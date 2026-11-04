# Lab 3: Debugging Exercise Report
**Course:** Backend Development Fundamentals · Year II Term II · Aurora  
**Faculty:** Joel Prashanth D  
**Student:** Sathyanarayana  

---

## Overview
During the debugging exercise, a broken version of the project containing four common backend development errors was analyzed, debugged, and resolved. Below is the systematic breakdown of each bug, its error symptom, the underlying root cause, and the exact resolution.

---

### Bug 1: Port Conflict (`EADDRINUSE`)
#### 1. Symptom & Error Output
```text
Error: listen EADDRINUSE: address already in use :::3000
    at Server.setupListenHandle [as _listen2] (node:net:1874:16)
    at listenInCluster (node:net:1922:12)
    at Server.listen (node:net:2020:7)
    at ...
Emitted 'error' event on Server instance at:
    at emitErrorNT (node:net:1899:8)
```
#### 2. Root Cause
The server code had a hardcoded port (`const PORT = 3000;`) without allowing environment overrides (`process.env.PORT`) and had no error handler attached to the `server` instance. When another process was already running on port 3000 (such as another dev server instance), the Node.js process crashed with an unhandled `EADDRINUSE` exception.

#### 3. Fix Applied
1. Allow dynamic port assignment through `process.env.PORT` with a fallback:
   ```javascript
   const PORT = parseInt(process.env.PORT, 10) || 3000;
   ```
2. Attach an explicit `'error'` listener to the HTTP server instance to handle `EADDRINUSE` gracefully, informing the developer how to resolve the conflict (e.g. specifying an alternate port or freeing the occupied port):
   ```javascript
   server.on('error', (err) => {
     if (err.code === 'EADDRINUSE') {
       console.error(`[Error EADDRINUSE]: Port ${PORT} is already in use.`);
       console.error(`Specify a different port via PORT=3001 npm start or kill the process using port ${PORT}.`);
     }
     process.exit(1);
   });
   ```

---

### Bug 2: Wrong Import Path (`MODULE_NOT_FOUND`)
#### 1. Symptom & Error Output
```text
node:internal/modules/cjs/loader:1252
  throw err;
  ^
Error: Cannot find module './database/connection'
Require stack:
- C:\Users\sathy\bds-lab\src\server.js
    at Module._resolveFilename (node:internal/modules/cjs/loader:1249:15)
    at Module._load (node:internal/modules/cjs/loader:1075:27)
    at TracingChannel.traceSync (node:diagnostics_channel:315:14)
```
#### 2. Root Cause
The broken code attempted to require `'./database/connection'`, but the folder name was `'db'` (relative path `./db/connection`), causing Node's CommonJS module resolver to fail and terminate execution during bootstrap.

#### 3. Fix Applied
Correct the relative require path:
```javascript
// Before (Broken):
const { getDbConnection } = require('./database/connection');

// After (Fixed):
const { getDbConnection } = require('./db/connection');
```

---

### Bug 3: Table-Name Typo (`no such table`)
#### 1. Symptom & Error Output
```text
[Error: SQLITE_ERROR: no such table: book] {
  errno: 1,
  code: 'SQLITE_ERROR'
}
```
#### 2. Root Cause
The database schema defines the table as the plural noun `books` (`CREATE TABLE IF NOT EXISTS books (...)`). However, the query in the route handler had a typo using the singular noun `book` (`SELECT * FROM book`). In SQLite, referencing a non-existent table throws `SQLITE_ERROR: no such table: <name>`.

#### 3. Fix Applied
Update the SQL query to reference the correct table name `books`:
```javascript
// Before (Broken):
const books = await db.all('SELECT * FROM book');

// After (Fixed):
const books = await db.all('SELECT * FROM books');
```

---

### Bug 4: Missing `await` on Asynchronous Database Calls
#### 1. Symptom & Error Output
```text
TypeError: db.all is not a function
    at router.get (C:\Users\sathy\bds-lab\src\routes\books.js:15:28)
-- OR --
Response sends Promise { <pending> } as JSON, resulting in an empty object {} in the HTTP response.
```
#### 2. Root Cause
Database initialization (`getDbConnection()`) and query operations (`db.get()`, `db.all()`, `db.run()`) return Promises. Omitting the `await` keyword causes the variable to hold an unresolved `Promise` rather than the database client or query result. Consequently, calling methods on the unresolved Promise throws a TypeError, or returning it sends an empty object to the client.

#### 3. Fix Applied
Add `await` before all asynchronous database connection and query operations:
```javascript
// Before (Broken):
const db = getDbConnection();
const books = db.all('SELECT * FROM books');

// After (Fixed):
const db = await getDbConnection();
const books = await db.all('SELECT * FROM books');
```

---

## Summary Matrix of Fixes

| Bug # | Error Category | Root Cause | Resolution |
|---|---|---|---|
| 1 | `EADDRINUSE` | Port 3000 hardcoded & occupied | Dynamic `PORT` env var + explicit server `'error'` listener |
| 2 | Module Not Found | Incorrect relative path `./database/connection` | Changed to valid path `./db/connection` |
| 3 | SQLite Error | Typo `book` instead of `books` in SQL statement | Corrected table name to `books` across queries |
| 4 | Asynchronous Bug | Missing `await` on Promise-returning DB calls | Prepended `await` to `getDbConnection()`, `db.all()`, `db.get()`, `db.run()` |
