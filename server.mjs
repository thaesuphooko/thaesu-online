/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║  GOD MODE – Top 1 Infinity Premium Ultra Pro Max        ║
 * ║  Next.js 16 Custom Production Server (ESM)              ║
 * ╚══════════════════════════════════════════════════════════╝
 */
import { createServer } from 'http';
import next from 'next';

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || '0.0.0.0';   // Listen on all interfaces
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port, quiet: !dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      // Let Next.js handle everything including proxy headers
      await handle(req, res);
    } catch (err) {
      console.error(`[SERVER ERROR] ${req.method} ${req.url}`, err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });

  // ─── Keep‑Alive & Timeouts (improves performance under reverse proxy) ───
  server.keepAliveTimeout = 61_000;
  server.headersTimeout = 65_000;   // slightly > keepAliveTimeout

  // ─── Graceful Shutdown (PM2 restart / docker stop) ──────────────────
  const gracefulShutdown = (signal) => {
    console.log(`\n🛑 Received ${signal}. Closing HTTP server gracefully...`);
    server.close(async () => {
      console.log('✅ HTTP server closed.');
      // await app.close();   // Next 16 may support this; optional
      process.exit(0);
    });
  };
  process.on('SIGINT', gracefulShutdown);
  process.on('SIGTERM', gracefulShutdown);

  // ─── Prevent unhandled rejections from crashing the process ─────────
  process.on('unhandledRejection', (reason, promise) => {
    console.error('[UNHANDLED REJECTION]', reason);
  });
  process.on('uncaughtException', (err) => {
    console.error('[UNCAUGHT EXCEPTION]', err);
    // Keep the process alive for server errors, PM2 will restart if needed
  });

  server.listen(port, () => {
    console.log(`> 🚀 God Mode Server ready on http://${hostname}:${port} (${dev ? 'development' : 'production'})`);
  });
});
