#!/bin/bash
# ╔══════════════════════════════════════════════╗
# ║  PREMIUM SEQUENTIAL SCANNER (Termux Safe)  ║
# ╚══════════════════════════════════════════════╝

BASE_URL="${BASE_URL:-http://localhost:3000}"
TIMEOUT=10
REPORT="seq-premium-report.txt"
TEMP_DIR=$(mktemp -d)

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

> "$REPORT"

# ─── Safe .env loading (DB + Telegram) ───
if [ -f .env.local ]; then
  export $(grep -E '^(DATABASE_URL|TELEGRAM_BOT_TOKEN|TELEGRAM_CHAT_ID|ADMIN_EMAIL|ADMIN_PASSWORD)=' .env.local | sed 's/"//g' | xargs) 2>/dev/null
fi

# ─── Fetch sample IDs via psql (if DB available) ───
if [ -n "$DATABASE_URL" ]; then
  echo -e "${CYAN}🔍 Fetching sample IDs from database...${NC}"
  UID_USER=$(psql "$DATABASE_URL" -tAc "SELECT uid FROM users WHERE role='user' LIMIT 1" 2>/dev/null || echo "")
  UID_VENDOR=$(psql "$DATABASE_URL" -tAc "SELECT uid FROM users WHERE vendor_status='active' LIMIT 1" 2>/dev/null || echo "")
  PID_PRODUCT=$(psql "$DATABASE_URL" -tAc "SELECT id FROM products LIMIT 1" 2>/dev/null || echo "")
  SLUG_PRODUCT=$(psql "$DATABASE_URL" -tAc "SELECT slug FROM products LIMIT 1" 2>/dev/null || echo "test-product")
  OID_ORDER=$(psql "$DATABASE_URL" -tAc "SELECT id FROM orders LIMIT 1" 2>/dev/null || echo "")
  SID_SUB=$(psql "$DATABASE_URL" -tAc "SELECT id FROM user_subscriptions LIMIT 1" 2>/dev/null || echo "")
  PLAN_ID=$(psql "$DATABASE_URL" -tAc "SELECT id FROM subscription_plans LIMIT 1" 2>/dev/null || echo "")
else
  UID_USER="testuser"; UID_VENDOR="testvendor"; PID_PRODUCT=""; SLUG_PRODUCT="test-product"
fi

# ─── Resolve URL (replace placeholders) ───
resolve() {
  local u="$1"
  u="${u//:uid/$UID_USER}"
  u="${u//:vendorUid/$UID_VENDOR}"
  u="${u//:productId/$PID_PRODUCT}"
  u="${u//:slug/$SLUG_PRODUCT}"
  u="${u//:orderId/$OID_ORDER}"
  u="${u//:subId/$SID_SUB}"
  u="${u//:planId/$PLAN_ID}"
  echo "$u"
}

# ─── Test a single URL ───
test_url() {
  local url="$1" label="$2" extra_header="$3"
  local start=$(date +%s%N)
  local code=$(curl -s -w "%{http_code}" --max-time $TIMEOUT $extra_header -o /dev/null "$BASE_URL$url" 2>/dev/null)
  local dur=$(( ($(date +%s%N) - start) / 1000000 ))

  local icon="✅" color="$GREEN" fail=""
  if [ "$code" = "000" ]; then icon="💀" color="$RED" fail="TIMEOUT"
  elif [ "$code" -ge 500 ]; then icon="💀" color="$RED" fail="CRITICAL"
  elif [ "$code" -ge 400 ] && [ "$code" -ne 404 ]; then icon="❌" color="$RED" fail="ERROR"
  elif [ "$code" = "404" ]; then icon="❓" color="$YELLOW" fail="MISSING"
  fi
  [ "$dur" -gt 3000 ] && fail="${fail:+$fail,}SLOW" && icon="⏱️" && color="$YELLOW"

  echo -e "${color}${icon} [$code] ${label} (${dur}ms)${NC}"
  echo "[$code] ${label} | ${url} | ${dur}ms | ${fail}" >> "$REPORT"
}

# ─── Obtain auth token if admin credentials exist ───
AUTH_HEADER=""
if [ -n "$ADMIN_EMAIL" ] && [ -n "$ADMIN_PASSWORD" ]; then
  echo -e "${CYAN}🔑 Fetching auth token...${NC}"
  TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" \
    | jq -r '.token // .access_token // empty')
  if [ -n "$TOKEN" ]; then
    AUTH_HEADER="-H \"Authorization: Bearer $TOKEN\""
    echo -e "${GREEN}✅ Auth token obtained.${NC}"
  else
    echo -e "${YELLOW}⚠️  Could not obtain token.${NC}"
  fi
fi

# ─── Pages to scan ───
PAGES=(
  "/" "Home"
  "/auth/login" "Login"
  "/auth/register" "Register"
  "/dashboard" "Dashboard"
  "/subscriptions" "Subscription Plans"
  "/products" "Products"
  "/checkout" "Checkout"
  "/orders" "Orders"
  "/affiliate" "Affiliate"
  "/chat" "Chat"
  "/cart" "Cart"
  "/feed" "Feed"
  "/games" "Games"
  "/profile?uid=$UID_USER" "Profile"
  "/profile/settings" "Settings"
)

echo -e "${CYAN}🌐 Scanning Pages...${NC}"
for ((i=0; i<${#PAGES[@]}; i+=2)); do
  test_url "${PAGES[$i]}" "${PAGES[$i+1]}"
done

# ─── API Routes to scan (public & protected) ───
APIS=(
  # Public APIs
  "/api/music-config" "Music Config"
  "/api/subscription/plans" "Subscription Plans API"
  "/api/products" "Products API"
  "/api/user/uid/:uid/profile" "User Profile API"
  "/api/user/uid/:uid/posts" "User Posts API"
  # Protected APIs (use token if available)
  "/api/wishlist" "Wishlist API"
  "/api/orders" "Orders API"
  "/api/admin/reports" "Admin Reports"
  "/api/admin/coupons" "Admin Coupons"
)

echo -e "${CYAN}🌐 Scanning APIs...${NC}"
for ((i=0; i<${#APIS[@]}; i+=2)); do
  url=$(resolve "${APIS[$i]}")
  # Decide if auth header needed (basic: all admin/* should use token)
  extra=""
  if [[ "$url" == /api/admin/* ]] && [ -n "$AUTH_HEADER" ]; then
    extra="$AUTH_HEADER"
  fi
  test_url "$url" "${APIS[$i+1]}" "$extra"
done

# ─── Summary ───
total=$(wc -l < "$REPORT")
fails=$(grep -cE "\[500\]|\[000\]|\[4[0-9][0-9]\]" "$REPORT" || echo 0)
echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "Total tests: ${total}  ❌ Failures: ${fails}"
echo -e "Report saved to: ${REPORT}"

# ─── Telegram (optional) ───
if [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ]; then
  summary=$(tail -5 "$REPORT" | tr '\n' ' ')
  curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    -d chat_id="${TELEGRAM_CHAT_ID}" \
    -d text="⚡ Sequential Scan Complete%0ATotal: ${total} | Fails: ${fails}%0A%0A${summary}" \
    -d parse_mode="HTML" >/dev/null 2>&1
  echo -e "${GREEN}✅ Telegram notification sent.${NC}"
fi

rm -rf "$TEMP_DIR"
