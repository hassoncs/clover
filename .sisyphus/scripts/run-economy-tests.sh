#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"

FAILED=0
TOTAL_TESTS=0
TOTAL_PASSED=0
TOTAL_FAILED=0

divider() {
	printf '\n%s\n' "$(printf '=%.0s' {1..60})"
	echo "$1"
	printf '%s\n\n' "$(printf '=%.0s' {1..60})"
}

run_suite() {
	local name="$1"
	local dir="$2"
	local pattern="$3"

	divider "Suite: $name"

	local output
	local exit_code=0

	if [ -n "$pattern" ]; then
		output=$(cd "$dir" && npx vitest run --reporter=verbose "$pattern" 2>&1) || exit_code=$?
	else
		output=$(cd "$dir" && npx vitest run --reporter=verbose 2>&1) || exit_code=$?
	fi

	echo "$output"

	local tests passed failed
	tests=$(echo "$output" | grep -E '^\s+Tests\s' | grep -oE '[0-9]+ passed' | grep -oE '[0-9]+' || echo "0")
	passed="$tests"
	failed=$(echo "$output" | grep -E '^\s+Tests\s' | grep -oE '[0-9]+ failed' | grep -oE '[0-9]+' || echo "0")

	TOTAL_TESTS=$((TOTAL_TESTS + ${tests:-0}))
	TOTAL_PASSED=$((TOTAL_PASSED + ${passed:-0}))
	TOTAL_FAILED=$((TOTAL_FAILED + ${failed:-0}))

	if [ "$exit_code" -ne 0 ]; then
		echo "FAILED: $name (exit code $exit_code)"
		FAILED=1
	else
		echo "PASSED: $name"
	fi

	return 0
}

echo "Economy Test Runner"
echo "==================="
echo "Date: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
echo "Repo: $REPO_ROOT"
echo ""

# Suite 1: economy-engine package (schema, simulator, simulation-jobs, integration)
run_suite "economy-engine" "packages/economy-engine" ""

# Suite 2: API economy routes
run_suite "api-economy-graph" "api" "economy-graph"

# Suite 3: API economy generation
run_suite "api-economy-generation" "api" "economy-generation"

# Suite 4: App economy actions/conditions
run_suite "app-economy-actions" "app" "economy-actions"

# Suite 5: App economy runtime system
run_suite "app-economy-runtime" "app" "EconomyRuntimeSystem"

divider "SUMMARY"

echo "Total tests:  $TOTAL_TESTS"
echo "Passed:       $TOTAL_PASSED"
echo "Failed:       $TOTAL_FAILED"
echo ""

if [ "$FAILED" -ne 0 ]; then
	echo "RESULT: FAIL"
	exit 1
else
	echo "RESULT: PASS"
	exit 0
fi
