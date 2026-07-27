#!/bin/bash
# ╔══════════════════════════════════════════════════════════╗
# ║  INFINITY PREMIUM ULTRA GOD MODE SCANNER v3.0          ║
# ║  Next.js Full-Stack Health & Error Diagnostic Suite    ║
# ╚══════════════════════════════════════════════════════════╝

set -o pipefail
shopt -s extglob

# ---------- Configuration ----------
BASE_URL="http://localhost:3000"
MAX_SERVER_WAIT=60
DB_TIMEOUT_SEC=8
REPORT_FILE="infinity-report.txt"
ERROR_LOG="infinity-errors.log"
ROUTES_FILE="routes.txt"
APIS_FILE="apis.txt"
DB_IDS_FILE="db-ids.json"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# ---------- Cleanup ----------
> "$REPORT_FILE"
> "$ERROR_LOG"
> "$ROUTES_FILE"
> "$APIS_FILE"
> "$DB_IDS_FILE"
echo "{}" > "$DB_IDS_FILE"

# ---------- Helper Functions ----------
print_header() {
  echo -e "${BOLD}${PURPLE}"
  echo "╔══════════════════════════════════════════════════════════╗"
  echo "║        INFINITY GOD MODE SCANNER                        ║"
  echo "╚══════════════════════════════════════════════════════════╝"
  echo -e "${NC}"
}

check_server() {
  for i in $(seq 1 $MAX_SERVER_WAIT); do
    if curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/" 2>/dev/null | grep -q 200; then
      return 0
    fi
    sleep 1
  done
  return 1
}

# ---------- Database ID Fetcher (Node.js) ----------
cat << 'ENDNODE' > fetch-db-ids.mjs
import { setTimeout } from 'node:timers/promises';
import db from './lib/db.js';

const QUERIES = [
  { key: "userUid", query: "SELECT uid FROM users WHERE role='user' LIMIT 1", fallback: "SELECT uid FROM users LIMIT 1" },
  { key: "vendorUid", query: "SELECT uid FROM users WHERE vendor_status='active' LIMIT 1", fallback: "SELECT uid FROM users WHERE role='vendor' LIMIT 1" },
  { key: "productId", query: "SELECT id FROM products LIMIT 1", fallback: "SELECT id FROM products ORDER BY created_at DESC LIMIT 1" },
  { key: "productSlug", query: "SELECT slug FROM products LIMIT 1", fallback: "SELECT id::text AS slug FROM products LIMIT 1" },
  { key: "orderId", query: "SELECT id FROM orders LIMIT 1", fallback: "SELECT id FROM orders ORDER BY created_at DESC LIMIT 1" },
  { key: "subscriptionId", query: "SELECT id FROM user_subscriptions LIMIT 1", fallback: "SELECT id FROM user_subscriptions ORDER BY created_at DESC LIMIT 1" },
  { key: "adminUid", query: "SELECT uid FROM users WHERE role='admin' LIMIT 1", fallback: "SELECT uid FROM users LIMIT 1" },
  { key: "planId", query: "SELECT id FROM subscription_plans LIMIT 1", fallback: "SELECT id::text FROM subscription_plans LIMIT 1" }
];

const results = {};
for (let q of QUERIES) {
  let value = '';
  try {
    const res = await Promise.race([
      db.query(q.query),
      setTimeout(9000, 'timeout')
    ]);
    if (res !== 'timeout' && res.rows && res.rows.length) {
      value = res.rows[0][Object.keys(res.rows[0])[0]] || '';
    }
    if (!value && q.fallback) {
      const fres = await Promise.race([
        db.query(q.fallback),
        setTimeout(9000, 'timeout')
      ]);
      if (fres !== 'timeout' && fres.rows && fres.rows.length) {
        value = fres.rows[0][Object.keys(fres.rows[0])[0]] || '';
      }
    }
  } catch (e) {
    // ignore
  }
  results[q.key] = value ? String(value) : '';
}
console.log(JSON.stringify(results));
process.exit(0);
ENDNODE

# ---------- Discover Routes ----------
discover_routes() {
  echo -e "${CYAN}🔍 Discovering ALL routes...${NC}"
  
  # Pages
  find app -type f \( -name "page.js" -o -name "page.jsx" -o -name "page.tsx" \) | while read f; do
    dir=$(dirname "$f")
    route=${dir#app}
    route=$(echo "$route" | sed -E 's/\/\([^)]*\)//g')
    [ -z "$route" ] && route="/"
    echo "$route" >> "$ROUTES_FILE"
  done
  
  # Extra static routes
  cat << ENDSTATIC >> "$ROUTES_FILE"
/auth/login
/auth/register
/dashboard
/dashboard/vendor-management
/profile/settings
/subscriptions
/products
/checkout
/orders
/admin/subscriptions
ENDSTATIC
  
  sort -u "$ROUTES_FILE" -o "$ROUTES_FILE"
  
  # APIs
  find app/api -type f \( -name "route.js" -o -name "route.jsx" -o -name "route.tsx" \) | while read f; do
    dir=$(dirname "$f")
    api=${dir#app/api}
    [ -z "$api" ] && api="/"
    echo "/api$api" >> "$APIS_FILE"
  done
  sort -u "$APIS_FILE" -o "$APIS_FILE"
}

# ---------- Test a route ----------
test_route() {
  local method="$1" url="$2" data="$3" desc="$4" extra_checks="$5"
  local tmp_file=$(mktemp) http_code body time_start time_end duration
  
  time_start=$(date +%s%N)
  if [ "$method" = "POST" ]; then
    body=$(curl -s -w "\n%{http_code}" -X POST -H "Content-Type: application/json" -d "$data" "$BASE_URL$url" -o "$tmp_file" 2>/dev/null)
  elif [ "$method" = "PUT" ]; then
    body=$(curl -s -w "\n%{http_code}" -X PUT -H "Content-Type: application/json" -d "$data" "$BASE_URL$url" -o "$tmp_file" 2>/dev/null)
  else
    body=$(curl -s -w "\n%{http_code}" "$BASE_URL$url" -o "$tmp_file" 2>/dev/null)
  fi
  time_end=$(date +%s%N)
  duration=$(( (time_end - time_start) / 1000000 ))  # ms
  
  http_code=$(echo "$body" | tail -1)
  resp_body=$(cat "$tmp_file"); rm "$tmp_file"
  
  # Determine status
  local icon="✅" color="$GREEN" reason="" fail_type=""
  if [ "$http_code" -ge 500 ]; then
    icon="💀" color="$RED" reason="Server Error ($http_code)" fail_type="CRITICAL"
  elif [ "$http_code" -ge 400 ]; then
    icon="❌" color="$RED" reason="Client Error ($http_code)" fail_type="ERROR"
  elif [ "$http_code" -ge 300 ]; then
    icon="↪️" color="$YELLOW" reason="Redirect ($http_code)"
  else
    # Check JSON error field
    if echo "$resp_body" | grep -qiE '"(error|message)"\s*:\s*"[^"]+"' 2>/dev/null; then
      icon="⚠️" color="$YELLOW" reason="JSON contains error" fail_type="WARNING"
    fi
  fi
  
  # Check for slow response
  if [ "$duration" -gt 3000 ]; then
    reason="${reason:+$reason, }Slow (${duration}ms)"
    if [ "$fail_type" != "CRITICAL" ]; then
      icon="⏱️" color="$YELLOW" fail_type="SLOW"
    fi
  fi
  
  echo -e "${color}${icon} [$http_code] ${BOLD}$method${NC} $url ${color}($desc)${NC}"
  [ -n "$reason" ] && echo -e "       ${color}↳ $reason${NC}"
  
  # Write report
  local report_line="[$fail_type] $method $url | $desc | $http_code | ${duration}ms"
  [ -n "$reason" ] && report_line+=" | $reason"
  echo "$report_line" >> "$REPORT_FILE"
}

# ---------- Resolve dynamic params ----------
resolve_url() {
  local u="$1"
  u="${u//\[uid\]/$IDS_userUid}"
  u="${u//\[vendorUid\]/$IDS_vendorUid}"
  u="${u//\[productId\]/$IDS_productId}"
  u="${u//\[slug\]/$IDS_productSlug}"
  u="${u//\[...slug\]/test-slug}"
  u="${u//\[orderId\]/$IDS_orderId}"
  u="${u//\[subscriptionId\]/$IDS_subscriptionId}"
  echo "$u"
}

# ---------- Main ----------
main() {
  print_header
  
  # 1. Ensure dev server is running
  echo -ne "${BLUE}⏳ Checking server...${NC}"
  if check_server; then
    echo -e "${GREEN} Server is ready.${NC}"
  else
    echo -e "${YELLOW} No server found. Starting dev server...${NC}"
    npm run dev > /dev/null 2>&1 &
    DEV_PID=$!
    sleep 5
    if ! check_server; then
      echo -e "${RED}❌ Server failed to start. Please start manually and re-run.${NC}"
      exit 1
    fi
  fi
  
  # 2. Fetch DB IDs
  echo -e "${CYAN}🔍 Fetching database IDs...${NC}"
  node fetch-db-ids.mjs > "$DB_IDS_FILE" 2>> "$ERROR_LOG"
  if [ ! -s "$DB_IDS_FILE" ] || ! jq -e . >/dev/null 2>&1 < "$DB_IDS_FILE"; then
    echo -e "${RED}❌ Failed to fetch database IDs. Check db-errors.log${NC}"
    cat "$ERROR_LOG"
    exit 1
  fi
  # Parse IDs
  while IFS="=" read -r key value; do
    export "IDS_$key"="$value"
  done < <(jq -r 'to_entries|map("\(.key)=\(.value)")|.[]' "$DB_IDS_FILE")
  
  echo -e "${GREEN}   ✅ IDs loaded.${NC}"
  
  # 3. Discover routes
  discover_routes
  
  # 4. Scan pages
  echo -e "${CYAN}🌐 Scanning PAGES...${NC}"
  while IFS= read -r route; do
    resolved=$(resolve_url "$route")
    test_route GET "$resolved" "" "Page: $route"
  done < "$ROUTES_FILE"
  
  # 5. Scan APIs
  echo -e "${CYAN}🌐 Scanning APIs...${NC}"
  while IFS= read -r api; do
    resolved=$(resolve_url "$api")
    desc="API: $api"
    case "$api" in
      */subscribe) test_route POST "$resolved" '{"plan_id":"'${IDS_planId:-000}'"}' "$desc (POST)" ;;
      */login) test_route POST "$resolved" '{"email":"test@test.com","password":"wrong"}' "$desc (POST)" ;;
      */register) test_route POST "$resolved" '{"full_name":"Test","email":"test@test.com","phone":"123","password":"123"}' "$desc (POST)" ;;
      */cancel) test_route PUT "$resolved" '{"subscription_id":"'${IDS_subscriptionId:-000}'"}' "$desc (PUT)" ;;
      */follow) test_route POST "$resolved" '{}' "$desc (POST)" ;;
      *) test_route GET "$resolved" "" "$desc" ;;
    esac
  done < "$APIS_FILE"
  
  # 6. Summary
  echo ""
  echo -e "${PURPLE}══════════════════════════════════════════════${NC}"
  echo -e "${BOLD}${PURPLE}  INFINITY GOD MODE SCAN COMPLETE${NC}"
  echo -e "${PURPLE}══════════════════════════════════════════════${NC}"
  
  total=$(wc -l < "$REPORT_FILE")
  critical=$(grep -c "\[CRITICAL\]" "$REPORT_FILE" || echo 0)
  errors=$(grep -c "\[ERROR\]" "$REPORT_FILE" || echo 0)
  warnings=$(grep -c "\[WARNING\]" "$REPORT_FILE" || echo 0)
  slows=$(grep -c "\[SLOW\]" "$REPORT_FILE" || echo 0)
  
  echo -e "Total tests: ${BOLD}$total${NC}"
  echo -e "${RED}💀 Critical: $critical${NC}"
  echo -e "${RED}❌ Errors:   $errors${NC}"
  echo -e "${YELLOW}⚠️ Warnings: $warnings${NC}"
  echo -e "${YELLOW}⏱️ Slow:     $slows${NC}"
  
  if [ "$critical" -gt 0 ] || [ "$errors" -gt 0 ]; then
    echo -e "\n${RED}${BOLD}🚨 IMMEDIATE ATTENTION REQUIRED!${NC}"
    echo -e "Failed endpoints:"
    grep -E "\[CRITICAL\]|\[ERROR\]" "$REPORT_FILE" | sed 's/^/  /'
  else
    echo -e "\n${GREEN}${BOLD}✨ All critical checks passed!${NC}"
  fi
  
  echo -e "\nFull report: ${BOLD}$REPORT_FILE${NC}"
  echo -e "Error log:   ${BOLD}$ERROR_LOG${NC}"
  
  # Cleanup if we started server
  if [ -n "$DEV_PID" ]; then
    kill $DEV_PID 2>/dev/null
    wait $DEV_PID 2>/dev/null
  fi
}

main "$@"
