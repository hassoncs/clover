#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"

TIMESTAMP=$(date -u '+%Y%m%d-%H%M%S')
EVIDENCE_DIR=".sisyphus/evidence/economy/$TIMESTAMP"
mkdir -p "$EVIDENCE_DIR"

echo "Evidence Capture: Economy Tests"
echo "==============================="
echo "Timestamp: $TIMESTAMP"
echo "Output:    $EVIDENCE_DIR/"
echo ""

TEST_EXIT=0
bash .sisyphus/scripts/run-economy-tests.sh > "$EVIDENCE_DIR/test-output.log" 2>&1 || TEST_EXIT=$?

echo "Test runner exit code: $TEST_EXIT"

cp .sisyphus/fixtures/economy/simple-economy.json "$EVIDENCE_DIR/"
cp .sisyphus/fixtures/economy/crafting-economy.json "$EVIDENCE_DIR/"
cp .sisyphus/fixtures/economy/gambling-economy.json "$EVIDENCE_DIR/"

cat > "$EVIDENCE_DIR/manifest.json" <<EOF
{
	"timestamp": "$TIMESTAMP",
	"testExitCode": $TEST_EXIT,
	"artifacts": [
		"test-output.log",
		"simple-economy.json",
		"crafting-economy.json",
		"gambling-economy.json"
	],
	"gitSha": "$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')",
	"gitBranch": "$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')"
}
EOF

echo ""
echo "Evidence captured:"
ls -la "$EVIDENCE_DIR/"

echo ""
if [ "$TEST_EXIT" -eq 0 ]; then
	echo "STATUS: ALL TESTS PASSED"
else
	echo "STATUS: TESTS FAILED (exit code $TEST_EXIT)"
	echo ""
	echo "Test output:"
	cat "$EVIDENCE_DIR/test-output.log"
fi

exit "$TEST_EXIT"
