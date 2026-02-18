#!/bin/bash
set -e

cd "$(dirname "$0")/.."

echo "Linting GDScript..."
npx tsx scripts/lint-gdscript.ts
echo "GDScript lint passed."

pnpm hush check --only-changed
