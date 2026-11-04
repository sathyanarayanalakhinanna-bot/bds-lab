require('dotenv').config();
const app = require('./app');
const { getDbConnection, closeDbConnection } = require('./db/connection');

const PORT = parseInt(process.env.PORT, 10) || 3000;

async function startServer() {
  try {
    // Initialize DB connection and schema
    await getDbConnection();
    console.log('Connected to SQLite database successfully.');

    const server = app.listen(PORT, () => {
      console.log(`Server is running at http://localhost:${PORT}`);
    });

    // Handle EADDRINUSE error gracefully (part of Lab 3 debugging exercise)
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`[Error EADDRINUSE]: Port ${PORT} is already in use.`);
        console.error(`Tip: You can specify a different port via the PORT environment variable (e.g., PORT=3001 npm start) or terminate the process holding port ${PORT}.`);
      } else {
        console.error('Server failed to start:', err);
      }
      process.exit(1);
    });

    // Graceful shutdown
    const shutdown = async () => {
      console.log('\nShutting down server gracefully...');
      server.close(async () => {
        await closeDbConnection();
        console.log('Database connection closed. Goodbye!');
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    return server;
  } catch (error) {
    console.error('Failed to initialize server:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { startServer };

