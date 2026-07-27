#!/bin/bash
set -o pipefail
shopt -s extglob

# ╔══════════════════════════════════════════════════════════╗
# ║  INFINITY GOD MODE SCANNER v5.3 (Auto-Port, Safe)     ║
# ╚══════════════════════════════════════════════════════════╝

# ─── Auto-detect server port if BASE_URL not set ───
if [ -z "$BASE_URL" ]; then
  # Try port 3000 first, then 3001, 3002
  for port in 3000 3001 3002; do
    if curl -s -o /dev/null "http://localhost:$port/" 2>/dev/null; then
      BASE_URL="http://localhost:$port"
      break
    fi
  done
fi
BASE_URL="${BASE_URL:-http://localhost:3000}"
MAX_WAIT=60
MAX_JOBS=10          # Reduced to avoid Termux overload
TIMEOUT_SEC=8        # Longer timeout for Termux/Neon
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

# ─── Safe .env loading ───
load_env_safe() {
  if [ -f .env.local ]; then
    while IFS='=' read -r key value; do
      [[ "$key" =~ ^# ]] && continue
      [ -z "$key" ] && continue
      value=$(echo "$value" | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")
      case "$key" in
        TELEGRAM_BOT_TOKEN|TELEGRAM_CHAT_ID|ADMIN_EMAIL|ADMIN_PASSWORD)
          export "$key"="$value"
          ;;
      esac
    done < .env.local
  fi
}
load_env_safe

# ─── Auth token ───
AUTH_TOKEN=""
if [ -n "$ADMIN_EMAIL" ] && [ -n "$ADMIN_PASSWORD" ]; then
  echo -e "${CYAN}🔑 Obtaining auth token...${NC}"
  AUTH_TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" \
    | jq -r '.token // .access_token // empty')
  [ -n "$AUTH_TOKEN" ] && echo -e "${GREEN}✅ Auth token obtained.${NC}" || echo -e "${YELLOW}⚠️  No token (check credentials).${NC}"
fi

# ─── DB ID Fetcher ───
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
  ["storyId","SELECT id FROM stories LIMIT 1"],
  ["couponId","SELECT id FROM coupons LIMIT 1"],
  ["botId","SELECT id FROM bots LIMIT 1"],
  ["crawlerJobId","SELECT id FROM crawler_jobs LIMIT 1"],
  ["convId","SELECT id FROM conversations LIMIT 1"]
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

# ─── Telegram ───
send_telegram() {
  local text="$1"
  if [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ]; then
    curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
      -d chat_id="${TELEGRAM_CHAT_ID}" \
      -d text="${text}" \
      -d parse_mode="HTML" >/dev/null 2>&1
  fi
}

# ─── Wait for server ───
wait_server() {
  for ((i=1;i<=MAX_WAIT;i++)); do
    curl -s -o /dev/null "$BASE_URL/" 2>/dev/null && echo -e "${GREEN}✅ Server ready at $BASE_URL${NC}" && return 0
    sleep 1
  done
  echo -e "${RED}❌ Server not ready${NC}"; return 1
}

# ─── Route discovery ───
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
  # Safe replacement with fallback for empty IDs → SKIP
  for pair in "uid:$U" "vendorUid:$V" "productId:$PID" "slug:$SLUG" "orderId:$OID" "subscriptionId:$SID" "postId:$POSTID" "commentId:$COMMENTID" "storyId:$STORYID" "couponId:$COUPONID" "botId:$BOTID" "jobId:$CRAWLERJOBID" "convId:$CONVID" "id:$COUPONID"; do
    placeholder="${pair%%:*}"
    value="${pair#*:}"
    if [[ "$u" == *"[$placeholder]"* ]] || [[ "$u" == *"[...$placeholder]"* ]]; then
      if [ -z "$value" ]; then
        echo "SKIP"; return
      fi
      u=$(echo "$u" | sed "s|\[$placeholder\]|$value|g" | sed "s|\[...$placeholder\]|$value|g")
    fi
  done
  # Replace [...slug] safely
  if [[ "$u" == *"[...slug]"* ]]; then
    u=$(echo "$u" | sed "s|\[...slug\]|test-slug|g")
  fi
  echo "$u"
}

# ─── Test one URL ───
test_one() {
  local method="$1" url="$2" data="$3" desc="$4"
  [ "$url" = "SKIP" ] && return

  local tmp=$(mktemp) code="" dur body auth_header="" use_auth=false
  if [[ "$desc" == API* ]] && [ -n "$AUTH_TOKEN" ]; then
    use_auth=true
    auth_header="-H \"Authorization: Bearer ${AUTH_TOKEN}\""
  fi

  local start=$(date +%s%N)
  if [ "$method" = "POST" ]; then
    if $use_auth; then
      code=$(eval curl -s -w "%{http_code}" --max-time $TIMEOUT_SEC -X POST -H "Content-Type: application/json" $auth_header -d "'$data'" "$BASE_URL$url" -o "$tmp" 2>/dev/null)
    else
      code=$(curl -s -w "%{http_code}" --max-time $TIMEOUT_SEC -X POST -H "Content-Type: application/json" -d "$data" "$BASE_URL$url" -o "$tmp" 2>/dev/null)
    fi
  elif [ "$method" = "PUT" ]; then
    if $use_auth; then
      code=$(eval curl -s -w "%{http_code}" --max-time $TIMEOUT_SEC -X PUT -H "Content-Type: application/json" $auth_header -d "'$data'" "$BASE_URL$url" -o "$tmp" 2>/dev/null)
    else
      code=$(curl -s -w "%{http_code}" --max-time $TIMEOUT_SEC -X PUT -H "Content-Type: application/json" -d "$data" "$BASE_URL$url" -o "$tmp" 2>/dev/null)
    fi
  elif [ "$method" = "DELETE" ]; then
    if $use_auth; then
      code=$(eval curl -s -w "%{http_code}" --max-time $TIMEOUT_SEC -X DELETE $auth_header "$BASE_URL$url" -o "$tmp" 2>/dev/null)
    else
      code=$(curl -s -w "%{http_code}" --max-time $TIMEOUT_SEC -X DELETE "$BASE_URL$url" -o "$tmp" 2>/dev/null)
    fi
  else
    if $use_auth; then
      code=$(eval curl -s -w "%{http_code}" --max-time $TIMEOUT_SEC $auth_header "$BASE_URL$url" -o "$tmp" 2>/dev/null)
    else
      code=$(curl -s -w "%{http_code}" --max-time $TIMEOUT_SEC "$BASE_URL$url" -o "$tmp" 2>/dev/null)
    fi
  fi
  dur=$(( ($(date +%s%N) - start) / 1000000 ))
  body=$(cat "$tmp" 2>/dev/null); rm -f "$tmp"

  # Safe numeric checks
  local fail="" icon="✅" color="$GREEN"
  if [ -z "$code" ] || [ "$code" = "000" ]; then
    fail="TIMEOUT"; icon="💀"; color="$RED"; code="000"
  elif [[ "$code" =~ ^[0-9]+$ ]]; then
    if [ "$code" -ge 500 ]; then fail="CRITICAL"; icon="💀"; color="$RED"
    elif [ "$code" = "401" ] || [ "$code" = "403" ]; then
      if $use_auth; then fail="AUTH-REQUIRED (got $code even with token)"; icon="🔒"; color="$YELLOW"
      else fail="AUTH-REQUIRED"; icon="🔒"; color="$YELLOW"
      fi
    elif [ "$code" -ge 400 ] && [ "$code" -ne 404 ]; then fail="ERROR"; icon="❌"; color="$RED"
    elif [ "$code" = "404" ]; then fail="MISSING"; icon="❓"; color="$YELLOW"
    elif echo "$body" | grep -qiE '"(error|message)"\s*:\s*"[^"]+"'; then fail="WARNING"; icon="⚠️"; color="$YELLOW"
    fi
  else
    fail="UNKNOWN"; icon="❓"; color="$YELLOW"
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

  echo -e "${color}${icon} [$code] ${method} $url (${desc})${NC}"
  [ -n "$fail" ] && echo -e "       ${color}↳ $fail${NC}"
  echo "[$fail] $method $url | $desc | $code | ${dur}ms" >> "$REPORT_TXT"
}

test_route_multi() {
  local route="$1" type="$2"
  if [ "$type" = "PAGE" ]; then
    test_one GET "$route" "" "Page"
  else
    test_one GET "$route" "" "API"
    local pd='{"test":"true"}'
    [[ "$route" == *"/subscribe" ]] && pd='{"plan_id":"'${PLANID:-000}'"}'
    [[ "$route" == *"/login" ]] && pd='{"email":"x@x.com","password":"x"}'
    test_one POST "$route" "$pd" "API"
    test_one PUT "$route" '{"test":"true"}' "API"
    test_one DELETE "$route" "" "API"
  fi
}

job_pool() {
  while [ "$(jobs -r | wc -l)" -ge $MAX_JOBS ]; do
    wait -n
  done
}

# ─── Main ───
main() {
  echo -e "${PURPLE}⚡ INFINITY GOD MODE SCANNER v5.3 (Auto-Port & Safe)${NC}"
  wait_server || exit 1

  echo -e "${CYAN}🔍 Fetching DB IDs...${NC}"
  node fetch-db-ids.mjs > db-ids.json 2>> "$ERROR_LOG"
  eval $(jq -r 'to_entries | .[] | "export \(.key)=\"\(.value)\""' db-ids.json)
  U="$userUid"; V="$vendorUid"; PID="$productId"; SLUG="$productSlug"
  OID="$orderId"; SID="$subscriptionId"; PLANID="$planId"
  POSTID="$postId"; COMMENTID="$commentId"; STORYID="$storyId"
  COUPONID="$couponId"; BOTID="$botId"; CRAWLERJOBID="$crawlerJobId"
  CONVID="$convId"

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
  local total=$(grep -c "|" "$REPORT_TXT" || echo 0)
  local crit=$(grep -c "CRITICAL" "$REPORT_TXT" || echo 0)
  local errs=$(grep -c "ERROR" "$REPORT_TXT" || echo 0)
  local miss=$(grep -c "MISSING" "$REPORT_TXT" || echo 0)
  local warns=$(grep -c "WARNING" "$REPORT_TXT" || echo 0)
  local slow=$(grep -c "SLOW" "$REPORT_TXT" || echo 0)
  local auth=$(grep -c "AUTH-REQUIRED" "$REPORT_TXT" || echo 0)

  echo ""
  echo -e "${PURPLE}══════════════════════════════════════════${NC}"
  echo -e "${PURPLE}  SCAN COMPLETE (${elapsed}s)${NC}"
  echo -e "${PURPLE}══════════════════════════════════════════${NC}"
  echo -e "Total: ${total}  💀${crit}  ❌${errs}  ❓${miss}  ⚠️${warns}  ⏱️${slow}  🔒${auth}"
  echo "JSON: $REPORT_JSON | TXT: $REPORT_TXT"

  # Telegram
  local telegram_msg="<b>⚡ Infinity God Mode Scan Complete ⚡</b>%0A"
  telegram_msg+="<b>Time:</b> ${elapsed}s | <b>URL:</b> ${BASE_URL}%0A"
  telegram_msg+="<b>Total Tests:</b> ${total}%0A"
  telegram_msg+="<b>💀 Critical:</b> ${crit}  <b>❌ Errors:</b> ${errs}  <b>❓ Missing:</b> ${miss}%0A"
  telegram_msg+="<b>⚠️ Warnings:</b> ${warns}  <b>⏱️ Slow:</b> ${slow}  <b>🔒 Auth:</b> ${auth}%0A"
  if [ "$crit" -gt 0 ] || [ "$errs" -gt 0 ]; then
    telegram_msg+="%0A<b>🚨 Top Issues:</b>%0A"
    grep -E "CRITICAL|ERROR" "$REPORT_TXT" | head -5 | while IFS= read -r l; do
      telegram_msg+="<code>${l}</code>%0A"
    done
  else
    telegram_msg+="%0A✅ No critical/error issues!%0A"
  fi

  if [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ]; then
    echo -e "${CYAN}📤 Sending to Telegram...${NC}"
    send_telegram "$telegram_msg"
  fi

  rm -rf "$TEMP_DIR" fetch-db-ids.mjs
}

main "$@"
