#!/bin/bash
set -e

cd "$(dirname "$0")/.."

if ! pnpm generate:registry:check 2>/dev/null; then
  echo "Registry files are stale. Regenerating..."
  pnpm generate:registry
  git add apps/slopcade/lib/registry/generated/
  echo "Registry files regenerated and staged."
fi

echo "Building type declarations..."
pnpm build:types

echo "Running TypeScript type check..."
(cd apps/slopcade && pnpm tsc --noEmit)
echo "TypeScript check passed."

echo "Linting GDScript..."
npx tsx scripts/lint-gdscript.ts
echo "GDScript lint passed."

pnpm hush check --only-changed
