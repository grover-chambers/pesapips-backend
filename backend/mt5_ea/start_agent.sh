#!/bin/bash
# Auto-login and start PesaPips agent with fresh token

SERVER="https://pesapips-backend.onrender.com"
EMAIL="brayanodira@gmail.com"
PASSWORD="!Nc0rr3k7."
USER_ID=2

echo "[PesaPips] Getting fresh token..."
TOKEN=$(curl -s -X POST "$SERVER/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

if [ -z "$TOKEN" ]; then
  echo "[PesaPips] Failed to get token. Check credentials."
  exit 1
fi

echo "[PesaPips] Token obtained. Starting agent..."
python3 /home/brayo/pesapips/mt5_ea/pesapips_agent.py \
  --token "$TOKEN" \
  --user-id "$USER_ID" \
  --server "$SERVER"
