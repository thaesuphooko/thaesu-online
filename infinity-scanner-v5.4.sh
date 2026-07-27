#!/bin/bash
set -o pipefail
shopt -s extglob

BASE_URL="${BASE_URL:-http://localhost:3002}"
MAX_JOBS=5
TIMEOUT_SEC=10
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

# ─── Safe extraction of DATABASE_URL (avoid sourcing the whole file) ───
if [ -z "$DATABASE_URL" ] && [ -f .env.local ]; then
  DATABASE_URL=$(grep -E '^DATABASE_URL=' .env.local | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'")
fi

# ─── Telegram / Admin credentials (safe) ───
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

# ─── Auth token ───
AUTH_TOKEN=""
if [ -n "$ADMIN_EMAIL" ] && [ -n "$ADMIN_PASSWORD" ]; then
  echo -e "${CYAN}🔑 Obtaining auth token...${NC}"
  AUTH_TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" \
    | jq -r '.token // .access_token // empty')
  [ -n "$AUTH_TOKEN" ] && echo -e "${GREEN}✅ Auth token obtained.${NC}" || echo -e "${YELLOW}⚠️  No token.${NC}"
fi

# ─── DB ID Fetch via psql ───
echo -e "${CYAN}🔍 Fetching DB IDs via psql...${NC}"
USER_UID=$(psql "$DATABASE_URL" -tAc "SELECT uid FROM users WHERE role='user' LIMIT 1")
VENDOR_UID=$(psql "$DATABASE_URL" -tAc "SELECT uid FROM users WHERE vendor_status='active' LIMIT 1")
ADMIN_UID=$(psql "$DATABASE_URL" -tAc "SELECT uid FROM users WHERE role='admin' LIMIT 1")
PRODUCT_ID=$(psql "$DATABASE_URL" -tAc "SELECT id FROM products LIMIT 1")
PRODUCT_SLUG=$(psql "$DATABASE_URL" -tAc "SELECT slug FROM products LIMIT 1")
ORDER_ID=$(psql "$DATABASE_URL" -tAc "SELECT id FROM orders LIMIT 1")
SUBSCRIPTION_ID=$(psql "$DATABASE_URL" -tAc "SELECT id FROM user_subscriptions LIMIT 1")
PLAN_ID=$(psql "$DATABASE_URL" -tAc "SELECT id FROM subscription_plans LIMIT 1")
POST_ID=$(psql "$DATABASE_URL" -tAc "SELECT id FROM posts LIMIT 1")
COMMENT_ID=$(psql "$DATABASE_URL" -tAc "SELECT id FROM comments LIMIT 1")
STORY_ID=$(psql "$DATABASE_URL" -tAc "SELECT id FROM stories LIMIT 1")
COUPON_ID=$(psql "$DATABASE_URL" -tAc "SELECT id FROM coupons LIMIT 1")
BOT_ID=$(psql "$DATABASE_URL" -tAc "SELECT id FROM bots LIMIT 1")
CRAWLER_JOB_ID=$(psql "$DATABASE_URL" -tAc "SELECT id FROM crawler_jobs LIMIT 1")
CONV_ID=$(psql "$DATABASE_URL" -tAc "SELECT id FROM conversations LIMIT 1")

U="$USER_UID"; V="$VENDOR_UID"; PID="$PRODUCT_ID"; SLUG="$PRODUCT_SLUG"
OID="$ORDER_ID"; SID="$SUBSCRIPTION_ID"; PLANID="$PLAN_ID"
POSTID="$POST_ID"; COMMENTID="$COMMENT_ID"; STORYID="$STORY_ID"
COUPONID="$COUPON_ID"; BOTID="$BOT_ID"; CRAWLERJOBID="$CRAWLER_JOB_ID"
CONVID="$CONV_ID"

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

# ─── Server check ───
wait_server() {
  for ((i=1;i<=60;i++)); do
    curl -s -o /dev/null "$BASE_URL/" 2>/dev/null && echo -e "${GREEN}✅ Server ready at $BASE_URL${NC}" && return 0
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
  local pairs=("uid:$U" "vendorUid:$V" "productId:$PID" "slug:$SLUG" "orderId:$OID" "subscriptionId:$SID" "postId:$POSTID" "commentId:$COMMENTID" "storyId:$STORYID" "couponId:$COUPONID" "botId:$BOTID" "jobId:$CRAWLERJOBID" "convId:$CONVID" "id:$COUPONID")
  for pair in "${pairs[@]}"; do
    placeholder="${pair%%:*}"
    value="${pair#*:}"
    if [[ "$u" == *"[$placeholder]"* ]] || [[ "$u" == *"[...$placeholder]"* ]]; then
      [ -z "$value" ] && echo "SKIP" && return
      u=$(echo "$u" | sed "s|\[$placeholder\]|$value|g" | sed "s|\[...$placeholder\]|$value|g")
    fi
  done
  [[ "$u" == *"[...slug]"* ]] && u=$(echo "$u" | sed "s|\[...slug\]|test-slug|g")
  echo "$u"
}

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
  fi
  [ "$dur" -gt 3000 ] && fail="${fail:+$fail,}SLOW" && icon="⏱️" && color="$YELLOW"

  local json_entry=$(jq -n --arg method "$method" --arg url "$url" --arg desc "$desc" --arg code "$code" --arg dur "$dur" --arg fail "$fail" '{method: $method, url: $url, desc: $desc, code: $code, duration_ms: $dur, status: $fail}')
  { flock -x 200; local tmp_json=$(mktemp); jq ". + [${json_entry}]" "$REPORT_JSON" > "$tmp_json" && mv "$tmp_json" "$REPORT_JSON"; } 200>"$TEMP_DIR/lock"

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
  while [ "$(jobs -r | wc -l)" -ge $MAX_JOBS ]; do wait -n; done
}

main() {
  echo -e "${PURPLE}⚡ INFINITY GOD MODE SCANNER v5.4.1 (Shell-Safe)${NC}"
  wait_server || exit 1

  discover
  local total_pages=$(wc -l < "$ROUTES_FILE")
  local total_apis=$(wc -l < "$APIS_FILE")
  echo -e "${GREEN}📄 Found ${total_pages} pages + ${total_apis} API routes${NC}"

  echo -e "${CYAN}🌐 Scanning PAGES...${NC}"
  while IFS= read -r route; do
    test_route_multi "$(resolve_url "$route")" "PAGE" &
    job_pool
  done < "$ROUTES_FILE"

  echo -e "${CYAN}🌐 Scanning APIs...${NC}"
  while IFS= read -r api; do
    test_route_multi "$(resolve_url "$api")" "API" &
    job_pool
  done < "$APIS_FILE"

  wait
  END_TIME=$(date +%s)
  local elapsed=$((END_TIME - START_TIME))

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

  # Telegram summary
  local telegram_msg="<b>⚡ Scan Complete ⚡</b>%0A"
  telegram_msg+="<b>URL:</b> ${BASE_URL} | <b>Time:</b> ${elapsed}s%0A"
  telegram_msg+="<b>Total:</b> ${total}  💀${crit}  ❌${errs}  ❓${miss}  ⚠️${warns}  ⏱️${slow}  🔒${auth}%0A"
  if [ "$crit" -gt 0 ] || [ "$errs" -gt 0 ]; then
    telegram_msg+="%0A<b>🚨 Issues:</b>%0A"
    grep -E "CRITICAL|ERROR" "$REPORT_TXT" | head -5 | while IFS= read -r l; do telegram_msg+="<code>${l}</code>%0A"; done
  fi
  [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ] && send_telegram "$telegram_msg"

  rm -rf "$TEMP_DIR"
}

main "$@"
