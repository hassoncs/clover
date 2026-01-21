#!/bin/bash
set -e

cd "$(dirname "$0")/.."

if ! node app/scripts/generate-registry.mjs --check 2>/dev/null; then
  echo "Registry files are stale. Regenerating..."
  node app/scripts/generate-registry.mjs
  git add app/lib/registry/generated/
  echo "Registry files regenerated and staged."
fi

pnpm hush check --only-changed
