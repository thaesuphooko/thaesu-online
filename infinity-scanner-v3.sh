#!/bin/bash
set -o pipefail
shopt -s extglob

BASE_URL="${BASE_URL:-http://localhost:3000}"
MAX_WAIT=60
MAX_JOBS=5
REPORT_FILE="infinity-report.txt"
ERROR_LOG="infinity-errors.log"
DB_FILE="db-ids.json"
ROUTES_FILE="routes.txt"
APIS_FILE="apis.txt"
TEMP_DIR=$(mktemp -d)

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'
PURPLE='\033[0;35m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

> "$REPORT_FILE"
> "$ERROR_LOG"

# ─── DB ID Fetcher (Node.js) – လက်ရှိ folder ထဲမှာ ရေးမယ် ───
cat << 'ENDNODE' > fetch-db-ids.mjs
import { setTimeout } from 'node:timers/promises';
import db from './lib/db.js';
const QUERIES = [
  ["userUid", "SELECT uid FROM users WHERE role='user' LIMIT 1"],
  ["vendorUid", "SELECT uid FROM users WHERE vendor_status='active' LIMIT 1"],
  ["adminUid", "SELECT uid FROM users WHERE role='admin' LIMIT 1"],
  ["productId", "SELECT id FROM products LIMIT 1"],
  ["productSlug", "SELECT slug FROM products LIMIT 1"],
  ["orderId", "SELECT id FROM orders LIMIT 1"],
  ["subscriptionId", "SELECT id FROM user_subscriptions LIMIT 1"],
  ["planId", "SELECT id FROM subscription_plans LIMIT 1"],
  ["postId", "SELECT id FROM posts LIMIT 1"],
  ["commentId", "SELECT id FROM comments LIMIT 1"],
  ["storyId", "SELECT id FROM stories LIMIT 1"]
];
const results = {};
for (let [key, q] of QUERIES) {
  try {
    const res = await Promise.race([db.query(q), setTimeout(8000, 'TO')]);
    if (res !== 'TO' && res.rows?.length) {
      results[key] = res.rows[0][Object.keys(res.rows[0])[0]] || '';
    } else results[key] = '';
  } catch { results[key] = ''; }
}
console.log(JSON.stringify(results));
process.exit(0);
ENDNODE

# ─── Wait for server ───
wait_server() {
  for ((i=1;i<=$MAX_WAIT;i++)); do
    curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/" 2>/dev/null | grep -q 200 && echo -e "${GREEN}✅ Server ready${NC}" && return 0
    sleep 1
  done
  echo -e "${RED}❌ Server not ready${NC}"; return 1
}

# ─── Discover Routes ───
discover() {
  find app -type f \( -name "page.*" -o -name "route.*" \) | while read f; do
    dir=$(dirname "$f")
    route=${dir#app}
    route=$(echo "$route" | sed -E 's/\/\([^)]*\)//g')
    [ -z "$route" ] && route="/"
    if [[ "$f" == *"/api/"* ]]; then
      api=${dir#app/api}; [ -z "$api" ] && api="/"
      echo "/api$api" >> "$APIS_FILE"
    else
      echo "$route" >> "$ROUTES_FILE"
    fi
  done
  # extra static
  echo -e "/auth/login\n/auth/register\n/dashboard\n/subscriptions\n/products\n/checkout\n/orders\n/admin/subscriptions" >> "$ROUTES_FILE"
  sort -u "$ROUTES_FILE" -o "$ROUTES_FILE"
  sort -u "$APIS_FILE" -o "$APIS_FILE"
}

# ─── Resolve URL ───
resolve_url() {
  local u="$1"
  u="${u//\[uid\]/$U}"
  u="${u//\[vendorUid\]/$V}"
  u="${u//\[productId\]/$PID}"
  u="${u//\[slug\]/$SLUG}"
  u="${u//\[...slug\]/test-slug}"
  u="${u//\[orderId\]/$OID}"
  u="${u//\[subscriptionId\]/$SID}"
  u="${u//\[postId\]/$POSTID}"
  u="${u//\[commentId\]/$COMMENTID}"
  u="${u//\[storyId\]/$STORYID}"
  echo "$u"
}

# ─── Test One URL (single call) ───
test_one() {
  local method="$1" url="$2" data="$3" desc="$4"
  local tmp=$(mktemp) code dur
  local start=$(date +%s%N)
  if [ "$method" = "POST" ]; then
    code=$(curl -s -w "%{http_code}" -X POST -H "Content-Type: application/json" -d "$data" "$BASE_URL$url" -o "$tmp" 2>/dev/null)
  elif [ "$method" = "PUT" ]; then
    code=$(curl -s -w "%{http_code}" -X PUT -H "Content-Type: application/json" -d "$data" "$BASE_URL$url" -o "$tmp" 2>/dev/null)
  elif [ "$method" = "DELETE" ]; then
    code=$(curl -s -w "%{http_code}" -X DELETE "$BASE_URL$url" -o "$tmp" 2>/dev/null)
  else
    code=$(curl -s -w "%{http_code}" "$BASE_URL$url" -o "$tmp" 2>/dev/null)
  fi
  dur=$(( ($(date +%s%N) - start) / 1000000 ))
  local body=$(cat "$tmp"); rm "$tmp"
  # Analyze
  local fail=""
  if [ "$code" -ge 500 ]; then fail="CRITICAL"
  elif [ "$code" -ge 400 ]; then fail="ERROR"
  elif echo "$body" | grep -qiE "(internal server error|application error|exception|traceback)"; then fail="EXCEPTION"
  elif echo "$body" | grep -qiE '"(error|message)"\s*:\s*"[^"]+"'; then fail="WARNING"
  fi
  [ "$dur" -gt 3000 ] && fail="${fail:+$fail,}SLOW"
  # Color
  local icon="✅" color="$GREEN"
  [[ "$fail" == *CRITICAL* || "$fail" == *EXCEPTION* ]] && icon="💀" color="$RED"
  [[ "$fail" == *ERROR* ]] && icon="❌" color="$RED"
  [[ "$fail" == *WARNING* ]] && icon="⚠️" color="$YELLOW"
  [[ "$fail" == *SLOW* ]] && icon="⏱️" color="$YELLOW"
  # Output
  echo -e "${color}${icon} [$code] ${BOLD}$method${NC} $url ${color}($desc)${NC}"
  [ -n "$fail" ] && echo -e "       ${color}↳ $fail${NC}"
  # Write report
  echo "[$fail] $method $url | $desc | $code | ${dur}ms" >> "$REPORT_FILE"
}

# ─── Test with multiple methods ───
test_route_multi() {
  local route="$1" type="$2"   # type: PAGE or API
  if [ "$type" = "PAGE" ]; then
    test_one GET "$route" "" "Page"
  else
    test_one GET "$route" "" "GET"
    local post_data='{"test":"true"}'
    if [[ "$route" == *"/subscribe" ]]; then post_data='{"plan_id":"'${PLANID:-000}'"}'; fi
    if [[ "$route" == *"/login" ]]; then post_data='{"email":"x@x.com","password":"x"}'; fi
    test_one POST "$route" "$post_data" "POST"
    test_one PUT "$route" '{"test":"true"}' "PUT"
    test_one DELETE "$route" "" "DELETE"
  fi
}

# ─── Job pool control ───
job_pool() {
  while [ "$(jobs -r | wc -l)" -ge $MAX_JOBS ]; do
    wait -n
  done
}

# ─── Main ───
main() {
  echo -e "${BOLD}${PURPLE}╔════════════════════════════════════════╗${NC}"
  echo -e "${BOLD}${PURPLE}║   INFINITY GOD MODE SCANNER v3.1      ║${NC}"
  echo -e "${BOLD}${PURPLE}╚════════════════════════════════════════╝${NC}"
  wait_server || exit 1

  echo -e "${CYAN}🔍 Fetching DB IDs...${NC}"
  node fetch-db-ids.mjs > "$DB_FILE" 2>> "$ERROR_LOG"
  if ! jq -e . "$DB_FILE" &>/dev/null; then
    echo -e "${RED}❌ DB fetch failed. Check fetch-db-ids.mjs or database connection.${NC}"
    exit 1
  fi
  eval $(jq -r 'to_entries | .[] | "export \(.key)=\"\(.value)\""' "$DB_FILE")
  # Short aliases
  U="$userUid"; V="$vendorUid"; PID="$productId"; SLUG="$productSlug"
  OID="$orderId"; SID="$subscriptionId"; PLANID="$planId"
  POSTID="$postId"; COMMENTID="$commentId"; STORYID="$storyId"

  discover

  echo -e "${CYAN}🌐 Scanning PAGES (max $MAX_JOBS parallel)...${NC}"
  while IFS= read -r route; do
    resolved=$(resolve_url "$route")
    test_route_multi "$resolved" "PAGE" &
    job_pool
  done < "$ROUTES_FILE"

  echo -e "${CYAN}🌐 Scanning APIs (max $MAX_JOBS parallel)...${NC}"
  while IFS= read -r api; do
    resolved=$(resolve_url "$api")
    test_route_multi "$resolved" "API" &
    job_pool
  done < "$APIS_FILE"

  wait   # all jobs done

  # Summary
  echo ""
  echo -e "${PURPLE}══════════════════════════════════════════${NC}"
  echo -e "${BOLD}${PURPLE}  SCAN COMPLETE${NC}"
  echo -e "${PURPLE}══════════════════════════════════════════${NC}"
  total=$(wc -l < "$REPORT_FILE")
  crit=$(grep -c "CRITICAL" "$REPORT_FILE" || echo 0)
  exc=$(grep -c "EXCEPTION" "$REPORT_FILE" || echo 0)
  errs=$(grep -c "ERROR" "$REPORT_FILE" || echo 0)
  warns=$(grep -c "WARNING" "$REPORT_FILE" || echo 0)
  slows=$(grep -c "SLOW" "$REPORT_FILE" || echo 0)
  echo -e "Total: ${BOLD}$total${NC}  ${RED}💀$crit${NC}  ${RED}❌$errs${NC}  ${RED}🛑$exc${NC}  ${YELLOW}⚠️$warns${NC}  ${YELLOW}⏱️$slows${NC}"
  echo "Full report: $REPORT_FILE"
  echo "Error log: $ERROR_LOG"
  rm -rf "$TEMP_DIR" fetch-db-ids.mjs
}

main "$@"
