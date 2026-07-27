#!/bin/bash
set -e

# ===================================================
# God Mode Scanner Plus – Ultra Premium Version
# ===================================================

# Clean environment
echo "🧹 Cleaning previous cache..."
rm -rf .next
> dev-errors.log
> scan-report.txt
> discovered-routes.txt
> discovered-apis.txt

# Start dev server with error logging
echo "🔧 Starting dev server..."
npm run dev > /dev/null 2>> dev-errors.log &
DEV_PID=$!
sleep 12  # Wait for full compilation

# ---------- Route Discovery ----------
echo "🔍 Discovering ALL page routes..."
find app -type f \( -name "page.js" -o -name "page.jsx" -o -name "page.tsx" \) | while read f; do
  dir=$(dirname "$f")
  route=${dir#app}
  # Remove route groups like (market), (dashboard), (auth)
  route=$(echo "$route" | sed -E 's/\/\([^)]*\)//g')
  # Handle root page
  [ -z "$route" ] && route="/"
  echo "$route" >> discovered-routes.txt
done

# Add common static routes
echo -e "/auth/login\n/auth/register\n/dashboard\n/dashboard/vendor-management\n/profile/settings\n/subscriptions" >> discovered-routes.txt
sort -u discovered-routes.txt -o discovered-routes.txt

echo "🔍 Discovering ALL API routes..."
find app/api -type f \( -name "route.js" -o -name "route.jsx" -o -name "route.tsx" \) | while read f; do
  dir=$(dirname "$f")
  api=${dir#app/api}
  [ -z "$api" ] && api="/"
  echo "/api$api" >> discovered-apis.txt
done
sort -u discovered-apis.txt -o discovered-apis.txt

# ---------- Fetch Sample IDs from DB ----------
echo "🔍 Fetching sample IDs from database..."
fetch_id() {
  local query="$1"
  node --input-type=module -e "
    import db from './lib/db.js';
    const { rows } = await db.query(\"$query\");
    if (rows.length) console.log(rows[0].id || rows[0].uid || rows[0].slug || '');
    else console.log('');
    process.exit(0);
  " 2>/dev/null
}

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

echo "   User UID:       $USER_UID"
echo "   Vendor UID:     $VENDOR_UID"
echo "   Product ID:     $PRODUCT_ID (slug: $PRODUCT_SLUG)"
echo "   Order ID:       $ORDER_ID"
echo "   Subscription ID: $SUBSCRIPTION_ID"

BASE="http://localhost:3000"
PASS=0
FAIL=0

# ANSI colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test function
test_route() {
  local method="$1"
  local url="$2"
  local data="$3"
  local desc="$4"
  local extra_check="$5"  # optional: "json" to check for error field in response

  local http_code
  local response_body
  local tmp_file=$(mktemp)

  if [ "$method" = "POST" ]; then
    response_body=$(curl -s -w "\n%{http_code}" -X POST -H "Content-Type: application/json" -d "$data" "$BASE$url" -o "$tmp_file" 2>/dev/null)
  else
    response_body=$(curl -s -w "\n%{http_code}" "$BASE$url" -o "$tmp_file" 2>/dev/null)
  fi

  http_code=$(echo "$response_body" | tail -1)
  body=$(cat "$tmp_file"); rm "$tmp_file"

  local status_icon="✅"
  local status_color="$GREEN"
  local fail_reason=""

  if [ "$http_code" -ge 400 ]; then
    status_icon="❌"
    status_color="$RED"
    fail_reason="HTTP $http_code"
  fi

  # Extra checks
  if [ "$extra_check" = "json" ] && [ "$http_code" -lt 400 ]; then
    # Check if JSON contains "error" field (case insensitive)
    if echo "$body" | grep -qiE '"error"\s*:'; then
      status_icon="⚠️"
      status_color="$YELLOW"
      fail_reason="JSON contains error field"
    fi
  fi

  echo -e "${status_color}${status_icon} [$http_code] $method $url ($desc)${NC}"
  if [ -n "$fail_reason" ]; then
    echo -e "       ↳ Reason: $fail_reason"
    # Log failure
    echo "FAIL | $method $url | $desc | $fail_reason" >> scan-report.txt
  else
    echo "OK   | $method $url | $desc" >> scan-report.txt
  fi
}

# Dynamic param substitution
resolve_url() {
  local url="$1"
  url="${url//\[uid\]/$USER_UID}"
  url="${url//\[vendorUid\]/$VENDOR_UID}"
  url="${url//\[productId\]/$PRODUCT_ID}"
  url="${url//\[slug\]/$PRODUCT_SLUG}"
  url="${url//\[...slug\]/test-slug}"
  url="${url//\[orderId\]/$ORDER_ID}"
  url="${url//\[subscriptionId\]/$SUBSCRIPTION_ID}"
  echo "$url"
}

echo "🌐 Starting comprehensive scan..."
echo ""

# ---- Scan Pages ----
while IFS= read -r route; do
  resolved=$(resolve_url "$route")
  test_route GET "$resolved" "" "Page: $route"
done < discovered-routes.txt

# ---- Scan APIs (with intelligent POST testing) ----
while IFS= read -r api; do
  resolved=$(resolve_url "$api")
  desc="API: $api"
  if [[ "$api" == *"/subscribe"* ]]; then
    test_route POST "$resolved" '{"plan_id":"00000000-0000-0000-0000-000000000000"}' "$desc (POST)" "json"
  elif [[ "$api" == *"/login"* ]]; then
    test_route POST "$resolved" '{"email":"test@test.com","password":"wrong"}' "$desc (POST)" "json"
  elif [[ "$api" == *"/register"* ]]; then
    test_route POST "$resolved" '{"full_name":"Test","email":"test@test.com","phone":"123","password":"123"}' "$desc (POST)" "json"
  elif [[ "$api" == *"/cancel"* ]]; then
    test_route PUT "$resolved" '{"subscription_id":"00000000-0000-0000-0000-000000000000"}' "$desc (PUT)" "json"
  else
    test_route GET "$resolved" "" "$desc" "json"
  fi
done < discovered-apis.txt

# ---- Summarize ----
echo ""
echo "========= FINAL REPORT ========="
echo "Total tests: $(( $(wc -l < scan-report.txt) ))"
echo "Failures:"
grep "FAIL" scan-report.txt | sed 's/^/   /' || echo "   None!"
echo ""
echo "========= SERVER ERROR LOG (top 30) ========="
grep -iE "error|warn|fail|unhandled" dev-errors.log | head -30 || echo "   No server errors found."
echo ""
echo "Full logs: dev-errors.log and scan-report.txt"

# Cleanup
kill $DEV_PID 2>/dev/null
wait $DEV_PID 2>/dev/null
