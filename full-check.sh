#!/data/data/com.termux/files/usr/bin/bash
# Load environment variables from .env.local
set -a
source .env.local
set +a

echo "======================="
echo "1. PM2 Process Check"
pm2 list | grep thaesu
echo "======================="
echo "2. Database Connection"
psql "$NEON_DATABASE_URL" -c "SELECT 1;" 2>/dev/null && echo "OK" || echo "FAIL"
echo "======================="
echo "3. Redis Connection"
node -e "
const { Redis } = require('@upstash/redis');
const redis = new Redis({url: process.env.UPSTASH_REDIS_URL, token: process.env.UPSTASH_REDIS_TOKEN});
redis.ping().then(() => console.log('Redis OK')).catch(e => console.log('Redis FAIL:', e.message));
"
echo "======================="
echo "4. Unit Tests"
npm test -- --reporter=verbose 2>&1 | tail -5
echo "======================="
echo "5. Production Build"
npm run build 2>&1 | tail -10
echo "======================="
echo "6. Broken Links"
blc http://localhost:3000 -ro 2>&1 | head -20
echo "======================="
echo "7. Sitemap Check"
curl -s http://localhost:3000/api/sitemap | grep "<url" | wc -l | xargs echo "Sitemap URLs:"
echo "======================="
echo "All checks completed."
