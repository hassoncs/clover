#!/bin/bash
set -euo pipefail

BRAND="${1:?Usage: $0 <brand>}"
API="http://localhost:8789/trpc/partyContent.generateContent"
AUTH="Authorization: Bearer dev-token"

BATCH_SIZE=30
GAME_TYPES=(quip fibbage dilemma wager headsup ranking drawing history trivia)

for gt in "${GAME_TYPES[@]}"; do
  echo "=== Generating $BRAND / $gt ==="
  while true; do
    result=$(curl -s --max-time 120 "$API" \
      -X POST \
      -H "$AUTH" \
      -H "Content-Type: application/json" \
      -d "{\"brandId\":\"$BRAND\",\"gameType\":\"$gt\",\"batchSize\":$BATCH_SIZE}" 2>&1)

    # Check for errors
    error=$(echo "$result" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('error',{}).get('message',''))" 2>/dev/null || echo "parse_error")
    if [ -n "$error" ] && [ "$error" != "" ]; then
      echo "  ERROR: $error"
      echo "  Retrying in 5s..."
      sleep 5
      continue
    fi

    # Parse result
    info=$(echo "$result" | python3 -c "
import sys, json
d = json.load(sys.stdin)['result']['data']
print(f\"inserted={d.get('inserted',0)} total={d.get('totalInserted',0)} remaining={d.get('remaining',0)} done={d['done']}\")
" 2>/dev/null || echo "parse_failed")
    echo "  $info"

    done_val=$(echo "$result" | python3 -c "import sys,json; print(json.load(sys.stdin)['result']['data']['done'])" 2>/dev/null || echo "false")
    if [ "$done_val" = "True" ] || [ "$done_val" = "true" ]; then
      echo "  DONE!"
      break
    fi

    sleep 2
  done
done

echo "=== ALL $BRAND GENERATION COMPLETE ==="
