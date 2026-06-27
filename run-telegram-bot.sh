#!/data/data/com.termux/files/usr/bin/bash
# Source .env.local to load all tokens
set -a
source ~/thaesu-online/.env.local
set +a
# Start polling
exec node ~/thaesu-online/lib/telegramPolling.js
