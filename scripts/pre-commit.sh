#!/bin/bash
set -e

cd "$(dirname "$0")/.."

echo "Linting GDScript..."
npx tsx scripts/lint-gdscript.ts
echo "GDScript lint passed."

echo "Checking Pencil route import boundary..."
npx tsx scripts/check-pencil-app-import-boundary.ts
echo "Pencil route import boundary passed."

pnpm hush check --only-changed
