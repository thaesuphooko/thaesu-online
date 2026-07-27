module.exports = {
  apps: [
    // ─── Main Next.js Application ──────────────────────
    {
      name: 'thaesu',
      script: 'server.mjs',                // God Mode ESM Server
      instances: 1,                        // Termux တွင် 1 instance သာထားပါ (CPU core ရှိရင် 'max' သုံးပါ)
      exec_mode: 'fork',

      // ─── Resource Limits ──────────────────
      max_memory_restart: '800M',         // 800 MB ထက်ကျော်ရင် Auto Restart
      kill_timeout: 5000,                 // Graceful shutdown အတွက် 5s စောင့်ပေးမည်

      // ─── Environment Variables ────────────
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '0.0.0.0',
        DATABASE_URL: 'postgresql://neondb_owner:npg_HaN3Y5tcopWv@ep-damp-block-ahynqyj4-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=verify-full',
        JWT_SECRET: 'thaesu-secret-key-2024-prod-v2',
      },

      // ─── Logging & Rotation ──────────────
      error_file: './logs/thaesu-error.log',
      out_file: './logs/thaesu-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      max_size: '10M',                     // Log file 10 MB ကျော်ရင် Rotation
      retain: 5,                           // Old log 5 ဖိုင်ထားမည်

      // ─── Watch & Auto‑Restart ─────────────
      watch: false,                        // Production တွင် watch ပိတ်ထားပါ
      ignore_watch: ['node_modules', 'logs', '.next', 'cron-reports'],
      autorestart: true,
      max_restarts: 10,                    // 10 ကြိမ်ထက် ပိုကျရင် ရပ်ပါ
      restart_delay: 3000,                 // Crash ပြီးရင် 3s နေမှ ပြန်စပါ
    },

    // ─── Cron Engage (Auto‑Engage) ────────────────────
    {
      name: 'cron-engage',
      script: 'cron-engage.js',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '300M',
      kill_timeout: 3000,
      env: {
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://neondb_owner:npg_HaN3Y5tcopWv@ep-damp-block-ahynqyj4-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=verify-full',
        JWT_SECRET: 'thaesu-secret-key-2024-prod-v2',
      },
      error_file: './logs/cron-engage-error.log',
      out_file: './logs/cron-engage-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      max_size: '5M',
      retain: 3,
      watch: false,
      autorestart: true,
      max_restarts: 5,
      restart_delay: 5000,
    },

    // ─── Cron Order Status (Order Cleanup) ─────────────
    {
      name: 'cron-order-status',
      script: 'cron-order-status.js',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '300M',
      kill_timeout: 3000,
      env: {
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://neondb_owner:npg_HaN3Y5tcopWv@ep-damp-block-ahynqyj4-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=verify-full',
        JWT_SECRET: 'thaesu-secret-key-2024-prod-v2',
      },
      error_file: './logs/cron-order-error.log',
      out_file: './logs/cron-order-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      max_size: '5M',
      retain: 3,
      watch: false,
      autorestart: true,
      max_restarts: 5,
      restart_delay: 5000,
    },
  ],
};
