#!/bin/bash

# ===================================================
# God Mode Scanner – No Server (use existing dev)
# ===================================================

> dev-errors.log
> scan-report.txt
> discovered-routes.txt
> discovered-apis.txt
> db-errors.log

BASE="http://localhost:3000"

echo "🔍 Discovering page routes..."
find app -type f \( -name "page.js" -o -name "page.jsx" -o -name "page.tsx" \) | while read f; do
  dir=$(dirname "$f")
  route=${dir#app}
  route=$(echo "$route" | sed -E 's/\/\([^)]*\)//g')
  [ -z "$route" ] && route="/"
  echo "$route" >> discovered-routes.txt
done
echo -e "/auth/login\n/auth/register\n/dashboard\n/dashboard/vendor-management\n/profile/settings\n/subscriptions" >> discovered-routes.txt
sort -u discovered-routes.txt -o discovered-routes.txt

echo "🔍 Discovering API routes..."
find app/api -type f \( -name "route.js" -o -name "route.jsx" -o -name "route.tsx" \) | while read f; do
  dir=$(dirname "$f")
  api=${dir#app/api}
  [ -z "$api" ] && api="/"
  echo "/api$api" >> discovered-apis.txt
done
sort -u discovered-apis.txt -o discovered-apis.txt

# Fetch IDs
cat << 'EOFJS' > fetch-ids.mjs
import { setTimeout } from 'timers/promises';
import db from './lib/db.js';
async function fetchRow(query) {
  const controller = new AbortController();
  const timeout = setTimeout(10000, null, { signal: controller.signal }).catch(() => {});
  try {
    const result = await Promise.race([ db.query(query), timeout ]);
    if (result && result.rows && result.rows.length) {
      const row = result.rows[0];
      console.log(row.id || row.uid || row.slug || '');
    } else console.log('');
  } catch (e) { console.error('DB ERROR:', e.message); console.log(''); } finally { process.exit(0); }
}
fetchRow(process.argv[2]);
EOFJS

fetch_id() { node fetch-ids.mjs "$1" 2>> db-errors.log; }

echo "🔍 Fetching sample IDs..."
USER_UID=$(fetch_id "SELECT uid FROM users WHERE role = 'user' LIMIT 1")
VENDOR_UID=$(fetch_id "SELECT uid FROM users WHERE vendor_status = 'active' LIMIT 1")
PRODUCT_ID=$(fetch_id "SELECT id FROM products LIMIT 1")
PRODUCT_SLUG=$(fetch_id "SELECT slug FROM products LIMIT 1")
ORDER_ID=$(fetch_id "SELECT id FROM orders LIMIT 1")
SUBSCRIPTION_ID=$(fetch_id "SELECT id FROM user_subscriptions LIMIT 1")

[ -z "$USER_UID" ] && USER_UID="MISSING"
[ -z "$VENDOR_UID" ] && VENDOR_UID="MISSING"
[ -z "$PRODUCT_ID" ] && PRODUCT_ID="MISSING"
[ -z "$PRODUCT_SLUG" ] && PRODUCT_SLUG="missing-slug"
[ -z "$ORDER_ID" ] && ORDER_ID="MISSING"
[ -z "$SUBSCRIPTION_ID" ] && SUBSCRIPTION_ID="MISSING"

echo "   User UID: $USER_UID"
echo "   Vendor UID: $VENDOR_UID"
echo "   Product ID: $PRODUCT_ID (slug: $PRODUCT_SLUG)"
echo "   Order ID: $ORDER_ID"
echo "   Subscription ID: $SUBSCRIPTION_ID"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'

test_route() {
  local method="$1" url="$2" data="$3" desc="$4" extra="$5"
  local tmp_file=$(mktemp) http_code body
  if [ "$method" = "POST" ]; then
    body=$(curl -s -w "\n%{http_code}" -X POST -H "Content-Type: application/json" -d "$data" "$BASE$url" -o "$tmp_file" 2>/dev/null)
  elif [ "$method" = "PUT" ]; then
    body=$(curl -s -w "\n%{http_code}" -X PUT -H "Content-Type: application/json" -d "$data" "$BASE$url" -o "$tmp_file" 2>/dev/null)
  else
    body=$(curl -s -w "\n%{http_code}" "$BASE$url" -o "$tmp_file" 2>/dev/null)
  fi
  http_code=$(echo "$body" | tail -1)
  resp_body=$(cat "$tmp_file"); rm "$tmp_file"

  local icon="✅" color="$GREEN" reason=""
  if [ "$http_code" -ge 400 ]; then icon="❌" color="$RED" reason="HTTP $http_code"
  elif [ "$extra" = "json" ] && echo "$resp_body" | grep -qiE '"error"\s*:'; then icon="⚠️" color="$YELLOW" reason="JSON has error field"
  fi
  echo -e "${color}${icon} [$http_code] $method $url ($desc)${NC}"
  [ -n "$reason" ] && echo -e "       ↳ Reason: $reason"
  echo "$([ -n "$reason" ] && echo 'FAIL' || echo 'OK') | $method $url | $desc | $reason" >> scan-report.txt
}

resolve_url() {
  local u="$1"
  u="${u//\[uid\]/$USER_UID}"
  u="${u//\[vendorUid\]/$VENDOR_UID}"
  u="${u//\[productId\]/$PRODUCT_ID}"
  u="${u//\[slug\]/$PRODUCT_SLUG}"
  u="${u//\[...slug\]/test-slug}"
  u="${u//\[orderId\]/$ORDER_ID}"
  u="${u//\[subscriptionId\]/$SUBSCRIPTION_ID}"
  echo "$u"
}

echo "🌐 Scanning pages and APIs..."
while IFS= read -r route; do
  resolved=$(resolve_url "$route")
  test_route GET "$resolved" "" "Page: $route"
done < discovered-routes.txt

while IFS= read -r api; do
  resolved=$(resolve_url "$api")
  desc="API: $api"
  case "$api" in
    *"/subscribe"*) test_route POST "$resolved" '{"plan_id":"00000000-0000-0000-0000-000000000000"}' "$desc (POST)" "json" ;;
    *"/login"*) test_route POST "$resolved" '{"email":"test@test.com","password":"wrong"}' "$desc (POST)" "json" ;;
    *"/register"*) test_route POST "$resolved" '{"full_name":"Test","email":"test@test.com","phone":"123","password":"123"}' "$desc (POST)" "json" ;;
    *"/cancel"*) test_route PUT "$resolved" '{"subscription_id":"00000000-0000-0000-0000-000000000000"}' "$desc (PUT)" "json" ;;
    *) test_route GET "$resolved" "" "$desc" "json" ;;
  esac
done < discovered-apis.txt

echo ""
echo "========= REPORT ========="
echo "Total: $(wc -l < scan-report.txt)"
echo "Failures:"
grep "FAIL" scan-report.txt | sed 's/^/   /' || echo "   None"
echo ""
echo "DB errors (if any):"
cat db-errors.log 2>/dev/null || echo "   None"

rm fetch-ids.mjs 2>/dev/null
