#!/bin/bash
set -o pipefail
shopt -s extglob

BASE_URL="${BASE_URL:-http://localhost:3000}"
MAX_WAIT=60
REPORT_FILE="infinity-report.txt"
ERROR_LOG="infinity-errors.log"
ROUTES_FILE="routes.txt"
APIS_FILE="apis.txt"
DB_IDS_FILE="db-ids.json"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

> "$REPORT_FILE"
> "$ERROR_LOG"
> "$ROUTES_FILE"
> "$APIS_FILE"
echo "{}" > "$DB_IDS_FILE"

print_header() {
  echo -e "${BOLD}${PURPLE}"
  echo "╔══════════════════════════════════════════════════════════╗"
  echo "║        INFINITY GOD MODE SCANNER                        ║"
  echo "╚══════════════════════════════════════════════════════════╝"
  echo -e "${NC}"
}

if ! command -v jq &> /dev/null; then
  echo -e "${YELLOW}⚠️  'jq' not found. Installing...${NC}"
  pkg install jq -y || { echo "❌ jq required."; exit 1; }
fi

# DB ID fetcher
cat << 'ENDNODE' > fetch-db-ids.mjs
import { setTimeout } from 'node:timers/promises';
import db from './lib/db.js';
const QUERIES = [
  { key: "userUid", query: "SELECT uid FROM users WHERE role='user' LIMIT 1" },
  { key: "vendorUid", query: "SELECT uid FROM users WHERE vendor_status='active' LIMIT 1" },
  { key: "productId", query: "SELECT id FROM products LIMIT 1" },
  { key: "productSlug", query: "SELECT slug FROM products LIMIT 1" },
  { key: "orderId", query: "SELECT id FROM orders LIMIT 1" },
  { key: "subscriptionId", query: "SELECT id FROM user_subscriptions LIMIT 1" },
  { key: "adminUid", query: "SELECT uid FROM users WHERE role='admin' LIMIT 1" },
  { key: "planId", query: "SELECT id FROM subscription_plans LIMIT 1" }
];
const results = {};
for (let q of QUERIES) {
  let value = '';
  try {
    const res = await Promise.race([db.query(q.query), setTimeout(9000, 'timeout')]);
    if (res !== 'timeout' && res.rows?.length) {
      value = res.rows[0][Object.keys(res.rows[0])[0]] || '';
    }
  } catch (e) {}
  results[q.key] = String(value);
}
console.log(JSON.stringify(results));
process.exit(0);
ENDNODE

check_server() {
  echo -ne "${BLUE}⏳ Waiting for server at $BASE_URL${NC} "
  for ((i=1; i<=$MAX_WAIT; i++)); do
    if curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/" 2>/dev/null | grep -q "200"; then
      echo -e "\n${GREEN}✅ Server ready after ${i}s.${NC}"
      return 0
    fi
    echo -n "."
    sleep 1
  done
  echo -e "\n${RED}❌ Server did not start within ${MAX_WAIT}s.${NC}"
  return 1
}

discover_routes() {
  find app -type f \( -name "page.js" -o -name "page.jsx" -o -name "page.tsx" \) | while read f; do
    dir=$(dirname "$f")
    route=${dir#app}
    route=$(echo "$route" | sed -E 's/\/\([^)]*\)//g')
    [ -z "$route" ] && route="/"
    echo "$route" >> "$ROUTES_FILE"
  done
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
  
  find app/api -type f \( -name "route.js" -o -name "route.jsx" -o -name "route.tsx" \) | while read f; do
    dir=$(dirname "$f")
    api=${dir#app/api}
    [ -z "$api" ] && api="/"
    echo "/api$api" >> "$APIS_FILE"
  done
  sort -u "$APIS_FILE" -o "$APIS_FILE"
}

test_route() {
  local method="$1" url="$2" data="$3" desc="$4"
  local tmp_file=$(mktemp) http_code body start end dur
  start=$(date +%s%N)
  if [ "$method" = "POST" ]; then
    body=$(curl -s -w "\n%{http_code}" -X POST -H "Content-Type: application/json" -d "$data" "$BASE_URL$url" -o "$tmp_file" 2>/dev/null)
  elif [ "$method" = "PUT" ]; then
    body=$(curl -s -w "\n%{http_code}" -X PUT -H "Content-Type: application/json" -d "$data" "$BASE_URL$url" -o "$tmp_file" 2>/dev/null)
  else
    body=$(curl -s -w "\n%{http_code}" "$BASE_URL$url" -o "$tmp_file" 2>/dev/null)
  fi
  end=$(date +%s%N)
  dur=$(( (end - start) / 1000000 ))
  http_code=$(echo "$body" | tail -1)
  resp_body=$(cat "$tmp_file"); rm "$tmp_file"
  
  local icon="✅" color="$GREEN" fail=""
  if [ "$http_code" -ge 500 ]; then
    icon="💀" color="$RED" fail="CRITICAL"
  elif [ "$http_code" -ge 400 ]; then
    icon="❌" color="$RED" fail="ERROR"
  elif [ "$http_code" -ge 300 ]; then
    icon="↪️" color="$YELLOW"
  elif echo "$resp_body" | grep -qiE '"(error|message)"\s*:\s*"[^"]+"' 2>/dev/null; then
    icon="⚠️" color="$YELLOW" fail="WARNING"
  fi
  [ "$dur" -gt 3000 ] && icon="⏱️" color="$YELLOW" fail="${fail:+$fail,}SLOW"
  
  echo -e "${color}${icon} [$http_code] ${BOLD}$method${NC} $url ${color}($desc)${NC}"
  [ -n "$fail" ] && echo -e "       ${color}↳ $fail${NC}"
  echo "[$fail] $method $url | $desc | $http_code | ${dur}ms" >> "$REPORT_FILE"
}

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

main() {
  print_header

  if curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/" 2>/dev/null | grep -q "200"; then
    echo -e "${GREEN}✅ Server detected.${NC}"
  else
    echo -e "${YELLOW}No server. Start it first (npm run dev). Exiting.${NC}"
    exit 1
  fi

  echo -e "${CYAN}🔍 Fetching DB IDs...${NC}"
  node fetch-db-ids.mjs > "$DB_IDS_FILE" 2>> "$ERROR_LOG"
  if ! jq -e . "$DB_IDS_FILE" >/dev/null 2>&1; then
    echo -e "${RED}❌ DB ID fetch failed.${NC}"
    exit 1
  fi
  while IFS="=" read -r key value; do
    export "IDS_$key"="$value"
  done < <(jq -r 'to_entries|map("\(.key)=\(.value)")|.[]' "$DB_IDS_FILE")

  discover_routes

  echo -e "${CYAN}🌐 Scanning pages...${NC}"
  while IFS= read -r route; do
    test_route GET "$(resolve_url "$route")" "" "Page: $route"
  done < "$ROUTES_FILE"

  echo -e "${CYAN}🌐 Scanning APIs...${NC}"
  while IFS= read -r api; do
    resolved=$(resolve_url "$api")
    desc="API: $api"
    case "$api" in
      */subscribe) test_route POST "$resolved" '{"plan_id":"'${IDS_planId:-000}'"}' "$desc (POST)" ;;
      */login) test_route POST "$resolved" '{"email":"test@test.com","password":"wrong"}' "$desc (POST)" ;;
      */register) test_route POST "$resolved" '{"full_name":"Test","email":"test@test.com","phone":"123","password":"123"}' "$desc (POST)" ;;
      */cancel) test_route PUT "$resolved" '{"subscription_id":"'${IDS_subscriptionId:-000}'"}' "$desc (PUT)" ;;
      *) test_route GET "$resolved" "" "$desc" ;;
    esac
  done < "$APIS_FILE"

  echo ""
  echo -e "${PURPLE}══════════════════════════════════════════════${NC}"
  echo -e "${BOLD}${PURPLE}  SCAN COMPLETE${NC}"
  echo -e "${PURPLE}══════════════════════════════════════════════${NC}"
  total=$(wc -l < "$REPORT_FILE")
  crit=$(grep -c "CRITICAL" "$REPORT_FILE" || echo 0)
  errs=$(grep -c "ERROR" "$REPORT_FILE" || echo 0)
  warns=$(grep -c "WARNING" "$REPORT_FILE" || echo 0)
  echo -e "Total: ${BOLD}$total${NC}  ${RED}💀$crit${NC}  ${RED}❌$errs${NC}  ${YELLOW}⚠️$warns${NC}"
  echo "Full report: $REPORT_FILE"
  echo "Error log: $ERROR_LOG"
}

main "$@"
