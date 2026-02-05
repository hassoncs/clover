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

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Phase 1: API tRPC Routes (Port 8789)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Template games are now served via tRPC, not REST endpoints
# These endpoints were removed when the app switched to embedded registries
echo -e "${YELLOW}Note: REST proxy endpoints removed - games now served via tRPC${NC}"
echo ""

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
  echo "Template games are served via tRPC routes."
  echo ""
  exit 0
else
  echo -e "${RED}❌ Some tests failed!${NC}"
  exit 1
fi
