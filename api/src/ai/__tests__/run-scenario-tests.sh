#!/bin/bash
set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║       Scenario.com Test Runner                              ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
API_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"

if [ -z "$SCENARIO_API_KEY" ] || [ -z "$SCENARIO_SECRET_API_KEY" ]; then
    echo "⚠️  Scenario.com credentials not found in environment"
    echo ""
    echo "To run visual tests with real API calls:"
    echo ""
    echo "  Option 1 (using hush):"
    echo "    hush run -- npx tsx $SCRIPT_DIR/scenario-visual-test-runner.ts"
    echo ""
    echo "  Option 2 (manual):"
    echo "    export SCENARIO_API_KEY=your_key"
    echo "    export SCENARIO_SECRET_API_KEY=your_secret"
    echo "    npx tsx $SCRIPT_DIR/scenario-visual-test-runner.ts"
    echo ""
    echo "Running unit tests only..."
    echo ""
fi

echo "📋 Running Unit Tests"
echo "─────────────────────"
cd "$API_DIR"
pnpm test:run src/ai/__tests__/scenario-client.test.ts src/ai/__tests__/asset-service.test.ts

echo ""
echo "✅ Unit tests complete!"
echo ""

if [ -n "$SCENARIO_API_KEY" ] && [ -n "$SCENARIO_SECRET_API_KEY" ]; then
    echo "📸 Running Visual Tests (Real API)"
    echo "──────────────────────────────────"
    npx tsx "$SCRIPT_DIR/scenario-visual-test-runner.ts" "$@"
else
    echo "💡 To run visual tests with real images, set API credentials."
fi
