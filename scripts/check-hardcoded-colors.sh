#!/usr/bin/env bash
# Anti-regression guardrail: Detect hardcoded hex colors in UI files
#
# ALLOWED EXCEPTIONS:
# - packages/theme/ (token definitions may contain hex values)
# - *.test.* files (test fixtures may use hardcoded colors)
# - node_modules/ (third-party code)
# - lib/game-engine/ (game engine internals)
# - lib/godot/ (Godot integration)
# - Game definition files (*.game.json, game-definitions/)
#
# SCOPED PATHS (where hardcoded colors are NOT allowed):
# - app/components/
# - app/app/
# - apps/storybook/
# - landing/src/

set -euo pipefail

# Color patterns to detect:
# - #RGB (3-digit hex)
# - #RRGGBB (6-digit hex)
# - #RRGGBBAA (8-digit hex with alpha)
HEX_PATTERN='#[0-9a-fA-F]{3,8}\b'

# Paths to scan
SCAN_PATHS=(
  "app/components/"
  "app/app/"
  "apps/storybook/"
  "landing/src/"
)

# Exclusion patterns (grep -v)
EXCLUDE_PATTERNS=(
  "node_modules/"
  "packages/theme/"
  ".test."
  ".spec."
  "lib/game-engine/"
  "lib/godot/"
  ".game.json"
  "game-definitions/"
)

# Build exclusion grep filter
EXCLUDE_FILTER=""
for pattern in "${EXCLUDE_PATTERNS[@]}"; do
  EXCLUDE_FILTER="${EXCLUDE_FILTER} | grep -v '${pattern}'"
done

echo "🎨 Checking for hardcoded hex colors in UI files..."
echo ""

VIOLATIONS_FOUND=0

for path in "${SCAN_PATHS[@]}"; do
  if [ ! -d "$path" ]; then
    echo "⚠️  Skipping non-existent path: $path"
    continue
  fi
  
  echo "Scanning: $path"
  
  # Find all relevant files and grep for hex patterns
  # Exclude patterns are applied via grep -v chain
  RESULTS=$(find "$path" -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.jsx" -o -name "*.js" \) \
    | eval "grep -v 'node_modules/' ${EXCLUDE_FILTER}" \
    | xargs grep -nE "$HEX_PATTERN" 2>/dev/null || true)
  
  if [ -n "$RESULTS" ]; then
    echo "$RESULTS"
    VIOLATIONS_FOUND=1
  fi
done

echo ""

if [ $VIOLATIONS_FOUND -eq 1 ]; then
  echo "❌ Hardcoded hex colors detected!"
  echo ""
  echo "Please use theme tokens instead:"
  echo "  - colors.primary.DEFAULT"
  echo "  - colors.background"
  echo "  - colors.text.primary"
  echo ""
  echo "See packages/theme/ for available tokens."
  exit 1
else
  echo "✅ No hardcoded hex colors found in scoped UI paths."
  exit 0
fi
