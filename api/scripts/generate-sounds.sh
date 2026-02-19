#!/bin/bash
set -euo pipefail

API="http://localhost:8789/trpc/adminTools.generateSound"
AUTH="Authorization: Bearer dev-token"

declare -A SOUNDS
SOUNDS[slopcade-correct]="Bright arcade correct answer ding, cheerful and satisfying"
SOUNDS[slopcade-wrong]="Quick arcade wrong answer buzz, comical fail tone"
SOUNDS[slopcade-timer-tick]="Tense countdown tick clock sound, builds urgency"
SOUNDS[slopcade-round-end]="Arcade round complete jingle, short and triumphant"
SOUNDS[slopcade-game-over]="Retro game over fanfare, dramatic but fun"
SOUNDS[slopcade-join-ding]="Player joined lobby notification ding, welcoming chime"
SOUNDS[slopcade-vote-cast]="Quick vote cast confirmation click, satisfying tap"
SOUNDS[slopcade-reveal-whoosh]="Dramatic reveal whoosh sound, sweeping transition"
SOUNDS[slopcade-score-up]="Points going up counter sound, ascending cheerful tones"
SOUNDS[slopcade-countdown]="Three two one countdown beeps, building tension before start"

for name in "${!SOUNDS[@]}"; do
  desc="${SOUNDS[$name]}"
  echo "Generating $name..."
  result=$(curl -s --max-time 60 "$API" \
    -X POST \
    -H "$AUTH" \
    -H "Content-Type: application/json" \
    -d "{\"text\":\"$desc\",\"outputName\":\"$name\",\"durationSeconds\":2}")
  url=$(echo "$result" | python3 -c "import sys,json; print(json.load(sys.stdin)['result']['data']['url'])" 2>/dev/null || echo "ERROR")
  echo "  -> $url"
done

echo "=== ALL SOUNDS GENERATED ==="
