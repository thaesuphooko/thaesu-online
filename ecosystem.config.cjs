module.exports = {
  apps: [
    {
      name: 'thaesu',
      script: 'npm',
      args: 'start',
      cwd: '/data/data/com.termux/files/home/thaesu-online',
      env_file: '.env.local',   // 🔐 Secret များအားလုံး ဤဖိုင်မှ load လုပ်မည်
      env: {
        NODE_ENV: 'production',
        ADMIN_HASH: 'super-secret-admin-step',
        NEXT_PUBLIC_ADMIN_HASH: 'super-secret-admin-step',
        // UPSTASH, DATABASE_URL, DEEPSEEK တို့ကို .env.local တွင် သိမ်းပါ
      },
      restart_delay: 5000,
      max_restarts: 20,
    },
    {
      name: 'telegram-bot',
      script: '/data/data/com.termux/files/home/thaesu-online/run-telegram-bot.sh',
      interpreter: 'bash',
      cwd: '/data/data/com.termux/files/home/thaesu-online',
      restart_delay: 5000,
      max_restarts: 20,
    },
    {
      name: 'auto-cancel',
      script: 'curl',
      args: 'http://localhost:3000/api/cron/auto-cancel',
      cron_restart: '*/5 * * * *',
      autorestart: false,
    },
    {
      name: 'daily-report',
      script: 'curl',
      args: 'http://localhost:3000/api/admin/daily-report',
      cron_restart: '0 0 * * *',
      autorestart: false,
    },
    {
      name: 'health-monitor',
      script: 'node',
      args: 'lib/monitor.js',
      cwd: '/data/data/com.termux/files/home/thaesu-online',
      cron_restart: '*/5 * * * *',
      autorestart: false,
    },
    {
      name: 'auto-heal',
      script: 'node',
      args: 'lib/autoHealBot.js',
      cwd: '/data/data/com.termux/files/home/thaesu-online',
      cron_restart: '*/5 * * * *',
      autorestart: false,
    },
  ],
};
