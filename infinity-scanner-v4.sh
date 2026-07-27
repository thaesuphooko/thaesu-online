#!/bin/bash
set -o pipefail
shopt -s extglob

BASE_URL="${BASE_URL:-http://localhost:3000}"
MAX_WAIT=60
MAX_JOBS=10
TIMEOUT_SEC=5
REPORT_JSON="infinity-report.json"
REPORT_TXT="infinity-report.txt"
ERROR_LOG="infinity-errors.log"
ROUTES_FILE="routes.txt"
APIS_FILE="apis.txt"
TEMP_DIR=$(mktemp -d)

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; PURPLE='\033[0;35m'; CYAN='\033[0;36m'; NC='\033[0m'

> "$REPORT_TXT"
> "$ERROR_LOG"
echo "[]" > "$REPORT_JSON"

START_TIME=$(date +%s)

# ─── DB Fetch (အမြန်နည်း) ───
cat << 'ENDNODE' > fetch-db-ids.mjs
import { setTimeout } from 'node:timers/promises';
import db from './lib/db.js';
const Q = [
  ["userUid","SELECT uid FROM users WHERE role='user' LIMIT 1"],
  ["vendorUid","SELECT uid FROM users WHERE vendor_status='active' LIMIT 1"],
  ["adminUid","SELECT uid FROM users WHERE role='admin' LIMIT 1"],
  ["productId","SELECT id FROM products LIMIT 1"],
  ["productSlug","SELECT slug FROM products LIMIT 1"],
  ["orderId","SELECT id FROM orders LIMIT 1"],
  ["subscriptionId","SELECT id FROM user_subscriptions LIMIT 1"],
  ["planId","SELECT id FROM subscription_plans LIMIT 1"],
  ["postId","SELECT id FROM posts LIMIT 1"],
  ["commentId","SELECT id FROM comments LIMIT 1"],
  ["storyId","SELECT id FROM stories LIMIT 1"]
];
const R = {};
for (let [k,q] of Q) {
  try {
    let res = await Promise.race([db.query(q), setTimeout(5000,'TO')]);
    R[k] = (res!=='TO' && res.rows?.[0]) ? (Object.values(res.rows[0])[0]||'') : '';
  } catch { R[k] = ''; }
}
console.log(JSON.stringify(R));
process.exit(0);
ENDNODE

wait_server() {
  for ((i=1;i<=MAX_WAIT;i++)); do
    curl -s -o /dev/null "$BASE_URL/" 2>/dev/null && echo -e "${GREEN}✅ Server ready${NC}" && return 0
    sleep 1
  done
  echo -e "${RED}❌ Server not ready${NC}"; return 1
}

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
  echo -e "/auth/login\n/auth/register\n/dashboard\n/subscriptions\n/products\n/checkout\n/orders\n/admin/subscriptions" >> "$ROUTES_FILE"
  sort -u "$ROUTES_FILE" -o "$ROUTES_FILE"
  sort -u "$APIS_FILE" -o "$APIS_FILE"
}

resolve_url() {
  local u="$1"
  u="${u//\[uid\]/$U}"; u="${u//\[vendorUid\]/$V}"; u="${u//\[productId\]/$PID}"
  u="${u//\[slug\]/$SLUG}"; u="${u//\[...slug\]/test-slug}"; u="${u//\[orderId\]/$OID}"
  u="${u//\[subscriptionId\]/$SID}"; u="${u//\[postId\]/$POSTID}"
  u="${u//\[commentId\]/$COMMENTID}"; u="${u//\[storyId\]/$STORYID}"
  echo "$u"
}

test_one() {
  local method="$1" url="$2" data="$3" desc="$4"
  local tmp=$(mktemp) code dur body
  local start=$(date +%s%N)
  if [ "$method" = "POST" ]; then
    code=$(curl -s -w "%{http_code}" --max-time $TIMEOUT_SEC -X POST -H "Content-Type: application/json" -d "$data" "$BASE_URL$url" -o "$tmp" 2>/dev/null)
  elif [ "$method" = "PUT" ]; then
    code=$(curl -s -w "%{http_code}" --max-time $TIMEOUT_SEC -X PUT -H "Content-Type: application/json" -d "$data" "$BASE_URL$url" -o "$tmp" 2>/dev/null)
  elif [ "$method" = "DELETE" ]; then
    code=$(curl -s -w "%{http_code}" --max-time $TIMEOUT_SEC -X DELETE "$BASE_URL$url" -o "$tmp" 2>/dev/null)
  else
    code=$(curl -s -w "%{http_code}" --max-time $TIMEOUT_SEC "$BASE_URL$url" -o "$tmp" 2>/dev/null)
  fi
  dur=$(( ($(date +%s%N) - start) / 1000000 ))
  body=$(cat "$tmp" 2>/dev/null); rm -f "$tmp"

  local fail="" icon="✅" color="$GREEN"
  if [ "$code" = "000" ] || [ -z "$code" ]; then
    fail="TIMEOUT"; icon="💀"; color="$RED"; code="000"
  elif [ "$code" -ge 500 ]; then fail="CRITICAL"; icon="💀"; color="$RED"
  elif [ "$code" -ge 400 ] && [ "$code" -ne 404 ]; then fail="ERROR"; icon="❌"; color="$RED"
  elif [ "$code" = "404" ]; then fail="MISSING"; icon="❓"; color="$YELLOW"
  elif echo "$body" | grep -qiE '"(error|message)"\s*:\s*"[^"]+"'; then fail="WARNING"; icon="⚠️"; color="$YELLOW"
  fi
  [ "$dur" -gt 3000 ] && fail="${fail:+$fail,}SLOW" && icon="⏱️" && color="$YELLOW"

  # Append JSON
  local json_entry=$(jq -n --arg method "$method" --arg url "$url" --arg desc "$desc" \
    --arg code "$code" --arg dur "$dur" --arg fail "$fail" \
    '{method: $method, url: $url, desc: $desc, code: $code, duration_ms: $dur, status: $fail}')
  {
    flock -x 200
    local tmp_json=$(mktemp)
    jq ". + [${json_entry}]" "$REPORT_JSON" > "$tmp_json" && mv "$tmp_json" "$REPORT_JSON"
  } 200>"$TEMP_DIR/lock"

  # Terminal output
  echo -e "${color}${icon} [$code] ${method} $url (${desc})${NC}"
  [ -n "$fail" ] && echo -e "       ${color}↳ $fail${NC}"
  echo "[$fail] $method $url | $desc | $code | ${dur}ms" >> "$REPORT_TXT"
}

test_route_multi() {
  local route="$1" type="$2"
  if [ "$type" = "PAGE" ]; then
    test_one GET "$route" "" "Page"
  else
    test_one GET "$route" "" "GET"
    local pd='{"test":"true"}'
    [[ "$route" == *"/subscribe" ]] && pd='{"plan_id":"'${PLANID:-000}'"}'
    [[ "$route" == *"/login" ]] && pd='{"email":"x@x.com","password":"x"}'
    test_one POST "$route" "$pd" "POST"
    test_one PUT "$route" '{"test":"true"}' "PUT"
    test_one DELETE "$route" "" "DELETE"
  fi
}

job_pool() {
  while [ "$(jobs -r | wc -l)" -ge $MAX_JOBS ]; do
    wait -n
  done
}

# ─── Main ───
main() {
  echo -e "${PURPLE}⚡ INFINITY GOD MODE SCANNER v4 (Ultra Fast)${NC}"
  wait_server || exit 1

  echo -e "${CYAN}🔍 Fetching DB IDs...${NC}"
  node fetch-db-ids.mjs > db-ids.json 2>> "$ERROR_LOG"
  eval $(jq -r 'to_entries | .[] | "export \(.key)=\"\(.value)\""' db-ids.json)
  U="$userUid"; V="$vendorUid"; PID="$productId"; SLUG="$productSlug"
  OID="$orderId"; SID="$subscriptionId"; PLANID="$planId"
  POSTID="$postId"; COMMENTID="$commentId"; STORYID="$storyId"

  discover
  local total_pages=$(wc -l < "$ROUTES_FILE")
  local total_apis=$(wc -l < "$APIS_FILE")
  echo -e "${GREEN}📄 Found ${total_pages} pages + ${total_apis} API routes${NC}"

  echo -e "${CYAN}🌐 Scanning PAGES (max ${MAX_JOBS} parallel)...${NC}"
  while IFS= read -r route; do
    test_route_multi "$(resolve_url "$route")" "PAGE" &
    job_pool
  done < "$ROUTES_FILE"

  echo -e "${CYAN}🌐 Scanning APIs (max ${MAX_JOBS} parallel)...${NC}"
  while IFS= read -r api; do
    test_route_multi "$(resolve_url "$api")" "API" &
    job_pool
  done < "$APIS_FILE"

  wait
  END_TIME=$(date +%s)
  local elapsed=$((END_TIME - START_TIME))

  # Summary
  echo ""
  echo -e "${PURPLE}══════════════════════════════════════════${NC}"
  echo -e "${PURPLE}  SCAN COMPLETE (${elapsed}s)${NC}"
  echo -e "${PURPLE}══════════════════════════════════════════${NC}"
  local total=$(grep -c "|" "$REPORT_TXT" || echo 0)
  local crit=$(grep -c "CRITICAL" "$REPORT_TXT" || echo 0)
  local errs=$(grep -c "ERROR" "$REPORT_TXT" || echo 0)
  local miss=$(grep -c "MISSING" "$REPORT_TXT" || echo 0)
  local warns=$(grep -c "WARNING" "$REPORT_TXT" || echo 0)
  local slow=$(grep -c "SLOW" "$REPORT_TXT" || echo 0)
  echo -e "Total: ${total}  💀${crit}  ❌${errs}  ❓${miss}  ⚠️${warns}  ⏱️${slow}"
  echo "Time: ${elapsed} seconds"
  echo "JSON: $REPORT_JSON | TXT: $REPORT_TXT"
  rm -rf "$TEMP_DIR" fetch-db-ids.mjs
}

main "$@"
