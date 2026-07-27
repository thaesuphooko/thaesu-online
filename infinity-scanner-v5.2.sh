#!/bin/bash
set -o pipefail
shopt -s extglob

BASE_URL="${BASE_URL:-http://localhost:3000}"
MAX_WAIT=60
MAX_JOBS=15
TIMEOUT_SEC=3
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

# ─── Obtain JWT token if credentials exist ───
AUTH_TOKEN=""
if [ -n "$ADMIN_EMAIL" ] && [ -n "$ADMIN_PASSWORD" ]; then
  echo -e "${CYAN}🔑 Obtaining auth token...${NC}"
  AUTH_TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" \
    | jq -r '.token // .access_token // empty')
  [ -n "$AUTH_TOKEN" ] && echo -e "${GREEN}✅ Auth token obtained.${NC}" || echo -e "${YELLOW}⚠️  Could not obtain token.${NC}"
fi

# ─── DB ID Fetcher (extended) ───
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

# ─── Server wait ───
wait_server() {
  for ((i=1;i<=MAX_WAIT;i++)); do
    curl -s -o /dev/null "$BASE_URL/" 2>/dev/null && echo -e "${GREEN}✅ Server ready${NC}" && return 0
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

# ─── Resolve URL (Smart Skip) ───
resolve_url() {
  local u="$1"
  local pairs=(
    '\[uid\]' "$U"
    '\[vendorUid\]' "$V"
    '\[productId\]' "$PID"
    '\[slug\]' "$SLUG"
    '\[...slug\]' "test-slug"
    '\[orderId\]' "$OID"
    '\[subscriptionId\]' "$SID"
    '\[postId\]' "$POSTID"
    '\[commentId\]' "$COMMENTID"
    '\[storyId\]' "$STORYID"
    '\[couponId\]' "$COUPONID"
    '\[botId\]' "$BOTID"
    '\[jobId\]' "$CRAWLERJOBID"
    '\[convId\]' "$CONVID"
    '\[id\]' "$COUPONID"   # fallback for generic [id]
  )
  for ((i=0; i<${#pairs[@]}; i+=2)); do
    local placeholder="${pairs[$i]}"
    local value="${pairs[$i+1]}"
    if [[ "$u" == *"$placeholder"* ]]; then
      if [ -z "$value" ]; then
        echo "SKIP"
        return
      fi
      u=$(echo "$u" | sed "s|$placeholder|$value|g")
    fi
  done
  echo "$u"
}

# ─── Test a single URL (with retry) ───
test_one() {
  local method="$1" url="$2" data="$3" desc="$4"
  [ "$url" = "SKIP" ] && return
  local tmp=$(mktemp) code dur body auth_header="" use_auth=false attempt=0 max_attempts=2
  # Determine auth
  if [[ "$desc" == API* ]] && [ -n "$AUTH_TOKEN" ]; then
    use_auth=true
    auth_header="-H \"Authorization: Bearer ${AUTH_TOKEN}\""
  fi

  while [ $attempt -lt $max_attempts ]; do
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
    body=$(cat "$tmp" 2>/dev/null)
    if [ "$code" = "000" ] || [ "$code" -ge 500 ]; then
      attempt=$((attempt+1))
      sleep 1
      continue
    fi
    break
  done
  rm -f "$tmp"

  local fail="" icon="✅" color="$GREEN"
  if [ "$code" = "000" ] || [ -z "$code" ]; then
    fail="TIMEOUT"; icon="💀"; color="$RED"; code="000"
  elif [ "$code" -ge 500 ]; then fail="CRITICAL"; icon="💀"; color="$RED"
  elif [ "$code" = "401" ] || [ "$code" = "403" ]; then
    if $use_auth; then
      fail="AUTH-REQUIRED (got $code even with token)"; icon="🔒"; color="$YELLOW"
    else
      fail="AUTH-REQUIRED"; icon="🔒"; color="$YELLOW"
    fi
  elif [ "$code" -ge 400 ] && [ "$code" -ne 404 ]; then fail="ERROR"; icon="❌"; color="$RED"
  elif [ "$code" = "404" ]; then fail="MISSING"; icon="❓"; color="$YELLOW"
  elif echo "$body" | grep -qiE '"(error|message)"\s*:\s*"[^"]+"'; then fail="WARNING"; icon="⚠️"; color="$YELLOW"
  fi
  [ "$dur" -gt 3000 ] && fail="${fail:+$fail,}SLOW" && icon="⏱️" && color="$YELLOW"

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

# ─── Test route (multiple methods for APIs) ───
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
  echo -e "${PURPLE}⚡ INFINITY GOD MODE SCANNER v5.2 (Smart Skip)${NC}"
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

  # Summary stats
  local total=$(grep -c "|" "$REPORT_TXT" || echo 0)
  local crit=$(grep -c "CRITICAL" "$REPORT_TXT" || echo 0)
  local errs=$(grep -c "ERROR" "$REPORT_TXT" || echo 0)
  local miss=$(grep -c "MISSING" "$REPORT_TXT" || echo 0)
  local warns=$(grep -c "WARNING" "$REPORT_TXT" || echo 0)
  local slow=$(grep -c "SLOW" "$REPORT_TXT" || echo 0)
  local auth=$(grep -c "AUTH-REQUIRED" "$REPORT_TXT" || echo 0)

  # Terminal summary
  echo ""
  echo -e "${PURPLE}══════════════════════════════════════════${NC}"
  echo -e "${PURPLE}  SCAN COMPLETE (${elapsed}s)${NC}"
  echo -e "${PURPLE}══════════════════════════════════════════${NC}"
  echo -e "Total: ${total}  💀${crit}  ❌${errs}  ❓${miss}  ⚠️${warns}  ⏱️${slow}  🔒${auth}"
  echo "JSON: $REPORT_JSON | TXT: $REPORT_TXT"

  # Telegram message
  local real_issues=$((crit + errs + miss))
  local telegram_msg="<b>⚡ Infinity God Mode Scan Complete ⚡</b>%0A"
  telegram_msg+="<b>Time:</b> ${elapsed}s%0A"
  telegram_msg+="<b>Base URL:</b> ${BASE_URL}%0A"
  telegram_msg+="<b>Total Tests:</b> ${total}%0A"
  telegram_msg+="<b>💀 Critical:</b> ${crit}%0A"
  telegram_msg+="<b>❌ Errors:</b> ${errs}%0A"
  telegram_msg+="<b>❓ Missing:</b> ${miss}%0A"
  telegram_msg+="<b>⚠️ Warnings:</b> ${warns}%0A"
  telegram_msg+="<b>⏱️ Slow:</b> ${slow}%0A"
  telegram_msg+="<b>🔒 Auth-Required:</b> ${auth}%0A%0A"
  if [ "$real_issues" -gt 0 ]; then
    telegram_msg+="<b>🚨 Top Real Issues:</b>%0A"
    grep -E "CRITICAL|ERROR|MISSING" "$REPORT_TXT" | head -5 | while IFS= read -r line; do
      telegram_msg+="<code>${line}</code>%0A"
    done
  else
    telegram_msg+="✅ No critical/error/missing issues!%0A"
  fi

  if [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ]; then
    echo -e "${CYAN}📤 Sending report to Telegram...${NC}"
    send_telegram "$telegram_msg"
    echo -e "${GREEN}✅ Sent!${NC}"
  else
    echo -e "${YELLOW}⚠️  Telegram env not set. Skipping.${NC}"
  fi

  rm -rf "$TEMP_DIR" fetch-db-ids.mjs
}

main "$@"
