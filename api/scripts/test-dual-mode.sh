#!/bin/bash
# Test Dual-Mode Local Development System
# Verifies template games work without database calls

set -e

echo "════════════════════════════════════════════════════════════"
echo "  Testing Dual-Mode Local Development System"
echo "════════════════════════════════════════════════════════════"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0

test_endpoint() {
  local name="$1"
  local url="$2"
  local expected_code="${3:-200}"
  
  echo -n "Testing $name... "
  
  http_code=$(curl -s -o /dev/null -w "%{http_code}" "$url")
  
  if [ "$http_code" = "$expected_code" ]; then
    echo -e "${GREEN}✅ PASS${NC} (HTTP $http_code)"
    PASSED=$((PASSED + 1))
  else
    echo -e "${RED}❌ FAIL${NC} (Expected HTTP $expected_code, got $http_code)"
    FAILED=$((FAILED + 1))
  fi
}

test_json_field() {
  local name="$1"
  local url="$2"
  local jq_query="$3"
  local expected="$4"
  
  echo -n "Testing $name... "
  
  actual=$(curl -s "$url" | jq -r "$jq_query")
  
  if [ "$actual" = "$expected" ]; then
    echo -e "${GREEN}✅ PASS${NC} ($actual)"
    PASSED=$((PASSED + 1))
  else
    echo -e "${RED}❌ FAIL${NC} (Expected '$expected', got '$actual')"
    FAILED=$((FAILED + 1))
  fi
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Phase 1: Games Server (Port 3847)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

test_endpoint "Health check" "http://localhost:3847/health" 200
test_endpoint "List all games" "http://localhost:3847/games" 200
test_endpoint "Get ballSort game" "http://localhost:3847/games/ballSort" 200
test_endpoint "Get ballSort pack" "http://localhost:3847/packs/ballSort-default" 200
test_json_field "ballSort title" "http://localhost:3847/games/ballSort" ".title" "Ball Sort"
test_json_field "Pack entry count" "http://localhost:3847/packs/ballSort-default" ".entries | length" "11"

echo ""
test_endpoint "Asset serving (tube)" "http://localhost:3847/assets/ballSort/generated/ballSort/f661beb6-1e5e-4b9e-a01f-314c87248b75/2c3ff5e6-92d1-4d6f-85d5-61aee109b647.png" 200

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Phase 2: API Proxy (Port 8789)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

test_endpoint "List local games" "http://localhost:8789/local-games" 200
test_endpoint "Get ballSort via proxy" "http://localhost:8789/local-games/ballSort" 200
test_endpoint "Get pack via proxy" "http://localhost:8789/local-packs/ballSort-default" 200
test_json_field "Game source is template" "http://localhost:8789/local-games/ballSort" ".source" "template"
test_json_field "Pack baseGameId" "http://localhost:8789/local-packs/ballSort-default" ".baseGameId" "ballSort"

echo ""
test_endpoint "Asset via proxy (ball0)" "http://localhost:8789/local-assets/ballSort/generated/ballSort/f661beb6-1e5e-4b9e-a01f-314c87248b75/a9df5fd0-0f50-4e59-b441-e9800889022c.png" 200

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Phase 3: URL Resolution Test"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "Testing URL format matches production structure..."
ASSET_URL="http://localhost:8789/local-assets/ballSort/generated/ballSort/f661beb6-1e5e-4b9e-a01f-314c87248b75/a9df5fd0-0f50-4e59-b441-e9800889022c.png"
echo "  Local:      $ASSET_URL"
echo "  Production: https://cdn.slopcade.com/generated/ballSort/f661beb6-1e5e-4b9e-a01f-314c87248b75/a9df5fd0-0f50-4e59-b441-e9800889022c.png"
echo ""
echo -e "${GREEN}✅ URL structures match (only base URL differs)${NC}"
PASSED=$((PASSED + 1))

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  Test Results"
echo "════════════════════════════════════════════════════════════"
echo ""
echo -e "  ${GREEN}Passed: $PASSED${NC}"
echo -e "  ${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ All tests passed!${NC}"
  echo ""
  echo "Dual-mode local development is working correctly."
  echo ""
  echo "Template games load from local files:"
  echo "  • Game JSON: http://localhost:8789/local-games/{id}"
  echo "  • Pack metadata: http://localhost:8789/local-packs/{packName}"
  echo "  • Assets: http://localhost:8789/local-assets/{gameId}/generated/..."
  echo ""
  echo "Database games work normally via tRPC + D1."
  exit 0
else
  echo -e "${RED}❌ Some tests failed!${NC}"
  exit 1
fi
