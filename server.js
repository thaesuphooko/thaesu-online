/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║  GOD MODE – Top 1 Infinity Premium Ultra Pro Max        ║
 * ║  Next.js 16 Custom Production Server (CommonJS)         ║
 * ╚══════════════════════════════════════════════════════════╝
 */
const { createServer } = require('http');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port, quiet: !dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      await handle(req, res);
    } catch (err) {
      console.error(`[SERVER ERROR] ${req.method} ${req.url}`, err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });

  server.keepAliveTimeout = 61_000;
  server.headersTimeout = 65_000;

  const gracefulShutdown = (signal) => {
    console.log(`\n🛑 Received ${signal}. Closing...`);
    server.close(() => {
      console.log('✅ Closed.');
      process.exit(0);
    });
  };
  process.on('SIGINT', gracefulShutdown);
  process.on('SIGTERM', gracefulShutdown);

  process.on('unhandledRejection', (reason) => { console.error('[UNHANDLED REJECTION]', reason); });
  process.on('uncaughtException', (err) => { console.error('[UNCAUGHT EXCEPTION]', err); });

  server.listen(port, () => {
    console.log(`> 🚀 God Mode Server ready on http://${hostname}:${port}`);
  });
});
