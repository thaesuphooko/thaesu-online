#!/bin/bash
set -o pipefail; shopt -s extglob
BASE_URL="${BASE_URL}" ; MAX_JOBS="${MAX_JOBS:-3}" ; TIMEOUT_SEC="${TIMEOUT_SEC:-12}"
REPORT_JSON="infinity-report.json"; REPORT_TXT="infinity-report.txt"; ERROR_LOG="infinity-errors.log"
ROUTES_FILE="routes.txt"; APIS_FILE="apis.txt"; TEMP_DIR=$(mktemp -d)
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'
PURPLE='\033[0;35m'; CYAN='\033[0;36m'; WHITE='\033[1;37m'; NC='\033[0m'
> "$REPORT_TXT"; > "$ERROR_LOG"; echo "[]" > "$REPORT_JSON"
START_TIME=$(date +%s)

load_env_safe() {
  if [ -f .env.local ]; then
    while IFS='=' read -r key value; do
      [[ "$key" =~ ^# ]] && continue; [ -z "$key" ] && continue
      value=$(echo "$value" | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")
      case "$key" in DATABASE_URL|TELEGRAM_BOT_TOKEN|TELEGRAM_CHAT_ID|ADMIN_EMAIL|ADMIN_PASSWORD) export "$key"="$value" ;; esac
    done < .env.local
  fi
}
load_env_safe

if [ -z "$BASE_URL" ]; then
  for port in 3000 3001 3002; do
    if curl -s --max-time 2 "http://localhost:$port/" >/dev/null 2>&1; then BASE_URL="http://localhost:$port"; break; fi
  done
  [ -z "$BASE_URL" ] && BASE_URL="http://localhost:3000"
fi

AUTH_TOKEN=""
if [ -n "$ADMIN_EMAIL" ] && [ -n "$ADMIN_PASSWORD" ]; then
  echo -e "${CYAN}🔑 Obtaining auth token...${NC}"
  AUTH_TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/login" -H "Content-Type: application/json" -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" | jq -r '.token // .access_token // empty')
  [ -n "$AUTH_TOKEN" ] && echo -e "${GREEN}✅ Auth token obtained.${NC}" || echo -e "${YELLOW}⚠️  No token.${NC}"
fi

fetch_id() { psql "$DATABASE_URL" -tAc "$1" 2>/dev/null || echo ""; }
echo -e "${CYAN}🔍 Fetching DB IDs...${NC}"
U=$(fetch_id "SELECT uid FROM users WHERE role='user' LIMIT 1")
V=$(fetch_id "SELECT uid FROM users WHERE vendor_status='active' LIMIT 1")
ADMIN_UID=$(fetch_id "SELECT uid FROM users WHERE role='admin' LIMIT 1")
PID=$(fetch_id "SELECT id FROM products LIMIT 1")
SLUG=$(fetch_id "SELECT slug FROM products LIMIT 1")
OID=$(fetch_id "SELECT id FROM orders LIMIT 1")
SID=$(fetch_id "SELECT id FROM user_subscriptions LIMIT 1")
PLANID=$(fetch_id "SELECT id FROM subscription_plans LIMIT 1")
POSTID=$(fetch_id "SELECT id FROM posts LIMIT 1")
COMMENTID=$(fetch_id "SELECT id FROM comments LIMIT 1")
STORYID=$(fetch_id "SELECT id FROM stories LIMIT 1")
COUPONID=$(fetch_id "SELECT id FROM coupons LIMIT 1")
BOTID=$(fetch_id "SELECT id FROM bots LIMIT 1")
CRAWLERJOBID=$(fetch_id "SELECT id FROM crawler_jobs LIMIT 1")
CONVID=$(fetch_id "SELECT id FROM conversations LIMIT 1")

send_telegram() { if [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ]; then curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" -d chat_id="${TELEGRAM_CHAT_ID}" -d text="${1}" -d parse_mode="HTML" >/dev/null 2>&1; fi; }
wait_server() { for ((i=1;i<=30;i++)); do curl -s --max-time 2 "$BASE_URL/" >/dev/null 2>&1 && echo -e "${GREEN}✅ Server ready at $BASE_URL${NC}" && return 0; sleep 1; done; echo -e "${RED}❌ Server not ready${NC}"; return 1; }

discover() {
  find app -type f \( -name "page.*" -o -name "route.*" \) | while read f; do
    dir=$(dirname "$f"); route=${dir#app}; route=$(echo "$route" | sed -E 's/\/\([^)]*\)//g')
    [ -z "$route" ] && route="/"
    if [[ "$f" == *"/api/"* ]]; then api=${dir#app/api}; [ -z "$api" ] && api="/"; echo "/api$api" >> "$APIS_FILE"
    else echo "$route" >> "$ROUTES_FILE"; fi
  done
  echo -e "/auth/login\n/auth/register\n/dashboard\n/subscriptions\n/products\n/checkout\n/orders\n/admin/subscriptions" >> "$ROUTES_FILE"
  sort -u "$ROUTES_FILE" -o "$ROUTES_FILE"; sort -u "$APIS_FILE" -o "$APIS_FILE"
}

resolve_url() {
  local u="$1"
  local pairs=(
    '\[uid\]' "$U" '\[vendorUid\]' "$V" '\[productId\]' "$PID" '\[slug\]' "$SLUG" '\[...slug\]' "test-slug"
    '\[orderId\]' "$OID" '\[subscriptionId\]' "$SID" '\[postId\]' "$POSTID" '\[commentId\]' "$COMMENTID"
    '\[storyId\]' "$STORYID" '\[couponId\]' "$COUPONID" '\[botId\]' "$BOTID" '\[jobId\]' "$CRAWLERJOBID"
    '\[convId\]' "$CONVID" '\[id\]' "${COUPONID:-${PID:-}}"
  )
  for ((i=0; i<${#pairs[@]}; i+=2)); do
    local placeholder="${pairs[$i]}"; local value="${pairs[$i+1]}"
    if [[ "$u" == *"$placeholder"* ]]; then
      if [ -z "$value" ]; then echo "SKIP"; return; fi
      u=$(echo "$u" | sed "s|$placeholder|$value|g")
    fi
  done
  if [[ "$u" == *"["* ]]; then echo "SKIP"; return; fi
  echo "$u"
}

test_one() {
  local method="$1" url="$2" data="$3" desc="$4"
  [ "$url" = "SKIP" ] && return
  local tmp=$(mktemp) code="" dur body auth_header="" use_auth=false attempt=0 max_attempts=1
  if [[ "$desc" == API* ]] && [ -n "$AUTH_TOKEN" ]; then
    use_auth=true; auth_header="-H \"Authorization: Bearer ${AUTH_TOKEN}\""
  fi
  local start=$(date +%s%N)
  if [ "$method" = "POST" ]; then
    if $use_auth; then code=$(eval curl -s -w "%{http_code}" --max-time $TIMEOUT_SEC -X POST -H "Content-Type: application/json" $auth_header -d "'$data'" "$BASE_URL$url" -o "$tmp" 2>/dev/null)
    else code=$(curl -s -w "%{http_code}" --max-time $TIMEOUT_SEC -X POST -H "Content-Type: application/json" -d "$data" "$BASE_URL$url" -o "$tmp" 2>/dev/null); fi
  elif [ "$method" = "PUT" ]; then
    if $use_auth; then code=$(eval curl -s -w "%{http_code}" --max-time $TIMEOUT_SEC -X PUT -H "Content-Type: application/json" $auth_header -d "'$data'" "$BASE_URL$url" -o "$tmp" 2>/dev/null)
    else code=$(curl -s -w "%{http_code}" --max-time $TIMEOUT_SEC -X PUT -H "Content-Type: application/json" -d "$data" "$BASE_URL$url" -o "$tmp" 2>/dev/null); fi
  elif [ "$method" = "DELETE" ]; then
    if $use_auth; then code=$(eval curl -s -w "%{http_code}" --max-time $TIMEOUT_SEC -X DELETE $auth_header "$BASE_URL$url" -o "$tmp" 2>/dev/null)
    else code=$(curl -s -w "%{http_code}" --max-time $TIMEOUT_SEC -X DELETE "$BASE_URL$url" -o "$tmp" 2>/dev/null); fi
  else
    if $use_auth; then code=$(eval curl -s -w "%{http_code}" --max-time $TIMEOUT_SEC $auth_header "$BASE_URL$url" -o "$tmp" 2>/dev/null)
    else code=$(curl -s -w "%{http_code}" --max-time $TIMEOUT_SEC "$BASE_URL$url" -o "$tmp" 2>/dev/null); fi
  fi
  dur=$(( ($(date +%s%N) - start) / 1000000 )); body=$(cat "$tmp" 2>/dev/null); rm -f "$tmp"

  local fail="" icon="✅" color="$GREEN"
  if [ -z "$code" ] || [ "$code" = "000" ]; then fail="TIMEOUT"; icon="💀"; color="$RED"; code="000"
  elif [[ "$code" =~ ^[0-9]+$ ]]; then
    if [ "$code" -ge 500 ]; then
      if [ "$code" = "501" ]; then fail="NOT_IMPL"; icon="🧪"; color="$BLUE"   # 501 is planned feature
      else fail="CRITICAL"; icon="💀"; color="$RED"; fi
    elif [ "$code" = "429" ]; then fail="RATE_LIMITED"; icon="⚡"; color="$WHITE"  # 429 rate limit
    elif [ "$code" = "405" ]; then fail="METHOD_NA"; icon="⚙️"; color="$BLUE"
    elif [ "$code" = "400" ]; then fail="BAD_REQUEST"; icon="📝"; color="$YELLOW"
    elif [ "$code" = "401" ] || [ "$code" = "403" ]; then
      if $use_auth; then fail="AUTH_FAILED"; icon="🔒"; color="$YELLOW"
      else fail="AUTH_REQUIRED"; icon="🔒"; color="$YELLOW"; fi
    elif [ "$code" -ge 400 ] && [ "$code" -ne 404 ]; then fail="ERROR"; icon="❌"; color="$RED"
    elif [ "$code" = "404" ]; then fail="MISSING"; icon="❓"; color="$YELLOW"
    elif echo "$body" | grep -qiE '"(error|message)"\s*:\s*"[^"]+"'; then fail="WARNING"; icon="⚠️"; color="$YELLOW"
    fi
  fi
  if [[ "$dur" =~ ^[0-9]+$ ]] && [ "$dur" -gt 3000 ]; then fail="${fail:+$fail,}SLOW"; icon="⏱️"; color="$YELLOW"; fi

  local json_entry=$(jq -n --arg method "$method" --arg url "$url" --arg desc "$desc" --arg code "$code" --arg dur "$dur" --arg fail "$fail" '{method: $method, url: $url, desc: $desc, code: $code, duration_ms: $dur, status: $fail}')
  { flock -x 200; local tmp_json=$(mktemp); jq ". + [${json_entry}]" "$REPORT_JSON" > "$tmp_json" && mv "$tmp_json" "$REPORT_JSON"; } 200>"$TEMP_DIR/lock"
  echo -e "${color}${icon} [$code] ${method} $url (${desc})${NC}"
  [ -n "$fail" ] && echo -e "       ${color}↳ $fail${NC}"
  echo "[$fail] $method $url | $desc | $code | ${dur}ms" >> "$REPORT_TXT"
}

test_route_multi() {
  local route="$1" type="$2"
  if [ "$type" = "PAGE" ]; then test_one GET "$route" "" "Page"
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

job_pool() { while [ "$(jobs -r | wc -l)" -ge $MAX_JOBS ]; do wait -n; done; }

main() {
  echo -e "${PURPLE}⚡ INFINITY GOD MODE SCANNER v5.9 (Rate‑Limit Aware)${NC}"
  wait_server || exit 1
  discover
  local total_pages=$(wc -l < "$ROUTES_FILE"); local total_apis=$(wc -l < "$APIS_FILE")
  echo -e "${GREEN}📄 Found ${total_pages} pages + ${total_apis} API routes${NC}"
  echo -e "${CYAN}🌐 Scanning PAGES...${NC}"
  while IFS= read -r route; do test_route_multi "$(resolve_url "$route")" "PAGE" & job_pool; done < "$ROUTES_FILE"
  echo -e "${CYAN}🌐 Scanning APIs...${NC}"
  while IFS= read -r api; do test_route_multi "$(resolve_url "$api")" "API" & job_pool; done < "$APIS_FILE"
  wait
  END_TIME=$(date +%s); local elapsed=$((END_TIME - START_TIME))
  local total=$(grep -c "|" "$REPORT_TXT" || echo 0)
  local crit=$(grep -c "CRITICAL" "$REPORT_TXT" || echo 0)
  local errs=$(grep -c "ERROR" "$REPORT_TXT" || echo 0)
  local miss=$(grep -c "MISSING" "$REPORT_TXT" || echo 0)
  local warns=$(grep -c "WARNING" "$REPORT_TXT" || echo 0)
  local slow=$(grep -c "SLOW" "$REPORT_TXT" || echo 0)
  local auth=$(grep -c "AUTH_" "$REPORT_TXT" || echo 0)
  local methods=$(grep -c "METHOD_NA" "$REPORT_TXT" || echo 0)
  local badreq=$(grep -c "BAD_REQUEST" "$REPORT_TXT" || echo 0)
  local rate=$(grep -c "RATE_LIMITED" "$REPORT_TXT" || echo 0)
  local notimpl=$(grep -c "NOT_IMPL" "$REPORT_TXT" || echo 0)
  echo ""
  echo -e "${PURPLE}══════════════════════════════════════════${NC}"
  echo -e "${PURPLE}  SCAN COMPLETE (${elapsed}s)${NC}"
  echo -e "${PURPLE}══════════════════════════════════════════${NC}"
  echo -e "Total: ${total}  💀${crit}  ❌${errs}  ❓${miss}  ⚠️${warns}  ⏱️${slow}  🔒${auth}  ⚙️${methods}  📝${badreq}  ⚡${rate}  🧪${notimpl}"
  local telegram_msg="<b>⚡ Scan Complete v5.9 ⚡</b>%0A<b>URL:</b> ${BASE_URL} | <b>Time:</b> ${elapsed}s%0A<b>Total:</b> ${total}  💀${crit}  ❌${errs}  ❓${miss}  ⚠️${warns}  ⏱️${slow}  🔒${auth}  ⚙️${methods}  📝${badreq}  ⚡${rate}  🧪${notimpl}%0A"
  if [ "$crit" -gt 0 ] || [ "$errs" -gt 0 ]; then telegram_msg+="%0A<b>🚨 Real Issues:</b>%0A"; grep -E "CRITICAL|ERROR" "$REPORT_TXT" | head -5 | while IFS= read -r l; do telegram_msg+="<code>${l}</code>%0A"; done; fi
  [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ] && send_telegram "$telegram_msg"
  rm -rf "$TEMP_DIR"
}
main "$@"
