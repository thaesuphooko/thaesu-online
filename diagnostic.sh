#!/data/data/com.termux/files/usr/bin/bash

echo "=========================================="
echo "   THAESU ONLINE - FULL DIAGNOSTIC TEST"
echo "=========================================="
echo ""

# 1. Environment Check
echo "1. Environment Variables Check"
source .env.local 2>/dev/null
if [ -n "$NEON_DATABASE_URL" ]; then
  echo "   ✅ NEON_DATABASE_URL is set"
else
  echo "   ❌ NEON_DATABASE_URL is missing"
fi
if [ -n "$UPSTASH_REDIS_URL" ]; then
  echo "   ✅ UPSTASH_REDIS_URL is set"
else
  echo "   ❌ UPSTASH_REDIS_URL is missing"
fi
if [ -n "$ADMIN_HASH" ]; then
  echo "   ✅ ADMIN_HASH is set"
else
  echo "   ❌ ADMIN_HASH is missing"
fi
echo ""

# 2. PM2 Process Check
echo "2. PM2 Process Status"
pm2 list 2>/dev/null | grep -E "thaesu|telegram-bot|auto-cancel" || echo "   ❌ PM2 not running or processes missing"
echo ""

# 3. Database Connection Check
echo "3. Database Connection"
psql "$NEON_DATABASE_URL" -c "SELECT 1;" 2>/dev/null && echo "   ✅ Database connected" || echo "   ❌ Database connection failed"
echo ""

# 4. Redis Connection Check
echo "4. Redis Connection"
node -e "
const { Redis } = require('@upstash/redis');
const redis = new Redis({url: process.env.UPSTASH_REDIS_URL, token: process.env.UPSTASH_REDIS_TOKEN});
redis.ping().then(() => {console.log('   ✅ Redis connected'); process.exit(0);}).catch(e => {console.log('   ❌ Redis error:', e.message); process.exit(1);});
" 2>/dev/null
echo ""

# 5. Build Test
echo "5. Production Build Test"
rm -rf .next
npm run build 2>&1 | tail -5
if [ -f .next/BUILD_ID ]; then
  echo "   ✅ Build successful"
else
  echo "   ❌ Build failed"
fi
echo ""

# 6. Page Availability Check
echo "6. Page Availability (curl test)"
# Start server temporarily if not running
pm2 start npm --name thaesu-test -- start 2>/dev/null
sleep 5

declare -a pages=(
  "http://localhost:3000"
  "http://localhost:3000/products"
  "http://localhost:3000/cart"
  "http://localhost:3000/checkout"
  "http://localhost:3000/order-tracking"
  "http://localhost:3000/dashboard"
)

for page in "${pages[@]}"; do
  status=$(curl -s -o /dev/null -w "%{http_code}" "$page")
  if [ "$status" = "200" ] || [ "$status" = "302" ] || [ "$status" = "304" ]; then
    echo "   ✅ $page ($status)"
  else
    echo "   ❌ $page ($status)"
  fi
done
pm2 stop thaesu-test 2>/dev/null
pm2 delete thaesu-test 2>/dev/null
echo ""

# 7. API Endpoints Check
echo "7. API Endpoints Check"
pm2 start npm --name thaesu-test -- start 2>/dev/null
sleep 5

declare -a apis=(
  "http://localhost:3000/api/products?page=1"
  "http://localhost:3000/api/admin/config"
  "http://localhost:3000/api/sitemap"
  "http://localhost:3000/api/robots"
)

for api in "${apis[@]}"; do
  status=$(curl -s -o /dev/null -w "%{http_code}" "$api")
  if [ "$status" = "200" ]; then
    echo "   ✅ $api ($status)"
  else
    echo "   ❌ $api ($status)"
  fi
done
pm2 stop thaesu-test 2>/dev/null
pm2 delete thaesu-test 2>/dev/null
echo ""

# 8. Database Tables Check
echo "8. Database Tables"
psql "$NEON_DATABASE_URL" -c "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;" 2>/dev/null | grep -v "table_name\|------\|(.*row)" | while read table; do
  echo "   📦 $table"
done
echo ""

# 9. PM2 Logs (last 5 error lines)
echo "9. Recent PM2 Error Logs"
pm2 logs thaesu --lines 5 --nostream 2>/dev/null | grep -i "error\|fail" || echo "   ✅ No recent errors"
echo ""

# 10. File Structure Check
echo "10. Critical Files Check"
declare -a files=(
  "app/layout.js"
  "app/not-found.js"
  "app/dashboard/layout.js"
  "app/dashboard/page.js"
  "components/organisms/ProductCard.jsx"
  "lib/crawler.js"
  "lib/scraper.js"
  "lib/db.js"
  "ecosystem.config.cjs"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "   ✅ $file exists"
  else
    echo "   ❌ $file MISSING"
  fi
done
echo ""

# Restart PM2 if it was running
pm2 restart thaesu 2>/dev/null

echo "=========================================="
echo "   DIAGNOSTIC COMPLETE"
echo "=========================================="
