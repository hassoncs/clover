#!/bin/bash

# Submit job
echo "Submitting job..."
RESPONSE=$(curl -s -X POST "https://api.runpod.ai/v2/black-forest-labs-flux-1-dev/run" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $RUNPOD_API_KEY" \
  -d '{"input":{"prompt":"pixel art cat sprite, 16-bit style, game asset, white background","width":512,"height":512,"num_inference_steps":20}}')

echo "Response: $RESPONSE"

JOB_ID=$(echo $RESPONSE | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
echo "Job ID: $JOB_ID"

if [ -z "$JOB_ID" ]; then
  echo "Failed to get job ID"
  exit 1
fi

# Poll for completion
echo "Polling for completion..."
for i in {1..60}; do
  sleep 5
  STATUS=$(curl -s "https://api.runpod.ai/v2/black-forest-labs-flux-1-dev/status/$JOB_ID" \
    -H "Authorization: Bearer $RUNPOD_API_KEY")
  
  echo "[$i] $STATUS" | head -c 200
  echo ""
  
  if echo "$STATUS" | grep -q '"status":"COMPLETED"'; then
    echo ""
    echo "=== COMPLETED ==="
    echo "$STATUS" | python3 -m json.tool 2>/dev/null || echo "$STATUS"
    exit 0
  fi
  
  if echo "$STATUS" | grep -q '"status":"FAILED"'; then
    echo ""
    echo "=== FAILED ==="
    echo "$STATUS"
    exit 1
  fi
done

echo "Timeout waiting for job"
exit 1
